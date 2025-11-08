import sqlite3
import hashlib
import os

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def get_db_connection():
    # Connect to database in the backend directory
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'smartattend.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database with all required tables"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Students table - REMOVED department column
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            enrollment_no TEXT UNIQUE,
            course TEXT,
            semester INTEGER,
            phone TEXT,
            address TEXT,
            emergency_contact_name TEXT,
            emergency_contact_phone TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Teacher profiles table (replaces faculty table)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS teacher_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            faculty_id TEXT UNIQUE,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL,
            department TEXT,
            designation TEXT DEFAULT 'Assistant Professor',
            gender TEXT DEFAULT 'Male',
            contact TEXT,
            photo TEXT,
            linkedin TEXT,
            social_links TEXT,
            professional TEXT,
            headline TEXT,
            about_text TEXT,
            domain TEXT,  -- Added from faculty table
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Classes table (updated to reference teacher_profiles instead of faculty)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id INTEGER NOT NULL,
            class_name TEXT NOT NULL,
            subject_code TEXT,
            schedule TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (teacher_id) REFERENCES teacher_profiles (id)
        )
    ''')
    
    # Enrollment table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS enrollment (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            class_id INTEGER NOT NULL,
            subject TEXT NOT NULL,
            department TEXT NOT NULL,
            section TEXT,
            semester INTEGER,
            academic_year TEXT,
            enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students (id),
            FOREIGN KEY (class_id) REFERENCES classes (id),
            UNIQUE(student_id, class_id)
        )
    ''')
    
    # Attendance table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            class_id INTEGER NOT NULL,
            subject TEXT NOT NULL,
            department TEXT,
            attendance_date DATE NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('present', 'absent')),
            method TEXT,
            photo TEXT,
            marked_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students (id),
            FOREIGN KEY (class_id) REFERENCES classes (id),
            FOREIGN KEY (marked_by) REFERENCES users (id),
            UNIQUE(student_id, class_id, attendance_date)
        )
    ''')
    
    # Face encodings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS face_encodings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            face_encoding BLOB NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students (id)
        )
    ''')
    
    # ========== CLASS SCHEDULING TABLES ==========
    
    # Departments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Subjects table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            department_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES departments (id)
        )
    ''')
    
    # Class schedules table (updated to reference teacher_profiles)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS class_schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id INTEGER NOT NULL,
            department_id INTEGER NOT NULL,
            subject_id INTEGER NOT NULL,
            day_of_week TEXT NOT NULL CHECK(day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            room_number TEXT,
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (teacher_id) REFERENCES teacher_profiles (id),
            FOREIGN KEY (department_id) REFERENCES departments (id),
            FOREIGN KEY (subject_id) REFERENCES subjects (id),
            FOREIGN KEY (created_by) REFERENCES users (id)
        )
    ''')

    # Attendance requests table - UPDATED to link with students and teacher_profiles
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS attendance_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        teacher_id INTEGER NOT NULL,
        department TEXT NOT NULL,
        subject TEXT NOT NULL,
        request_date DATE NOT NULL,
        reason TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students (id),  -- Changed from users to students
        FOREIGN KEY (teacher_id) REFERENCES teacher_profiles (id)  -- Changed from users to teacher_profiles
    )
''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('class_scheduled', 'attendance_request', 'system', 'alert')),
        related_id INTEGER,  -- ID of related entity (schedule_id, request_id, etc.)
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
''')
    
    cursor.execute('PRAGMA table_info(attendance)')
    attendance_columns = [col[1] for col in cursor.fetchall()]
    if 'request_id' not in attendance_columns:
        cursor.execute('ALTER TABLE attendance ADD COLUMN request_id INTEGER')
        cursor.execute('ALTER TABLE attendance ADD COLUMN marked_via_request BOOLEAN DEFAULT FALSE')
    
    # ========== AUTOMATIC DATA TRANSFER: Users to Teacher Profiles ==========
    print("🔄 Checking for existing teachers without profiles...")
    
    # Find all teacher users who don't have corresponding teacher_profiles
    cursor.execute('''
        SELECT u.id, u.name, u.email, u.created_at 
        FROM users u 
        WHERE u.role = 'teacher' 
        AND NOT EXISTS (
            SELECT 1 FROM teacher_profiles tp WHERE tp.user_id = u.id
        )
    ''')
    teachers_without_profiles = cursor.fetchall()
    
    if teachers_without_profiles:
        print(f"📝 Creating teacher profiles for {len(teachers_without_profiles)} existing teacher(s)...")
        
        for teacher in teachers_without_profiles:
            teacher_id = teacher['id']
            teacher_name = teacher['name']
            teacher_email = teacher['email']
            
            # Generate faculty ID if not exists
            faculty_id = f"T{teacher_id:03d}"
            
            # Create teacher profile with data from users table
            cursor.execute('''
                INSERT INTO teacher_profiles 
                (user_id, faculty_id, full_name, email, department, designation, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                teacher_id, 
                faculty_id, 
                teacher_name, 
                teacher_email, 
                'Computer Science',  # Default department
                'Assistant Professor',  # Default designation
                teacher['created_at'],
                teacher['created_at']
            ))
            
            print(f"   ✅ Created profile for teacher: {teacher_name} ({teacher_email})")
    
    # Check if admin exists, if not create default admin
    cursor.execute('SELECT id FROM users WHERE role = "admin"')
    if not cursor.fetchone():
        # Create default admin
        admin_password = hash_password("admin123")
        cursor.execute(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            ("System Administrator", "admin@smartattend.com", admin_password, "admin")
        )
        print("✅ Default admin created: admin@smartattend.com / admin123")
    
    # Insert sample departments and subjects if they don't exist
    cursor.execute("SELECT COUNT(*) FROM departments")
    if cursor.fetchone()[0] == 0:
        print("📚 Inserting sample departments and subjects...")
        sample_departments = [
            ('Computer Science',),
            ('Mathematics',),
            ('Physics',),
            ('Chemistry',),
            ('Electrical Engineering',),
            ('Mechanical Engineering',),
            ('Civil Engineering',)
        ]
        cursor.executemany('INSERT INTO departments (name) VALUES (?)', sample_departments)
        
        # Insert sample subjects
        sample_subjects = [
            ('Data Structures', 1),
            ('Algorithms', 1),
            ('Database Systems', 1),
            ('Web Development', 1),
            ('Calculus', 2),
            ('Linear Algebra', 2),
            ('Differential Equations', 2),
            ('Quantum Mechanics', 3),
            ('Classical Mechanics', 3),
            ('Thermodynamics', 4),
            ('Organic Chemistry', 4),
            ('Circuit Analysis', 5),
            ('Digital Electronics', 5),
            ('Strength of Materials', 6),
            ('Fluid Mechanics', 7)
        ]
        cursor.executemany('INSERT INTO subjects (name, department_id) VALUES (?, ?)', sample_subjects)
        print("✅ Sample departments and subjects inserted")
    
    # ADD THIS SECTION: Create sample teacher, students, classes and enrollments
    cursor.execute("SELECT COUNT(*) FROM classes")
    if cursor.fetchone()[0] == 0:
        print("🎓 Creating sample teacher, students, classes and enrollments...")
        
        # Create a sample teacher user if not exists
        cursor.execute('SELECT id FROM users WHERE email = ?', ('teacher@smartattend.com',))
        teacher_user = cursor.fetchone()
        
        teacher_profile_id = None
        
        if not teacher_user:
            # Create teacher user
            teacher_password = hash_password("teacher123")
            cursor.execute(
                'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
                ("Sample Teacher", "teacher@smartattend.com", teacher_password, "teacher")
            )
            teacher_user_id = cursor.lastrowid
            
            # Teacher profile will be automatically created by the data transfer logic above
            # Get the teacher profile ID
            cursor.execute('SELECT id FROM teacher_profiles WHERE user_id = ?', (teacher_user_id,))
            teacher_profile = cursor.fetchone()
            if teacher_profile:
                teacher_profile_id = teacher_profile['id']
            
            print("✅ Sample teacher created: teacher@smartattend.com / teacher123")
        else:
            # Get existing teacher profile
            cursor.execute('SELECT id FROM teacher_profiles WHERE user_id = ?', (teacher_user['id'],))
            teacher_profile = cursor.fetchone()
            if teacher_profile:
                teacher_profile_id = teacher_profile['id']
        
        # Create sample students if not exists
        cursor.execute('SELECT COUNT(*) FROM students')
        student_count = cursor.fetchone()[0]
        
        if student_count == 0:
            sample_students = [
                ("Student One", "student1@smartattend.com", "S001", "BCA", 3, "1234567890"),
                ("Student Two", "student2@smartattend.com", "S002", "BCA", 3, "1234567891"),
                ("Student Three", "student3@smartattend.com", "S003", "BCA", 3, "1234567892"),
                ("Student Four", "student4@smartattend.com", "S004", "BCA", 3, "1234567893"),
                ("Student Five", "student5@smartattend.com", "S005", "BCA", 3, "1234567894"),
            ]
            
            student_ids = []
            for name, email, enrollment_no, course, semester, phone in sample_students:
                # Create student user
                student_password = hash_password("student123")
                cursor.execute(
                    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
                    (name, email, student_password, "student")
                )
                student_user_id = cursor.lastrowid
                
                # Create student profile
                cursor.execute(
                    'INSERT INTO students (user_id, enrollment_no, course, semester, phone) VALUES (?, ?, ?, ?, ?)',
                    (student_user_id, enrollment_no, course, semester, phone)
                )
                student_ids.append(cursor.lastrowid)
            
            print("✅ 5 sample students created with password: student123")
        
        # Create sample classes for the teacher if teacher exists
        if teacher_profile_id:
            # Create sample classes
            sample_classes = [
                (teacher_profile_id, 'BCA - Data Structures', 'CS201', 'Mon, Wed, Fri - 10:00 AM'),
                (teacher_profile_id, 'BCA - Database Systems', 'CS202', 'Tue, Thu - 2:00 PM'),
                (teacher_profile_id, 'Web Development', 'CS301', 'Mon, Wed - 11:00 AM')
            ]
            
            class_ids = []
            for class_data in sample_classes:
                cursor.execute(
                    'INSERT INTO classes (teacher_id, class_name, subject_code, schedule) VALUES (?, ?, ?, ?)',
                    class_data
                )
                class_ids.append(cursor.lastrowid)
            
            # Create sample class schedules
            sample_schedules = [
                (teacher_profile_id, 1, 1, 'Monday', '10:00', '11:00', 'Room 101', teacher_user_id if 'teacher_user_id' in locals() else 1),
                (teacher_profile_id, 1, 2, 'Wednesday', '10:00', '11:00', 'Room 101', teacher_user_id if 'teacher_user_id' in locals() else 1),
                (teacher_profile_id, 1, 3, 'Friday', '10:00', '11:00', 'Room 101', teacher_user_id if 'teacher_user_id' in locals() else 1),
                (teacher_profile_id, 1, 4, 'Tuesday', '14:00', '15:30', 'Lab 201', teacher_user_id if 'teacher_user_id' in locals() else 1),
                (teacher_profile_id, 1, 4, 'Thursday', '14:00', '15:30', 'Lab 201', teacher_user_id if 'teacher_user_id' in locals() else 1)
            ]
            
            for schedule in sample_schedules:
                cursor.execute(
                    'INSERT INTO class_schedules (teacher_id, department_id, subject_id, day_of_week, start_time, end_time, room_number, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    schedule
                )
            
            print("✅ 3 sample classes created and assigned to teacher")
            
            # Enroll students in classes if students exist
            cursor.execute('SELECT id FROM students LIMIT 5')
            students = cursor.fetchall()
            
            if students and class_ids:
                for student in students:
                    for class_id in class_ids:
                        cursor.execute(
                            'INSERT OR IGNORE INTO enrollment (student_id, class_id, subject, department, section, semester, academic_year) VALUES (?, ?, ?, ?, ?, ?, ?)',
                            (student['id'], class_id, 'Computer Science', 'Computer Science', 'A', 3, '2024-2025')
                        )
                
                print("✅ Students enrolled in all classes")
    
    conn.commit()
    conn.close()
    print("✅ Database initialized with all tables!")
    print("📍 Database file: smartattend.db")
    print("📊 Tables created:")
    print("   - users, students, teacher_profiles, classes, enrollment")
    print("   - attendance, face_encodings")
    print("   - departments, subjects, class_schedules")
    print("   - attendance_requests, notifications")
    print("\n🔑 Sample Login Credentials:")
    print("   - Admin: admin@smartattend.com / admin123")
    print("   - Teacher: teacher@smartattend.com / teacher123")
    print("   - Students: student1@smartattend.com / student123")
    print("               student2@smartattend.com / student123")
    print("               ... up to student5@smartattend.com")

if __name__ == "__main__":
    init_db()
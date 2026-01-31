import sqlite3
import os
import hashlib

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def get_db_connection():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'smartattend.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database with all tables (schema only, no default users/students)"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # ========== USERS ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin','teacher','student')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ''')

    # ========== STUDENTS ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            enrollment_no TEXT UNIQUE,
            course TEXT,
            semester INTEGER,
            phone TEXT,
            address TEXT,
            emergency_contact_name TEXT,
            emergency_contact_phone TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    ''')

    # ========== TEACHER PROFILES ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS teacher_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            faculty_id TEXT UNIQUE,
            designation TEXT DEFAULT 'Assistant Professor',
            department_id INTEGER,
            gender TEXT DEFAULT 'Male',
            contact TEXT,
            linkedin TEXT,
            social_links TEXT,
            professional TEXT,
            headline TEXT,
            about_text TEXT,
            domain TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(department_id) REFERENCES departments(id)
        );
    ''')

    # Ensure optional columns exist for backwards compatibility (safe migrations)
    try:
        cursor.execute("ALTER TABLE teacher_profiles ADD COLUMN photo TEXT")
    except Exception:
        # Column already exists or cannot be added - ignore
        pass

    # ========== CLASSES ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_name TEXT NOT NULL,
            teacher_id INTEGER NOT NULL,
            subject_id INTEGER NOT NULL,
            room TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(teacher_id) REFERENCES teacher_profiles(id),
            FOREIGN KEY(subject_id) REFERENCES subjects(id)
        );
    ''')

    # ========== ENROLLMENT ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS enrollment (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            class_id INTEGER NOT NULL,
            section TEXT,
            semester INTEGER,
            academic_year TEXT,
            subject_id INTEGER,
            enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(student_id) REFERENCES students(id),
            FOREIGN KEY(class_id) REFERENCES classes(id),
            FOREIGN KEY(subject_id) REFERENCES subjects(id),
            UNIQUE(student_id, class_id)
        );
    ''')

    # ========== ATTENDANCE ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            class_id INTEGER NOT NULL,
            attendance_date DATE NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('present','absent')),
            method TEXT,
            photo TEXT,
            marked_by INTEGER,
            request_id INTEGER,
            marked_via_request BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(student_id) REFERENCES students(id),
            FOREIGN KEY(class_id) REFERENCES classes(id),
            FOREIGN KEY(marked_by) REFERENCES users(id),
            FOREIGN KEY(request_id) REFERENCES attendance_requests(id)
        );
    ''')

    # ========== FACE ENCODINGS ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS face_encodings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            face_encoding BLOB NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(student_id) REFERENCES students(id)
        );
    ''')

    # ========== DEPARTMENTS ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ''')

    # ========== SUBJECTS ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            department_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(department_id) REFERENCES departments(id)
        );
    ''')

    # ========== CLASS SCHEDULES ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS class_schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id INTEGER,
            day_of_week TEXT NOT NULL CHECK(day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(class_id) REFERENCES classes(id),
            FOREIGN KEY(created_by) REFERENCES users(id)
        );
    ''')

    # ========== ATTENDANCE REQUESTS ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attendance_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            class_id INTEGER NOT NULL,
            reason TEXT,
            request_date DATE NOT NULL,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
            processed_by_user_id INTEGER,
            processed_by_role TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            responded_at TIMESTAMP,
            FOREIGN KEY(student_id) REFERENCES students(id),
            FOREIGN KEY(class_id) REFERENCES classes(id),
            FOREIGN KEY(processed_by_user_id) REFERENCES users(id)
        );
    ''')

    # ========== NOTIFICATIONS ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('class_scheduled','attendance_request','system','alert','contact_message','attendance_warning')),
            related_id INTEGER,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    ''')

    # ========== TEACHER SUBJECTS ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS teacher_subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id INTEGER NOT NULL,
            subject_id INTEGER NOT NULL,
            department_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(teacher_id) REFERENCES teacher_profiles(id),
            FOREIGN KEY(subject_id) REFERENCES subjects(id),
            FOREIGN KEY(department_id) REFERENCES departments(id),
            UNIQUE(teacher_id, subject_id)
        );
    ''')

    # ========== CONTACT MESSAGES ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS contact_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            status TEXT DEFAULT 'new',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ''')

    conn.commit()
    conn.close()
    print("Database schema created successfully (all tables included).")

if __name__ == "__main__":
    init_db()

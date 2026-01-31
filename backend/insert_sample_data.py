import sqlite3
import hashlib
import os
import random
from datetime import datetime, date

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def get_db_connection():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'smartattend.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def insert_sample_data():
    conn = get_db_connection()
    cursor = conn.cursor()

    # ========== ADMIN ==========
    cursor.execute('SELECT id FROM users WHERE role="admin"')
    if not cursor.fetchone():
        cursor.execute('''
            INSERT INTO users (name, email, password_hash, role)
            VALUES (?, ?, ?, ?)
        ''', ("System Administrator", "admin@smartattend.com", hash_password("admin123"), "admin"))
        print("Admin created: admin@smartattend.com / admin123")

    # ========== DEPARTMENTS ==========
    cursor.execute('SELECT COUNT(*) FROM departments')
    if cursor.fetchone()[0] == 0:
        departments = [
            ('Computer Science',), ('Mathematics',), ('Physics',),
            ('Chemistry',), ('Electrical Engineering',), ('Mechanical Engineering',),
            ('Civil Engineering',), ('Economics',)
        ]
        cursor.executemany('INSERT INTO departments (name) VALUES (?)', departments)
        print("Sample departments inserted")

    # ========== SUBJECTS ==========
    cursor.execute('SELECT COUNT(*) FROM subjects')
    if cursor.fetchone()[0] == 0:
        subjects = [
            ('Data Structures', 1), ('Algorithms', 1), ('Database Systems', 1),
            ('Web Development', 1), ('Advanced Data Structures', 1),
            ('SQL and Database Design', 1), ('Frontend Development', 1),
            ('Calculus', 2), ('Linear Algebra', 2), ('Differential Equations', 2),
            ('Quantum Mechanics', 3), ('Classical Mechanics', 3),
            ('Thermodynamics', 4), ('Organic Chemistry', 4),
            ('Circuit Analysis', 5), ('Digital Electronics', 5),
            ('Strength of Materials', 6), ('Fluid Mechanics', 7),
            ('Business Economics', 8)
        ]
        cursor.executemany('INSERT INTO subjects (name, department_id) VALUES (?, ?)', subjects)
        print("Sample subjects inserted")

    # ========== TEACHERS ==========
    teachers = [
        ("Teacher 1", "teacher@smartattend.com", "teacher123", "Computer Science"),
        ("Teacher 2", "teacher2@smartattend.com", "teacher123", "Economics"),
    ]
    teacher_profiles = []
    for name, email, password, department in teachers:
        cursor.execute('SELECT id FROM users WHERE email=?', (email,))
        if not cursor.fetchone():
            cursor.execute('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
                           (name, email, hash_password(password), "teacher"))
            user_id = cursor.lastrowid
            # Get department_id
            cursor.execute('SELECT id FROM departments WHERE name=?', (department,))
            dept_id = cursor.fetchone()['id']
            # Create teacher profile
            faculty_id = f"T{user_id:03d}"
            cursor.execute('''
                INSERT INTO teacher_profiles (user_id, faculty_id, designation, department_id)
                VALUES (?, ?, ?, ?)
            ''', (user_id, faculty_id, 'Assistant Professor', dept_id))
            teacher_profiles.append(cursor.lastrowid)
    print("Sample teachers inserted")

    # ========== STUDENTS ==========
    students = [
        ("Student One", "student1@smartattend.com", "student123", "BCA", 3, "1234567890"),
        ("Student Two", "student2@smartattend.com", "student123", "BCA", 3, "1234567891"),
        ("Student Three", "student3@smartattend.com", "student123", "BCA", 3, "1234567892"),
        ("Student Four", "student4@smartattend.com", "student123", "BCA", 3, "1234567893"),
        ("Student Five", "student5@smartattend.com", "student123", "BCA", 3, "1234567894"),
        ("Student Six", "student6@smartattend.com", "student123", "BBA", 2, "1234567895"),
    ]
    student_ids = []
    for name, email, password, course, semester, phone in students:
        cursor.execute('SELECT id FROM users WHERE email=?', (email,))
        if not cursor.fetchone():
            cursor.execute('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
                           (name, email, hash_password(password), "student"))
            user_id = cursor.lastrowid
            cursor.execute('INSERT INTO students (user_id, course, semester, phone) VALUES (?, ?, ?, ?)',
                           (user_id, course, semester, phone))
            student_ids.append(cursor.lastrowid)
    print("Sample students inserted")

    # ========== CLASSES ==========
    classes = [
        ("Database Systems", teacher_profiles[0], 3, "Room 101"),
        ("Data Structures", teacher_profiles[0], 1, "Room 101"),
        ("Business Economics", teacher_profiles[1], 19, "Room 102"),
    ]
    class_ids = []
    for name, teacher_id, subject_id, room in classes:
        cursor.execute('INSERT INTO classes (class_name, teacher_id, subject_id, room) VALUES (?, ?, ?, ?)',
                       (name, teacher_id, subject_id, room))
        class_ids.append(cursor.lastrowid)
    print("Sample classes inserted")

    # ========== TEACHER SUBJECTS ==========
    for teacher_id in teacher_profiles:
        for subject_id in [1,2,3]:
            try:
                cursor.execute('INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)', (teacher_id, subject_id))
            except:
                pass
    print("Sample teacher_subjects inserted")

    # ========== ENROLLMENT ==========
    enrollment = [
        (student_ids[0], class_ids[0]), (student_ids[1], class_ids[0]), (student_ids[2], class_ids[1]),
        (student_ids[3], class_ids[1]), (student_ids[4], class_ids[2]), (student_ids[5], class_ids[2]),
    ]
    for student_id, class_id in enrollment:
        try:
            cursor.execute('INSERT INTO enrollment (student_id, class_id) VALUES (?, ?)', (student_id, class_id))
        except:
            pass
    print("Sample enrollments inserted")

    # ========== CLASS SCHEDULES ==========
    schedules = [
        (class_ids[0], "Monday", "10:00", "11:00", teacher_profiles[0]),
        (class_ids[0], "Wednesday", "10:00", "11:00", teacher_profiles[0]),
        (class_ids[1], "Tuesday", "11:00", "12:00", teacher_profiles[0]),
        (class_ids[2], "Thursday", "14:00", "15:30", teacher_profiles[1]),
    ]
    for class_id, day, start, end, created_by in schedules:
        cursor.execute('INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time, created_by) VALUES (?, ?, ?, ?, ?)',
                       (class_id, day, start, end, created_by))
    print("Sample class_schedules inserted")

    # ========== ATTENDANCE REQUESTS ==========
    requests = [
        (student_ids[0], class_ids[0], "Medical leave", date.today(), "pending"),
        (student_ids[1], class_ids[1], "Family emergency", date.today(), "pending"),
    ]
    for student_id, class_id, reason, req_date, status in requests:
        cursor.execute('''
            INSERT INTO attendance_requests (student_id, class_id, reason, request_date, status)
            VALUES (?, ?, ?, ?, ?)
        ''', (student_id, class_id, reason, req_date, status))
    print("Sample attendance_requests inserted")

    # ========== NOTIFICATIONS ==========
    notifications = [
        (1, "Welcome", "Welcome to SmartAttend", "system"),
        (2, "New Class Assigned", "You have been assigned a new class.", "class_scheduled"),
    ]
    for user_id, title, message, type_ in notifications:
        cursor.execute('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
                       (user_id, title, message, type_))
    print("Sample notifications inserted")

    # ========== FACE ENCODINGS ==========
    for student_id in student_ids:
        cursor.execute('INSERT INTO face_encodings (student_id, face_encoding) VALUES (?, ?)',
                       (student_id, b'\x00\x01\x02'))  # dummy encoding
    print("Sample face_encodings inserted")

    # ========== CONTACT MESSAGES ==========
    messages = [
        ("John Doe", "john@example.com", "Inquiry about classes"),
        ("Jane Doe", "jane@example.com", "Issue with attendance"),
    ]
    for name, email, message in messages:
        cursor.execute('INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)',
                       (name, email, message))
    print("Sample contact_messages inserted")

    conn.commit()
    conn.close()
    print("✅ All sample data inserted successfully!")

if __name__ == "__main__":
    insert_sample_data()

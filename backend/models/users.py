import hashlib
from datetime import datetime, timedelta
from models.database import get_db_connection, hash_password

def admin_exists():
    """Check if an admin already exists"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM users WHERE role = "admin"')
    exists = cursor.fetchone() is not None
    conn.close()
    return exists

def create_user(name, email, password, role, course=None, department=None, domain=None):
    """Create a new user with role-specific profile"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Prevent multiple admins
        if role == 'admin' and admin_exists():
            raise Exception("Admin already exists. Only one admin is allowed.")
        
        # Create user account
        hashed_pwd = hash_password(password)
        cursor.execute(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            (name, email, hashed_pwd, role)
        )
        user_id = cursor.lastrowid
        
        print(f"Creating {role} profile for user_id: {user_id}")
        
        # Create role-specific profile
        if role == 'student':
            # Generate enrollment number and insert WITHOUT department
            enrollment_no = f"S{user_id:03d}"
            cursor.execute(
                'INSERT INTO students (user_id, enrollment_no, course, semester) VALUES (?, ?, ?, ?)',
                (user_id, enrollment_no, course or 'BCA', 1)  # NO DEPARTMENT!
            )
            print(f"Student profile created with enrollment: {enrollment_no}")
            
        elif role == 'teacher':
            # Generate faculty ID and insert into teacher_profiles (use department_id)
            faculty_id = f"T{user_id:03d}"

            # Resolve department: accept either department id or department name
            dept_id = None
            if department is not None:
                try:
                    # if department provided as integer (id)
                    dept_id = int(department)
                except Exception:
                    # attempt to find department by name
                    cursor.execute('SELECT id FROM departments WHERE name = ?', (department,))
                    _d = cursor.fetchone()
                    if _d:
                        dept_id = _d['id']
                    else:
                        # create department if it does not exist
                        cursor.execute('INSERT INTO departments (name) VALUES (?)', (department,))
                        dept_id = cursor.lastrowid

            cursor.execute(
                'INSERT INTO teacher_profiles (user_id, faculty_id, designation, department_id) VALUES (?, ?, ?, ?)',
                (user_id, faculty_id, 'Assistant Professor', dept_id)
            )
            print(f"Teacher profile created with faculty_id: {faculty_id}")
        
        conn.commit()
        return user_id
        
    except Exception as e:
        conn.rollback()
        print(f"Error in create_user: {str(e)}")
        raise e
    finally:
        conn.close()

def get_user_by_credentials(email, password, role):
    """Get user by email, password and role"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    hashed_pwd = hash_password(password)
    cursor.execute(
        'SELECT id, name, email, role FROM users WHERE email = ? AND password_hash = ? AND role = ?',
        (email, hashed_pwd, role)
    )
    user = cursor.fetchone()
    
    if user:
        user_data = dict(user)
        
        # Get additional profile data
        if role == 'student':
            cursor.execute('''
                SELECT s.enrollment_no, s.course, s.semester
                FROM students s WHERE s.user_id = ?
            ''', (user_data['id'],))
            student_data = cursor.fetchone()
            if student_data:
                user_data.update(dict(student_data))
        
        elif role == 'teacher':
            cursor.execute('''
                SELECT tp.faculty_id, tp.department_id, tp.designation, tp.contact
                FROM teacher_profiles tp WHERE tp.user_id = ?
            ''', (user_data['id'],))
            teacher_data = cursor.fetchone()
            if teacher_data:
                tdata = dict(teacher_data)
                # map department_id -> department name
                dept_id = tdata.get('department_id')
                if dept_id:
                    cursor.execute('SELECT name FROM departments WHERE id = ?', (dept_id,))
                    drow = cursor.fetchone()
                    tdata['department'] = drow['name'] if drow else None
                else:
                    tdata['department'] = None

                user_data.update(tdata)
        
        conn.close()
        return user_data
    
    conn.close()
    return None

def check_email_exists(email):
    """Check if email already exists"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
    exists = cursor.fetchone() is not None
    conn.close()
    return exists
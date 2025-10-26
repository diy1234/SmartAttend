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
        
        # Create role-specific profile
        if role == 'student':
            cursor.execute(
                'INSERT INTO students (user_id, course, department) VALUES (?, ?, ?)',
                (user_id, course, department)
            )
        elif role == 'teacher':
            cursor.execute(
                'INSERT INTO faculty (user_id, department, domain) VALUES (?, ?, ?)',
                (user_id, department, domain)
            )
        
        conn.commit()
        return user_id
        
    except Exception as e:
        conn.rollback()
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
                SELECT s.enrollment_no, s.course, s.department 
                FROM students s WHERE s.user_id = ?
            ''', (user_data['id'],))
            student_data = cursor.fetchone()
            if student_data:
                user_data.update(dict(student_data))
        
        elif role == 'teacher':
            cursor.execute('''
                SELECT f.department, f.domain 
                FROM faculty f WHERE f.user_id = ?
            ''', (user_data['id'],))
            faculty_data = cursor.fetchone()
            if faculty_data:
                user_data.update(dict(faculty_data))
        
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
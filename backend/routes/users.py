from flask import Blueprint, request, jsonify
from models.database import get_db_connection

users_bp = Blueprint('users', __name__)

@users_bp.route('/profile', methods=['GET'])
def get_profile():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'User ID required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # First get basic user info
    cursor.execute('''
        SELECT id, name, email, role, created_at
        FROM users 
        WHERE id = ?
    ''', (user_id,))
    
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        return jsonify({'error': 'User not found'}), 404
    
    profile_data = {
        'id': user['id'],
        'name': user['name'],
        'email': user['email'],
        'role': user['role'],
        'created_at': user['created_at']
    }
    
    # Get role-specific profile data
    if user['role'] == 'student':
        cursor.execute('''
            SELECT enrollment_no, course, semester, phone, address, 
                   emergency_contact_name, emergency_contact_phone
            FROM students 
            WHERE user_id = ?
        ''', (user_id,))
        student_profile = cursor.fetchone()
        if student_profile:
            profile_data.update({
                'enrollment_no': student_profile['enrollment_no'],
                'course': student_profile['course'],
                'semester': student_profile['semester'],
                'phone': student_profile['phone'],
                'address': student_profile['address'],
                'emergency_contact_name': student_profile['emergency_contact_name'],
                'emergency_contact_phone': student_profile['emergency_contact_phone']
            })
    
    elif user['role'] == 'teacher':
        cursor.execute('''
            SELECT tp.faculty_id, tp.designation, tp.gender,
                   tp.contact, tp.photo, tp.linkedin, tp.social_links, tp.professional,
                   tp.headline, tp.about_text, tp.domain, COALESCE(d.name, '') AS department
            FROM teacher_profiles tp
            LEFT JOIN departments d ON tp.department_id = d.id
            WHERE tp.user_id = ?
        ''', (user_id,))
        teacher_profile = cursor.fetchone()
        if teacher_profile:
            profile_data.update({
                'faculty_id': teacher_profile['faculty_id'],
                'full_name': teacher_profile['full_name'],
                'department': teacher_profile['department'],
                'designation': teacher_profile['designation'],
                'gender': teacher_profile['gender'],
                'contact': teacher_profile['contact'],
                'photo': teacher_profile['photo'],
                'linkedin': teacher_profile['linkedin'],
                'social_links': teacher_profile['social_links'],
                'professional': teacher_profile['professional'],
                'headline': teacher_profile['headline'],
                'about_text': teacher_profile['about_text'],
                'domain': teacher_profile['domain']
            })
    
    conn.close()
    return jsonify({'profile': profile_data})

@users_bp.route('/student-profile', methods=['GET'])
def get_student_profile():
    student_id = request.args.get('student_id')
    if not student_id:
        return jsonify({'error': 'Student ID required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT u.id, u.name, u.email, u.role, u.created_at,
               s.enrollment_no, s.course, s.semester,
               s.phone, s.address, s.emergency_contact_name, s.emergency_contact_phone
        FROM users u
        JOIN students s ON u.id = s.user_id
        WHERE u.id = ? AND u.role = 'student'
    ''', (student_id,))
    
    profile = cursor.fetchone()
    conn.close()
    
    if not profile:
        return jsonify({'error': 'Student not found'}), 404
    
    return jsonify({'profile': dict(profile)})

@users_bp.route('/teacher-profile', methods=['GET'])
def get_teacher_profile():
    teacher_id = request.args.get('teacher_id')
    if not teacher_id:
        return jsonify({'error': 'Teacher ID required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT u.id, u.name, u.email, u.role, u.created_at,
               tp.faculty_id, COALESCE(d.name,'') AS department, tp.designation, 
               tp.gender, tp.contact, tp.photo, tp.linkedin, tp.social_links,
               tp.professional, tp.headline, tp.about_text, tp.domain
        FROM users u
        JOIN teacher_profiles tp ON u.id = tp.user_id
        LEFT JOIN departments d ON tp.department_id = d.id
        WHERE u.id = ? AND u.role = 'teacher'
    ''', (teacher_id,))
    
    profile = cursor.fetchone()
    conn.close()
    
    if not profile:
        return jsonify({'error': 'Teacher not found'}), 404
    
    return jsonify({'profile': dict(profile)})

@users_bp.route('/update-profile', methods=['PUT'])
def update_profile():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # First get user role
        cursor.execute('SELECT role FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return jsonify({'error': 'User not found'}), 404
        
        role = user['role']
        
        # Update basic user info
        if 'name' in data or 'email' in data:
            update_fields = []
            update_values = []
            
            if 'name' in data:
                update_fields.append('name = ?')
                update_values.append(data['name'])
            
            if 'email' in data:
                update_fields.append('email = ?')
                update_values.append(data['email'])
            
            update_values.append(user_id)
            cursor.execute(
                f'UPDATE users SET {", ".join(update_fields)} WHERE id = ?',
                update_values
            )
        
        # Update role-specific profile
        if role == 'student':
            update_fields = []
            update_values = []
            
            student_fields = ['course', 'semester', 'phone', 'address', 
                            'emergency_contact_name', 'emergency_contact_phone']
            
            for field in student_fields:
                if field in data:
                    update_fields.append(f'{field} = ?')
                    update_values.append(data[field])
            
            if update_fields:
                update_values.append(user_id)
                cursor.execute(
                    f'UPDATE students SET {", ".join(update_fields)} WHERE user_id = ?',
                    update_values
                )
        
        elif role == 'teacher':
            # Handle 'full_name' -> users.name
            if 'full_name' in data:
                cursor.execute('UPDATE users SET name = ? WHERE id = ?', (data['full_name'], user_id))

            # Handle department: accept name or id
            if 'department' in data:
                dept = data['department']
                dept_id = None
                try:
                    dept_id = int(dept)
                except Exception:
                    # look up by name, create if missing
                    cursor.execute('SELECT id FROM departments WHERE name = ?', (dept,))
                    drow = cursor.fetchone()
                    if drow:
                        dept_id = drow['id']
                    else:
                        cursor.execute('INSERT INTO departments (name) VALUES (?)', (dept,))
                        dept_id = cursor.lastrowid

                cursor.execute('UPDATE teacher_profiles SET department_id = ? WHERE user_id = ?', (dept_id, user_id))

            # Update remaining teacher profile fields
            update_fields = []
            update_values = []
            
            teacher_fields = ['designation', 'gender', 'contact', 'linkedin', 'social_links', 'professional',
                            'headline', 'about_text', 'domain', 'photo']
            
            for field in teacher_fields:
                if field in data:
                    update_fields.append(f'{field} = ?')
                    update_values.append(data[field])
            
            if update_fields:
                update_values.append(user_id)
                cursor.execute(
                    f'UPDATE teacher_profiles SET {", ".join(update_fields)} WHERE user_id = ?',
                    update_values
                )
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Profile updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/all-students', methods=['GET'])
def get_all_students():
    """Get all students with their profiles"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT u.id, u.name, u.email, u.created_at,
               s.enrollment_no, s.course, s.semester, s.phone
        FROM users u
        JOIN students s ON u.id = s.user_id
        WHERE u.role = 'student'
        ORDER BY u.name
    ''')
    
    students = cursor.fetchall()
    conn.close()
    
    return jsonify({
        'students': [dict(student) for student in students]
    })

@users_bp.route('/all-teachers', methods=['GET'])
def get_all_teachers():
    """Get all teachers with their profiles"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT u.id, u.name, u.email, u.created_at,
               tp.faculty_id, COALESCE(d.name, '') AS department, tp.designation, tp.contact
        FROM users u
        JOIN teacher_profiles tp ON u.id = tp.user_id
        LEFT JOIN departments d ON tp.department_id = d.id
        WHERE u.role = 'teacher'
        ORDER BY u.name
    ''')
    
    teachers = cursor.fetchall()
    conn.close()
    
    return jsonify({
        'teachers': [dict(teacher) for teacher in teachers]
    })
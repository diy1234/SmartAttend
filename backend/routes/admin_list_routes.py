from flask import Blueprint, jsonify, request
from models.database import get_db_connection

admin_list_bp = Blueprint('admin_list_bp', __name__)

# ================================================================
# 1️⃣ GET ALL STUDENTS (NEW SCHEMA COMPATIBLE)
# ================================================================
@admin_list_bp.route('/students', methods=['GET'])
def get_students():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            s.id,
            u.name,
            u.email,
            s.enrollment_no,
            s.course,
            s.semester,
            s.phone,
            s.address,
            s.emergency_contact_name,
            s.emergency_contact_phone,
            s.created_at
        FROM students s
        JOIN users u ON s.user_id = u.id
        ORDER BY s.id ASC
    """)

    rows = cursor.fetchall()
    conn.close()

    students = []
    for r in rows:
        students.append({
            "id": r[0],
            "name": r[1],
            "email": r[2],
            "enrollment_no": r[3],
            "course": r[4],
            "semester": r[5],
            "phone": r[6],
            "address": r[7],
            "emergency_contact_name": r[8],
            "emergency_contact_phone": r[9],
            "created_at": r[10]
        })

    return jsonify(students)


# ================================================================
# 2️⃣ GET ALL TEACHERS (USING teacher_profiles)
# ================================================================
@admin_list_bp.route('/teachers', methods=['GET'])
def get_teachers():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            tp.id,
            tp.user_id,
            tp.full_name,
            tp.email,
            tp.department,
            tp.designation,
            tp.gender,
            tp.contact,
            tp.linkedin
        FROM teacher_profiles tp
        ORDER BY tp.id ASC
    """)

    rows = cursor.fetchall()
    conn.close()

    teachers = []
    for r in rows:
        teachers.append({
            "id": r[0],
            "user_id": r[1],
            "full_name": r[2],
            "email": r[3],
            "department": r[4],
            "designation": r[5],
            "gender": r[6],
            "contact": r[7],
            "linkedin": r[8]
        })

    return jsonify(teachers)


# ================================================================
# 3️⃣ GET ALL DEPARTMENTS
# ================================================================
@admin_list_bp.route('/departments', methods=['GET'])
def get_departments():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            d.id,
            d.name,
            d.created_at,
            COUNT(s.id) AS total_subjects
        FROM departments d
        LEFT JOIN subjects s ON s.department_id = d.id
        GROUP BY d.id
        ORDER BY d.name ASC
    """)

    rows = cursor.fetchall()

    departments = [
        {
            "id": r[0],
            "name": r[1],
            "created_at": r[2],
            "total_subjects": r[3]
        }
        for r in rows
    ]

    conn.close()
    return jsonify(departments)



# ================================================================
# 4️⃣ GET ALL COURSES (SUBJECTS)
# ================================================================
@admin_list_bp.route('/courses', methods=['GET'])
def get_courses():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT 
        s.id,
        s.name,
        COALESCE(d.name, 'Unknown') AS department,
        s.created_at
    FROM subjects s
    LEFT JOIN departments d ON s.department_id = d.id
    ORDER BY s.id ASC
""")


    rows = cursor.fetchall()
    conn.close()

    courses = []
    for r in rows:
        courses.append({
            "id": r[0],
            "name": r[1],
            "department": r[2],
            "created_at": r[3]
        })

    return jsonify(courses)


# ================================================================
# 5️⃣ UPDATE STUDENT
# ================================================================
@admin_list_bp.route('/students/<int:student_id>', methods=['PUT'])
def update_student(student_id):
    """Update student information"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    data = request.json
    
    try:
        # Get the user_id for this student
        cursor.execute("SELECT user_id FROM students WHERE id = ?", (student_id,))
        result = cursor.fetchone()
        if not result:
            conn.close()
            return jsonify({"error": "Student not found"}), 404
        
        user_id = result[0]
        
        # Update user info (name and email)
        cursor.execute("""
            UPDATE users 
            SET name = ?, email = ?
            WHERE id = ?
        """, (data.get('name'), data.get('email'), user_id))
        
        # Update student info
        cursor.execute("""
            UPDATE students 
            SET enrollment_no = ?, course = ?, semester = ?, phone = ?
            WHERE id = ?
        """, (
            data.get('enrollment_no'),
            data.get('course'),
            data.get('semester'),
            data.get('phone'),
            student_id
        ))
        
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Student updated successfully"})
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400


# ================================================================
# 6️⃣ DELETE STUDENT
# ================================================================
@admin_list_bp.route('/students/<int:student_id>', methods=['DELETE'])
def delete_student(student_id):
    """Delete a student"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get user_id first
        cursor.execute("SELECT user_id FROM students WHERE id = ?", (student_id,))
        result = cursor.fetchone()
        if not result:
            conn.close()
            return jsonify({"error": "Student not found"}), 404
        
        user_id = result[0]
        
        # Delete student record
        cursor.execute("DELETE FROM students WHERE id = ?", (student_id,))
        
        # Delete user record
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Student deleted successfully"})
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400


# ================================================================
# 7️⃣ UPDATE TEACHER
# ================================================================
@admin_list_bp.route('/teachers/<int:teacher_id>', methods=['PUT'])
def update_teacher(teacher_id):
    """Update teacher information"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    data = request.json
    
    try:
        cursor.execute("""
            UPDATE teacher_profiles 
            SET full_name = ?, email = ?, department = ?, designation = ?, contact = ?
            WHERE id = ?
        """, (
            data.get('full_name'),
            data.get('email'),
            data.get('department'),
            data.get('designation'),
            data.get('contact'),
            teacher_id
        ))
        
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Teacher updated successfully"})
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400


# ================================================================
# 8️⃣ DELETE TEACHER
# ================================================================
@admin_list_bp.route('/teachers/<int:teacher_id>', methods=['DELETE'])
def delete_teacher(teacher_id):
    """Delete a teacher"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get user_id first
        cursor.execute("SELECT user_id FROM teacher_profiles WHERE id = ?", (teacher_id,))
        result = cursor.fetchone()
        if not result:
            conn.close()
            return jsonify({"error": "Teacher not found"}), 404
        
        user_id = result[0]
        
        # Delete teacher profile
        cursor.execute("DELETE FROM teacher_profiles WHERE id = ?", (teacher_id,))
        
        # Delete user record
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Teacher deleted successfully"})
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400


# ================================================================
# 9️⃣ UPDATE DEPARTMENT
# ================================================================
@admin_list_bp.route('/departments/<int:department_id>', methods=['PUT'])
def update_department(department_id):
    """Update department information"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    data = request.json
    
    try:
        cursor.execute("""
            UPDATE departments 
            SET name = ?
            WHERE id = ?
        """, (data.get('name'), department_id))
        
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Department updated successfully"})
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400


# ================================================================
# 🔟 DELETE DEPARTMENT
# ================================================================
@admin_list_bp.route('/departments/<int:department_id>', methods=['DELETE'])
def delete_department(department_id):
    """Delete a department"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM departments WHERE id = ?", (department_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Department deleted successfully"})
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400


# ================================================================
# 1️⃣1️⃣ UPDATE COURSE (SUBJECT)
# ================================================================
@admin_list_bp.route('/courses/<int:course_id>', methods=['PUT'])
def update_course(course_id):
    """Update course/subject information"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    data = request.json
    
    try:
        # Get the department_id by name
        cursor.execute("SELECT id FROM departments WHERE name = ?", (data.get('department'),))
        dept_result = cursor.fetchone()
        dept_id = dept_result[0] if dept_result else None
        
        # Update the subject
        cursor.execute("""
            UPDATE subjects 
            SET name = ?, department_id = ?
            WHERE id = ?
        """, (data.get('name'), dept_id, course_id))
        
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Course updated successfully"})
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400
        
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Course updated successfully"})
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400


# ================================================================
# 1️⃣2️⃣ DELETE COURSE (SUBJECT)
# ================================================================
@admin_list_bp.route('/courses/<int:course_id>', methods=['DELETE'])
def delete_course(course_id):
    """Delete a course/subject"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM subjects WHERE id = ?", (course_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Course deleted successfully"})
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400


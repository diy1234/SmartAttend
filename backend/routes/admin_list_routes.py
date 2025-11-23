from flask import Blueprint, jsonify
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

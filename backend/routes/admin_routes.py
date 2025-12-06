from flask import Blueprint, jsonify, request
from models.database import get_db_connection

admin_bp = Blueprint('admin_bp', __name__)

# ==========================================================
# 1️⃣ ADMIN DASHBOARD STATS
# ==========================================================
@admin_bp.route('/admin/stats', methods=['GET'])
def admin_stats():
    """
    Returns overall statistics for the Admin Dashboard.
    Includes total students, teachers, departments, courses, and average attendance.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Total students
    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'student'")
    total_students = cursor.fetchone()[0]

    # Total teachers (based on teacher_profiles)
    cursor.execute("SELECT COUNT(*) FROM teacher_profiles")
    total_teachers = cursor.fetchone()[0]

    # Total departments
    cursor.execute("SELECT COUNT(*) FROM departments")
    total_departments = cursor.fetchone()[0]

    # Total courses / subjects
    cursor.execute("SELECT COUNT(*) FROM subjects")
    total_courses = cursor.fetchone()[0]

    # Average attendance (from attendance table)
    cursor.execute("""
        SELECT ROUND(
            (SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) * 100.0) / COUNT(*),
            1
        )
        FROM attendance
    """)
    avg_attendance = cursor.fetchone()[0] or 0

    conn.close()
    return jsonify({
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_departments": total_departments,
        "total_courses": total_courses,
        "avg_attendance": avg_attendance
    })

# ==========================================================
# 2️⃣ DEPARTMENT ATTENDANCE ANALYSIS
# ==========================================================
@admin_bp.route('/admin/department-attendance', methods=['GET'])
def department_attendance():
    """
    Returns average attendance percentage grouped by department.
    Now uses the `department` field from the attendance table directly.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            COALESCE(department, 'Unassigned') AS department,
            ROUND(AVG(CASE WHEN status = 'present' THEN 100.0 ELSE 0 END), 1) AS percent
        FROM attendance
        GROUP BY department
        HAVING COUNT(*) > 0
    """)

    data = [{"department": dept, "percent": percent} for dept, percent in cursor.fetchall()]
    conn.close()
    return jsonify(data)

# ==========================================================
# 3️⃣ ATTENDANCE DISTRIBUTION (ABOVE/BELOW 75%)
# ==========================================================
@admin_bp.route('/admin/attendance-distribution', methods=['GET'])
def attendance_distribution():
    """
    Returns the percentage of students above and below 75% attendance.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Compute per-student attendance percentage
    cursor.execute("""
        SELECT 
            s.id,
            ROUND(
                (SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0) / COUNT(*),
                1
            ) AS attendance_percent
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        GROUP BY s.id
    """)
    student_attendance = cursor.fetchall()

    if not student_attendance:
        return jsonify({"above_75": 0, "below_75": 0})

    total_students = len(student_attendance)
    above_75 = sum(1 for _, percent in student_attendance if percent >= 75)
    below_75 = total_students - above_75

    conn.close()
    return jsonify({
        "above_75": round((above_75 / total_students) * 100, 1),
        "below_75": round((below_75 / total_students) * 100, 1)
    })

# ==========================================================
# 4️⃣ ACTIVE DEPARTMENTS LIST WITH COURSE COUNT
# ==========================================================
@admin_bp.route('/admin/active-departments', methods=['GET'])
def active_departments():
    """
    Returns list of departments and number of subjects in each.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            d.name AS department,
            COUNT(s.id) AS total_subjects
        FROM departments d
        LEFT JOIN subjects s ON d.id = s.department_id
        GROUP BY d.id
        ORDER BY d.name ASC
    """)

    rows = cursor.fetchall()
    conn.close()
    return jsonify([{"department": r[0], "total_subjects": r[1]} for r in rows])

# ==========================================================
# 5️⃣ TEST ENDPOINT TO VERIFY ADMIN ROUTES
# ==========================================================
@admin_bp.route('/admin/ping', methods=['GET'])
def ping():
    """Health check for admin routes"""
    return jsonify({"status": "Admin routes working ✅"})

# ==========================================================
# 6️⃣ GET STUDENTS FOR A SUBJECT (ALWAYS RETURNS MATCHING)
# ==========================================================
@admin_bp.route('/admin/subject-students', methods=['GET'])
def subject_students():
    dept = request.args.get("dept")
    subject = request.args.get("subject")

    if not dept or not subject:
        return jsonify({"error": "dept and subject are required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    # Filter students by department AND subject (case-insensitive matching on enrollment table)
    cur.execute("""
        SELECT DISTINCT
            u.name AS student_name,
            u.email,
            s.enrollment_no,
            s.course,
            s.semester,
            s.id AS student_id
        FROM students s
        JOIN users u ON s.user_id = u.id
        INNER JOIN enrollment e ON e.student_id = s.id
        WHERE 
            LOWER(e.department) = LOWER(?)
            AND LOWER(e.subject) = LOWER(?)
        ORDER BY u.name ASC
    """, (dept, subject))

    rows = cur.fetchall()

    students = [dict(r) for r in rows]

    conn.close()

    return jsonify({"students": students})


# --------------------------------------------------------
# 📊 ADMIN — OVERALL ATTENDANCE SUMMARY
# --------------------------------------------------------
@admin_bp.route('/admin/attendance/summary', methods=['GET'])
def attendance_summary():
    conn = get_db_connection()
    cur = conn.cursor()

    # 1️⃣ Summary by Department
    cur.execute("""
        SELECT 
            COALESCE(department, 'Unassigned') AS department,
            COUNT(*) AS total_classes,
            SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) AS present_classes,
            SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) AS absent_classes
        FROM attendance
        GROUP BY department
    """)
    dept_rows = [dict(r) for r in cur.fetchall()]

    # 2️⃣ Summary by Subject
    cur.execute("""
        SELECT 
            COALESCE(subject, 'Unassigned') AS subject,
            COUNT(*) AS total_classes,
            SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) AS present_classes,
            SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) AS absent_classes
        FROM attendance
        GROUP BY subject
    """)
    subject_rows = [dict(r) for r in cur.fetchall()]

    # 3️⃣ Summary by Student
    cur.execute("""
        SELECT 
            u.name AS student_name,
            s.enrollment_no,
            COUNT(*) AS total_classes,
            SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) AS present_classes,
            SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) AS absent_classes
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        JOIN users u ON s.user_id = u.id
        GROUP BY s.id
        ORDER BY u.name ASC
    """)
    student_rows = [dict(r) for r in cur.fetchall()]

    conn.close()

    return jsonify({
        "by_department": dept_rows,
        "by_subject": subject_rows,
        "by_student": student_rows
    })


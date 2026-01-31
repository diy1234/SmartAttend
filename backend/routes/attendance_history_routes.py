# attendance_history_routes.py (updated)
from flask import Blueprint, jsonify, request
from models.database import get_db_connection

attendance_history_bp = Blueprint('attendance_history_bp', __name__)

# Existing attendance history route (attendance logs) left as-is if needed
# ------------------------------------------------------------
# NEW: processed attendance-requests route
@attendance_history_bp.route('/api/attendance-requests/processed', methods=['GET'])
def get_processed_attendance_requests():
    """
    Return processed attendance correction requests (approved/rejected).
    Query params:
      - role = admin | teacher | student
      - user_id (for students) -> user.id (users table)
    Behavior:
      - admin & teacher -> return all processed requests (status != 'pending')
      - student with user_id -> return requests where students.user_id = user_id
    """
    role = request.args.get('role', 'student')
    user_id = request.args.get('user_id')  # this is users.id when role=student

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        base_sql = """
            SELECT
                ar.id,
                ar.student_id,
                stu.user_id AS student_user_id,
                stu.enrollment_no,
                su.name AS student_name,
                su.email AS student_email,
                c.teacher_id,
                tu.name AS teacher_name,
                COALESCE(subj.name, c.class_name) AS subject,
                COALESCE(d.name, '') AS department,
                ar.request_date,
                ar.reason,
                ar.status,
                ar.created_at,
                ar.responded_at,
                ar.processed_by_role,
                ar.processed_by_user_id,
                proc_u.name AS processed_by_name,
                proc_u.email AS processed_by_email
            FROM attendance_requests ar
            JOIN students stu ON ar.student_id = stu.id
            LEFT JOIN users su ON stu.user_id = su.id
            LEFT JOIN classes c ON ar.class_id = c.id
            LEFT JOIN teacher_profiles tp ON c.teacher_id = tp.id
            LEFT JOIN users tu ON tp.user_id = tu.id
            LEFT JOIN subjects subj ON c.subject_id = subj.id
            LEFT JOIN departments d ON subj.department_id = d.id
            LEFT JOIN users proc_u ON ar.processed_by_user_id = proc_u.id
            WHERE ar.status != 'pending'
        """

        params = []

        if role == 'student':
            if not user_id:
                return jsonify({'error': 'user_id is required for student role'}), 400
            # return only requests where student's user_id matches
            base_sql += " AND stu.user_id = ?"
            params.append(user_id)
        else:
            # role==admin or teacher (per your T2 choice teacher sees all)
            # no extra filter (admins and teachers see all processed requests)
            pass

        base_sql += " ORDER BY ar.responded_at DESC"

        cursor.execute(base_sql, params)
        rows = cursor.fetchall()
        results = [dict(r) for r in rows]

        # Transform processed_by_role values for frontend convenience if necessary
        for r in results:
            # processed_by_name may be null; keep it as None or empty string
            if r.get('processed_by_name') is None and r.get('processed_by_user_id'):
                r['processed_by_name'] = ''
        conn.close()
        return jsonify(results)
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500
    
@attendance_history_bp.route('/api/admin/attendance/summary', methods=['GET'])
def get_attendance_summary():
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # -------------------------
        # BY DEPARTMENT
        # -------------------------
        cursor.execute("""
            SELECT
                COALESCE(d.name, 'Unknown') AS department,
                COUNT(a.id) AS total_classes,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_classes,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent_classes
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            JOIN users u ON s.user_id = u.id
            LEFT JOIN classes c ON a.class_id = c.id
            LEFT JOIN subjects sub ON c.subject_id = sub.id
            LEFT JOIN departments d ON sub.department_id = d.id
            GROUP BY d.name
            ORDER BY d.name
        """)
        by_department = [dict(r) for r in cursor.fetchall()]

        # -------------------------
        # BY SUBJECT
        # -------------------------
        cursor.execute("""
            SELECT
                COALESCE(sub.name, 'Unknown') AS subject,
                COUNT(a.id) AS total_classes,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_classes,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent_classes
            FROM attendance a
            JOIN classes c ON a.class_id = c.id
            LEFT JOIN subjects sub ON c.subject_id = sub.id
            GROUP BY sub.name
            ORDER BY sub.name
        """)
        by_subject = [dict(r) for r in cursor.fetchall()]

        # -------------------------
        # BY STUDENT
        # -------------------------
        cursor.execute("""
            SELECT
                u.name AS student_name,
                s.enrollment_no,
                COUNT(a.id) AS total_classes,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_classes,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent_classes
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            JOIN users u ON s.user_id = u.id
            GROUP BY s.id
            ORDER BY u.name
        """)
        by_student = [dict(r) for r in cursor.fetchall()]

        return jsonify({
            "by_department": by_department,
            "by_subject": by_subject,
            "by_student": by_student
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


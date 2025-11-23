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
                ar.teacher_id,
                tp.full_name AS teacher_name,
                ar.department,
                ar.subject,
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
            LEFT JOIN teacher_profiles tp ON ar.teacher_id = tp.id
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

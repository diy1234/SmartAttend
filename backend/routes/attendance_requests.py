# attendance_requests.py
from flask import Blueprint, request, jsonify
from models.database import get_db_connection
from datetime import datetime
from services.notification_service import NotificationService

attendance_requests_bp = Blueprint('attendance_requests', __name__)

# Convert students.id → users.id
def get_student_user_id(student_id, cursor):
    cursor.execute("SELECT user_id FROM students WHERE id = ?", (student_id,))
    row = cursor.fetchone()
    return row["user_id"] if row else None


# ------------------------------------------------------
# TEACHER – GET PENDING REQUESTS
# ------------------------------------------------------
@attendance_requests_bp.route('/requests', methods=['GET'])
def get_pending_requests():
    teacher_id = request.args.get('teacher_id')
    
    if not teacher_id:
        return jsonify({'error': 'Teacher ID is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT 
                ar.id,
                ar.student_id,
                ar.department,
                ar.subject,
                ar.request_date,
                ar.reason,
                ar.created_at,
                u.name as student_name,
                u.email as student_email,
                s.enrollment_no,
                ar.status
            FROM attendance_requests ar
            JOIN students s ON ar.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE ar.teacher_id = ? AND ar.status = 'pending'
            ORDER BY ar.created_at DESC
        ''', (teacher_id,))
        
        return jsonify([dict(r) for r in cursor.fetchall()])
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()



# ------------------------------------------------------
# STUDENT – CREATE REQUEST
# ------------------------------------------------------
@attendance_requests_bp.route('/requests', methods=['POST'])
def create_attendance_request():
    data = request.json
    
    required_fields = ['student_id', 'teacher_id', 'department', 'subject', 'request_date']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check for duplicate pending request
        cursor.execute('''
            SELECT id FROM attendance_requests 
            WHERE student_id = ? AND teacher_id = ? AND request_date = ? 
            AND subject = ? AND status = 'pending'
        ''', (data['student_id'], data['teacher_id'], data['request_date'], data['subject']))
        
        if cursor.fetchone():
            return jsonify({'error': 'You already have a pending request for this date and subject'}), 400
        
        # Insert request
        cursor.execute('''
            INSERT INTO attendance_requests 
            (student_id, teacher_id, department, subject, request_date, reason)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data['student_id'],
            data['teacher_id'],
            data['department'],
            data['subject'],
            data['request_date'],
            data.get('reason', '')
        ))
        
        conn.commit()
        request_id = cursor.lastrowid
        
        # Fetch student name
        cursor.execute('''
            SELECT u.name 
            FROM students s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.id = ?
        ''', (data['student_id'],))
        student = cursor.fetchone()
        student_name = student['name'] if student else 'Student'
        
        # Notify teacher
        cursor.execute('SELECT user_id FROM teacher_profiles WHERE id = ?', (data['teacher_id'],))
        teacher_profile = cursor.fetchone()

        if teacher_profile:
            NotificationService.notify_attendance_request(
                teacher_id=teacher_profile["user_id"],
                request_data={
                    "id": request_id,
                    "student_name": student_name,
                    "department": data["department"],
                    "subject": data["subject"],
                    "request_date": data["request_date"],
                    "reason": data.get("reason", "")
                }
            )

        # Notify admins
        NotificationService.notify_admins(
            title="New Attendance Request",
            message=f"{student_name} submitted an attendance request.",
            notification_type="attendance_request",
            related_id=request_id
        )

        return jsonify({'message': 'Request submitted successfully'}), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()



# ------------------------------------------------------
# TEACHER – APPROVE REQUEST
# ------------------------------------------------------
@attendance_requests_bp.route('/requests/<int:request_id>/approve', methods=['POST'])
def approve_attendance_request(request_id):
    """Approve attendance request and mark student present"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Fetch request + user_id
        cursor.execute('''
            SELECT 
                ar.*,
                u.name as student_name,
                s.enrollment_no,
                s.user_id as student_user_id
            FROM attendance_requests ar
            JOIN students s ON ar.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE ar.id = ? AND ar.status = 'pending'
        ''', (request_id,))
        
        req = cursor.fetchone()
        if not req:
            return jsonify({'error': 'Request not found or already processed'}), 404

        req = dict(req)

        # Find class for teacher
        cursor.execute('''
            SELECT id FROM classes 
            WHERE teacher_id = ? AND class_name LIKE ?
            LIMIT 1
        ''', (req['teacher_id'], f"%{req['subject']}%"))
        
        class_data = cursor.fetchone()
        
        if not class_data:
            cursor.execute('''
                INSERT INTO classes (teacher_id, class_name, subject_code, schedule)
                VALUES (?, ?, ?, 'As per request')
            ''', (req['teacher_id'], req['subject'], req['subject']))
            class_id = cursor.lastrowid
        else:
            class_id = class_data['id']
        
        # Ensure student enrolled
        cursor.execute('''
            SELECT id FROM enrollment 
            WHERE student_id = ? AND class_id = ?
        ''', (req['student_id'], class_id))
        
        if not cursor.fetchone():
            cursor.execute('''
                INSERT INTO enrollment 
                (student_id, class_id, subject, department, section, semester, academic_year)
                VALUES (?, ?, ?, ?, 'A', 1, '2024-2025')
            ''', (req['student_id'], class_id, req['subject'], req['department']))
        
        # Mark attendance
        cursor.execute('''
            SELECT id FROM attendance 
            WHERE student_id = ? AND class_id = ? AND attendance_date = ?
        ''', (req['student_id'], class_id, req['request_date']))
        
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute('''
                UPDATE attendance 
                SET status='present', marked_by=?, marked_via_request=TRUE,
                    request_id=?, subject=?, department=?, created_at=CURRENT_TIMESTAMP
                WHERE id=?
            ''', (req['teacher_id'], request_id, req['subject'], req['department'], existing['id']))
        else:
            cursor.execute('''
                INSERT INTO attendance 
                (student_id, class_id, attendance_date, status, marked_by, marked_via_request, 
                 request_id, subject, department)
                VALUES (?, ?, ?, 'present', ?, TRUE, ?, ?, ?)
            ''', (req['student_id'], class_id, req['request_date'], req['teacher_id'],
                  request_id, req['subject'], req['department']))
        
        # Update request
        cursor.execute('''
            UPDATE attendance_requests 
            SET status='approved', responded_at=CURRENT_TIMESTAMP,
                processed_by_role='teacher', processed_by_user_id=?
            WHERE id=?
        ''', (req['teacher_id'], request_id))
        
        conn.commit()

        # --------------------------------
        # Notify correct student
        # --------------------------------
        student_user_id = req["student_user_id"]

        NotificationService.notify_user(
            user_id=student_user_id,
            title="Attendance Request Approved",
            message=f"Your request for {req['subject']} on {req['request_date']} has been approved.",
            notification_type="attendance_request",
            related_id=request_id
        )

        return jsonify({'message': 'Request approved'})
    
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()



# ------------------------------------------------------
# TEACHER – REJECT REQUEST
# ------------------------------------------------------
@attendance_requests_bp.route('/requests/<int:request_id>/reject', methods=['POST'])
def reject_attendance_request(request_id):
    """Reject attendance request"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT 
                ar.*,
                s.user_id as student_user_id
            FROM attendance_requests ar
            JOIN students s ON ar.student_id = s.id
            WHERE ar.id = ? AND ar.status = 'pending'
        ''', (request_id,))
        
        req = cursor.fetchone()
        if not req:
            return jsonify({'error': 'Request not found'}), 404
        
        req = dict(req)

        # Update request
        cursor.execute('''
            UPDATE attendance_requests 
            SET status='rejected',
                responded_at=CURRENT_TIMESTAMP,
                processed_by_role='teacher',
                processed_by_user_id=?
            WHERE id=?
        ''', (req['teacher_id'], request_id))
        
        conn.commit()

        # --------------------------------
        # Notify correct student
        # --------------------------------
        student_user_id = req["student_user_id"]

        NotificationService.notify_user(
            user_id=student_user_id,
            title="Attendance Request Rejected",
            message=f"Your attendance request for {req['subject']} on {req['request_date']} was rejected.",
            notification_type="attendance_request",
            related_id=request_id
        )

        return jsonify({'message': 'Request rejected'})
    
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()



# ------------------------------------------------------
# STUDENT – GET THEIR OWN REQUEST HISTORY
# ------------------------------------------------------
@attendance_requests_bp.route('/requests/student/<int:student_id>', methods=['GET'])
def get_student_requests(student_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT 
                ar.*,
                tp.full_name as teacher_name,
                u.email as teacher_email
            FROM attendance_requests ar
            JOIN teacher_profiles tp ON ar.teacher_id = tp.id
            JOIN users u ON tp.user_id = u.id
            WHERE ar.student_id = ?
            ORDER BY ar.created_at DESC
        ''', (student_id,))
        
        return jsonify([dict(r) for r in cursor.fetchall()])
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()



# ------------------------------------------------------
# TEACHER – STATS
# ------------------------------------------------------
@attendance_requests_bp.route('/requests/stats/<int:teacher_id>', methods=['GET'])
def get_request_stats(teacher_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT status, COUNT(*) as count
            FROM attendance_requests 
            WHERE teacher_id = ?
            GROUP BY status
        ''', (teacher_id,))
        
        stats = {row['status']: row['count'] for row in cursor.fetchall()}
        
        cursor.execute('''
            SELECT COUNT(*) as count 
            FROM attendance_requests 
            WHERE teacher_id = ? AND status = 'pending' AND request_date = DATE('now')
        ''', (teacher_id,))
        
        stats['today_pending'] = cursor.fetchone()['count']
        
        return jsonify(stats)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()



# ------------------------------------------------------
# ADMIN – GET ONLY PENDING REQUESTS
# ------------------------------------------------------
@attendance_requests_bp.route('/requests/admin/pending', methods=['GET'])
def admin_get_pending_requests():
    """Admin: Get only pending requests"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            SELECT 
                ar.id,
                ar.student_id,
                u.name AS student_name,
                s.enrollment_no,
                ar.teacher_id,
                tp.full_name AS teacher_name,
                ar.department,
                ar.subject,
                ar.request_date,
                ar.reason,
                ar.status,
                ar.created_at
            FROM attendance_requests ar
            JOIN students s ON ar.student_id = s.id
            JOIN users u ON s.user_id = u.id
            JOIN teacher_profiles tp ON ar.teacher_id = tp.id
            WHERE ar.status = 'pending'
            ORDER BY ar.created_at DESC
        ''')

        return jsonify([dict(r) for r in cursor.fetchall()])

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()



# ------------------------------------------------------
# ADMIN – APPROVE (does NOT mark attendance)
# ------------------------------------------------------
@attendance_requests_bp.route('/requests/admin/<int:request_id>/approve', methods=['POST'])
def admin_approve_only(request_id):
    """Admin approval — does NOT mark attendance, only updates status."""
    data = request.json or {}
    admin_user_id = data.get("admin_user_id")

    if not admin_user_id:
        return jsonify({"error": "Admin user ID required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Fetch request + student_user_id
        cursor.execute('''
            SELECT 
                ar.*,
                s.user_id as student_user_id
            FROM attendance_requests ar
            JOIN students s ON ar.student_id = s.id
            WHERE ar.id = ? AND ar.status = 'pending'
        ''', (request_id,))
        
        req = cursor.fetchone()
        if not req:
            return jsonify({'error': 'Request not found or already processed'}), 404
        
        req = dict(req)

        cursor.execute('''
            UPDATE attendance_requests
            SET status = 'approved',
                responded_at = CURRENT_TIMESTAMP,
                processed_by_role = 'admin',
                processed_by_user_id = ?
            WHERE id = ? AND status = 'pending'
        ''', (admin_user_id, request_id))

        conn.commit()

        # --------------------------------
        # Notify correct student
        # --------------------------------
        student_user_id = req["student_user_id"]

        NotificationService.notify_user(
            user_id=student_user_id,
            title="Attendance Request Approved",
            message=f"Your request for {req['subject']} on {req['request_date']} has been approved by admin.",
            notification_type="attendance_request",
            related_id=request_id
        )

        return jsonify({'message': 'Request approved by admin'})

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()



# ------------------------------------------------------
# ADMIN – REJECT
# ------------------------------------------------------
@attendance_requests_bp.route('/requests/admin/<int:request_id>/reject', methods=['POST'])
def admin_reject_only(request_id):
    """Admin rejection — does NOT touch attendance table."""
    data = request.json or {}
    admin_user_id = data.get("admin_user_id")

    if not admin_user_id:
        return jsonify({"error": "Admin user ID required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Fetch request + student_user_id
        cursor.execute('''
            SELECT 
                ar.*,
                s.user_id as student_user_id
            FROM attendance_requests ar
            JOIN students s ON ar.student_id = s.id
            WHERE ar.id = ? AND ar.status = 'pending'
        ''', (request_id,))
        
        req = cursor.fetchone()
        if not req:
            return jsonify({'error': 'Request not found or already processed'}), 404
        
        req = dict(req)

        cursor.execute('''
            UPDATE attendance_requests
            SET status = 'rejected',
                responded_at = CURRENT_TIMESTAMP,
                processed_by_role = 'admin',
                processed_by_user_id = ?
            WHERE id = ? AND status = 'pending'
        ''', (admin_user_id, request_id))

        conn.commit()

        # --------------------------------
        # Notify correct student
        # --------------------------------
        student_user_id = req["student_user_id"]

        NotificationService.notify_user(
            user_id=student_user_id,
            title="Attendance Request Rejected",
            message=f"Your attendance request for {req['subject']} on {req['request_date']} was rejected by admin.",
            notification_type="attendance_request",
            related_id=request_id
        )

        return jsonify({'message': 'Request rejected by admin'})

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()



# ------------------------------------------------------
# ALL PROCESSED REQUESTS
# ------------------------------------------------------
@attendance_requests_bp.route('/requests/processed', methods=['GET'])
def get_processed_requests():
    role = request.args.get('role')
    teacher_id = request.args.get('teacher_id')
    student_id = request.args.get('student_id')

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Base query
        query = '''
            SELECT 
                ar.*,
                u.name AS student_name,
                s.enrollment_no,
                tp.full_name AS teacher_name,
                u2.name AS processed_by_name
            FROM attendance_requests ar
            JOIN students s ON ar.student_id = s.id
            JOIN users u ON s.user_id = u.id
            JOIN teacher_profiles tp ON ar.teacher_id = tp.id
            LEFT JOIN users u2 ON ar.processed_by_user_id = u2.id
            WHERE ar.status IN ('approved', 'rejected')
        '''
        
        params = []

        # If role filtering applies
        if role == 'student' and student_id:
            query += " AND ar.student_id = ?"
            params.append(student_id)

        elif role == 'teacher' and teacher_id:
            # teacher sees all processed
            pass  

        elif role == 'admin':
            pass  # admin sees everything

        query += " ORDER BY ar.responded_at DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()

        return jsonify([dict(row) for row in rows])

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    finally:
        conn.close()

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
        # Resolve teacher_profile id (accept user_id or teacher_profile id)
        cursor.execute('SELECT id FROM teacher_profiles WHERE user_id = ?', (teacher_id,))
        tp = cursor.fetchone()
        if tp:
            teacher_profile_id = tp['id']
        else:
            try:
                # maybe teacher_id is already a profile id
                tid = int(teacher_id)
                cursor.execute('SELECT id FROM teacher_profiles WHERE id = ?', (tid,))
                if cursor.fetchone():
                    teacher_profile_id = tid
                else:
                    conn.close()
                    return jsonify({'error': 'Teacher profile not found'}), 404
            except ValueError:
                conn.close()
                return jsonify({'error': 'Invalid teacher id'}), 400

        cursor.execute('''
            SELECT 
                ar.id,
                ar.class_id,
                ar.request_date,
                ar.reason,
                ar.status,
                ar.created_at,
                u.name as student_name,
                u.email as student_email,
                st.enrollment_no,
                COALESCE(s.name, c.class_name) as subject,
                COALESCE(d.name, '') as department
            FROM attendance_requests ar
            JOIN classes c ON ar.class_id = c.id
            LEFT JOIN subjects s ON c.subject_id = s.id
            LEFT JOIN departments d ON s.department_id = d.id
            JOIN students st ON ar.student_id = st.id
            JOIN users u ON st.user_id = u.id
            WHERE c.teacher_id = ? AND ar.status = 'pending'
            ORDER BY ar.created_at DESC
        ''', (teacher_profile_id,))
        
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
    print("ATTENDANCE REQUEST PAYLOAD:", data)
    
    # Accept either class_id or (teacher_id + subject) so the frontend can submit either
    if not data or 'student_id' not in data or 'request_date' not in data:
        return jsonify({'error': 'student_id and request_date are required'}), 400

    class_id = data.get('class_id')
    teacher_id = data.get('teacher_id')
    subject = data.get('subject')

    # If class_id not provided, try to resolve it from teacher_id + subject
    if not class_id:
        if not teacher_id or not subject:
            return jsonify({'error': 'Either class_id or (teacher_id and subject) must be provided'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Resolve class_id from teacher_id + subject if not provided
        if not class_id:
            # teacher_id from frontend is already the teacher_profiles.id
            cursor.execute('SELECT id FROM teacher_profiles WHERE user_id = ?', (teacher_id,))
            tp = cursor.fetchone()
            if tp:
                teacher_profile_id = tp['id']
            else:
                # fallback: maybe teacher_id already is profile id
                ...

            if not cursor.fetchone():
                conn.close()
                return jsonify({'error': 'Teacher profile not found'}), 404

            # Find class by teacher and subject name
            cursor.execute('SELECT id FROM classes WHERE teacher_id = ? AND class_name LIKE ? LIMIT 1', (teacher_profile_id, f"%{subject}%"))
            cls = cursor.fetchone()
            if cls:
                class_id = cls['id']
            else:
                # If no exact match, try to find any class taught by this teacher with the subject_id
                cursor.execute('''
                    SELECT c.id FROM classes c
                    JOIN subjects s ON c.subject_id = s.id
                    WHERE c.teacher_id = ? AND s.name LIKE ?
                    LIMIT 1
                ''', (teacher_profile_id, f"%{subject}%"))
                cls = cursor.fetchone()
                if cls:
                    class_id = cls['id']
                else:
                    # If still no match, get any class for this teacher as a fallback
                    cursor.execute('SELECT id FROM classes WHERE teacher_id = ? LIMIT 1', (teacher_profile_id,))
                    cls = cursor.fetchone()
                    if cls:
                        class_id = cls['id']
                    else:
                        conn.close()
                        return jsonify({'error': 'No classes found for the selected teacher. Please contact your teacher or administrator'}), 400

        # Check for duplicate pending request for same student/class/date
        cursor.execute('''
            SELECT id FROM attendance_requests 
            WHERE student_id = ? AND class_id = ? AND request_date = ? 
            AND status = 'pending'
        ''', (data['student_id'], class_id, data['request_date']))

        existing_request = cursor.fetchone()
        
        if existing_request:
            # Update the existing pending request instead of rejecting
            request_id = existing_request['id']
            cursor.execute('''
                UPDATE attendance_requests
                SET reason = ?, created_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (data.get('reason', ''), request_id))
            conn.commit()
        else:
            # Insert new request (store class_id only; subject/department can be derived)
            cursor.execute('''
                INSERT INTO attendance_requests 
                (student_id, class_id, reason, request_date)
                VALUES (?, ?, ?, ?)
            ''', (
                data['student_id'],
                class_id,
                data.get('reason', ''),
                data['request_date']
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

        # derive subject & department from class
        cursor.execute('SELECT COALESCE(s.name, c.class_name) as subject, COALESCE(d.name, "") as department, c.teacher_id FROM classes c LEFT JOIN subjects s ON c.subject_id = s.id LEFT JOIN departments d ON s.department_id = d.id WHERE c.id = ?', (class_id,))
        class_row = cursor.fetchone()

        # Notify teacher of the class
        if class_row:
            cursor.execute('SELECT user_id FROM teacher_profiles WHERE id = ?', (class_row['teacher_id'],))
            teacher_profile = cursor.fetchone()
            if teacher_profile:
                NotificationService.notify_attendance_request(
                    teacher_id=teacher_profile['user_id'],
                    request_data={
                        "id": request_id,
                        "student_name": student_name,
                        "request_date": data["request_date"],
                        "reason": data.get("reason", ""),
                        "subject": class_row['subject'],
                        "department": class_row['department']
                    }
                )

        # Notify all teachers
        NotificationService.notify_all_teachers(
            title="New Attendance Request",
            message=f"{student_name} submitted an attendance request for {class_row['subject'] if class_row else 'a class'}.",
            notification_type="attendance_request",
            related_id=request_id
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

        # Ensure we have a class_id
        class_id = req.get('class_id')
        if not class_id:
            return jsonify({'error': 'Request does not reference a class; cannot approve automatically'}, 400)

        # Ensure class exists
        cursor.execute('SELECT id, teacher_id FROM classes WHERE id = ?', (class_id,))
        class_row = cursor.fetchone()
        if not class_row:
            return jsonify({'error': 'Referenced class not found'}), 404

        # Ensure student enrolled
        cursor.execute('''
            SELECT id FROM enrollment 
            WHERE student_id = ? AND class_id = ?
        ''', (req['student_id'], class_id))
        
        if not cursor.fetchone():
            cursor.execute('''
                INSERT INTO enrollment 
                (student_id, class_id, section, semester, academic_year)
                VALUES (?, ?, 'A', 1, '2024-2025')
            ''', (req['student_id'], class_id))
        
        # Determine teacher user id for processed_by
        cursor.execute('SELECT user_id FROM teacher_profiles WHERE id = ?', (class_row['teacher_id'],))
        teacher_profile = cursor.fetchone()
        teacher_user_id = teacher_profile['user_id'] if teacher_profile else None

        # Mark attendance — append a new attendance record for the approved request
        cursor.execute('''
            INSERT INTO attendance 
            (student_id, class_id, attendance_date, status, marked_by, method, marked_via_request, request_id)
            VALUES (?, ?, ?, 'present', ?, 'attendance_request', TRUE, ?)
        ''', (req['student_id'], class_id, req['request_date'], teacher_user_id, request_id))
        
        # Update request
        cursor.execute('''
            UPDATE attendance_requests 
            SET status='approved', responded_at=CURRENT_TIMESTAMP,
                processed_by_role='teacher', processed_by_user_id=?
            WHERE id=?
        ''', (teacher_user_id, request_id))
        
        conn.commit()
        # --------------------------------
        # Notify correct student
        # --------------------------------
        student_user_id = req["student_user_id"]

        # derive subject name from class
        cursor.execute('SELECT COALESCE(s.name, c.class_name) as subject_name FROM classes c LEFT JOIN subjects s ON c.subject_id = s.id WHERE c.id = ?', (class_id,))
        subj_row = cursor.fetchone()
        subject_name = subj_row['subject_name'] if subj_row else 'the class'

        NotificationService.notify_user(
            user_id=student_user_id,
            title="Attendance Request Approved",
            message=f"Your request for {subject_name} on {req['request_date']} has been approved.",
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

        # Determine teacher user id for processed_by (via class)
        cursor.execute('SELECT class_id FROM attendance_requests WHERE id = ?', (request_id,))
        ar_row = cursor.fetchone()
        class_id = ar_row['class_id'] if ar_row else None
        processed_by_user = None
        if class_id:
            cursor.execute('SELECT teacher_id FROM classes WHERE id = ?', (class_id,))
            c_row = cursor.fetchone()
            if c_row:
                cursor.execute('SELECT user_id FROM teacher_profiles WHERE id = ?', (c_row['teacher_id'],))
                tp = cursor.fetchone()
                processed_by_user = tp['user_id'] if tp else None

        # Update request
        cursor.execute('''
            UPDATE attendance_requests 
            SET status='rejected',
                responded_at=CURRENT_TIMESTAMP,
                processed_by_role='teacher',
                processed_by_user_id=?
            WHERE id=?
        ''', (processed_by_user, request_id))
        
        conn.commit()

        # Ensure this rejection counts as ABSENT in attendance table
        if class_id:
            cursor.execute("""
                SELECT id FROM attendance
                WHERE student_id = ? AND class_id = ? AND attendance_date = ?
        """, (req['student_id'], class_id, req['request_date']))

        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO attendance
                (student_id, class_id, attendance_date, status, marked_by, method)
                VALUES (?, ?, ?, 'absent', ?, 'attendance_request_rejected')
            """, (req['student_id'], class_id, req['request_date'], processed_by_user))
            conn.commit()

        # --------------------------------
        # Notify correct student
        # --------------------------------
        student_user_id = req["student_user_id"]

        # derive subject name from class
        subject_name = None
        if class_id:
            cursor.execute('SELECT COALESCE(s.name, c.class_name) as subject_name FROM classes c LEFT JOIN subjects s ON c.subject_id = s.id WHERE c.id = ?', (class_id,))
            subj_row = cursor.fetchone()
            subject_name = subj_row['subject_name'] if subj_row else None

        NotificationService.notify_user(
            user_id=student_user_id,
            title="Attendance Request Rejected",
            message=f"Your attendance request for {subject_name or 'the class'} on {req['request_date']} was rejected.",
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
        # Prefer treating the provided id as a user_id first (avoids numeric collisions)
        cursor.execute('SELECT id FROM students WHERE user_id = ?', (student_id,))
        student_row = cursor.fetchone()
        if student_row:
            student_id = student_row['id']
        else:
            cursor.execute('SELECT id FROM students WHERE id = ?', (student_id,))
            student_row = cursor.fetchone()
            if student_row:
                student_id = student_row['id']

        cursor.execute('''
            SELECT 
                ar.*,
                u.name as teacher_name,
                u.email as teacher_email
            FROM attendance_requests ar
            JOIN classes c ON ar.class_id = c.id
            LEFT JOIN teacher_profiles tp ON c.teacher_id = tp.id
            LEFT JOIN users u ON tp.user_id = u.id
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
        # Use classes to link requests to teacher profile
        cursor.execute('''
            SELECT ar.status, COUNT(*) as count
            FROM attendance_requests ar
            JOIN classes c ON ar.class_id = c.id
            WHERE c.teacher_id = ?
            GROUP BY ar.status
        ''', (teacher_id,))
        
        stats = {row['status']: row['count'] for row in cursor.fetchall()}
        
        cursor.execute('''
            SELECT COUNT(*) as count 
            FROM attendance_requests ar
            JOIN classes c ON ar.class_id = c.id
            WHERE c.teacher_id = ? AND ar.status = 'pending' AND ar.request_date = DATE('now')
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
                c.teacher_id,
                tu.name AS teacher_name,
                COALESCE(subj.name, c.class_name) as subject,
                COALESCE(d.name, '') as department,
                ar.request_date,
                ar.reason,
                ar.status,
                ar.created_at
            FROM attendance_requests ar
            JOIN students s ON ar.student_id = s.id
            JOIN users u ON s.user_id = u.id
            JOIN classes c ON ar.class_id = c.id
            LEFT JOIN teacher_profiles tp ON c.teacher_id = tp.id
            LEFT JOIN users tu ON tp.user_id = tu.id
            LEFT JOIN subjects subj ON c.subject_id = subj.id
            LEFT JOIN departments d ON subj.department_id = d.id
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

        # derive subject name from class
        cursor.execute('SELECT COALESCE(s.name, c.class_name) as subject_name FROM classes c LEFT JOIN subjects s ON c.subject_id = s.id WHERE c.id = ?', (req.get('class_id'),))
        subj_row = cursor.fetchone()
        subject_name = subj_row['subject_name'] if subj_row else 'the class'

        NotificationService.notify_user(
            user_id=student_user_id,
            title="Attendance Request Approved",
            message=f"Your request for {subject_name} on {req['request_date']} has been approved by admin.",
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

        # Ensure this rejection counts as ABSENT in attendance table
        class_id = req.get('class_id')
        if class_id:
            cursor.execute("""
                SELECT id FROM attendance
                WHERE student_id = ? AND class_id = ? AND attendance_date = ?
            """, (req['student_id'], class_id, req['request_date']))

        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO attendance
                (student_id, class_id, attendance_date, status, marked_by, method)
                VALUES (?, ?, ?, 'absent', ?, 'attendance_request_rejected')
            """, (req['student_id'], class_id, req['request_date'], admin_user_id))
            conn.commit()

        # --------------------------------
        # Notify correct student
        # --------------------------------
        student_user_id = req["student_user_id"]

        # derive subject name from class
        cursor.execute('SELECT COALESCE(s.name, c.class_name) as subject_name FROM classes c LEFT JOIN subjects s ON c.subject_id = s.id WHERE c.id = ?', (req.get('class_id'),))
        subj_row = cursor.fetchone()
        subject_name = subj_row['subject_name'] if subj_row else 'the class'

        NotificationService.notify_user(
            user_id=student_user_id,
            title="Attendance Request Rejected",
            message=f"Your attendance request for {subject_name} on {req['request_date']} was rejected by admin.",
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
                tuser.name AS teacher_name,
                u2.name AS processed_by_name
            FROM attendance_requests ar
            JOIN students s ON ar.student_id = s.id
            JOIN users u ON s.user_id = u.id
            JOIN classes c ON ar.class_id = c.id
            LEFT JOIN teacher_profiles tp ON c.teacher_id = tp.id
            LEFT JOIN users tuser ON tp.user_id = tuser.id
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

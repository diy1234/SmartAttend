# routes/student_attendance_routes.py
from flask import Blueprint, request, jsonify
from models.database import get_db_connection

student_attendance_bp = Blueprint('student_attendance', __name__)

@student_attendance_bp.route('/attendance/student/<int:student_id>', methods=['GET'])
def get_student_attendance(student_id):
    """Get attendance records for a specific student"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT 
                a.id,
                a.student_id,
                a.class_id,
                COALESCE(subj.name, c.class_name) AS subject,
                COALESCE(d.name, '') AS department,
                a.attendance_date,
                a.status,
                a.method,
                a.marked_via_request,
                a.request_id,
                a.created_at,
                c.class_name,
                tu.name as teacher_name
            FROM attendance a
            JOIN classes c ON a.class_id = c.id
            LEFT JOIN subjects subj ON c.subject_id = subj.id
            LEFT JOIN departments d ON subj.department_id = d.id
            LEFT JOIN teacher_profiles tp ON c.teacher_id = tp.id
            LEFT JOIN users tu ON tp.user_id = tu.id
            WHERE a.student_id = ?
            ORDER BY a.attendance_date DESC
        ''', (student_id,))
        
        attendance_records = cursor.fetchall()
        result = [dict(record) for record in attendance_records]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'attendances': result,
            'count': len(result)
        })
        
    except Exception as e:
        conn.close()
        return jsonify({'success': False, 'error': str(e)}), 500

@student_attendance_bp.route('/attendance-requests', methods=['POST'])
def create_attendance_request():
    """Create a new attendance request (compatible with canonical API)
    Accepts either:
      - { student_id, class_id, request_date, reason }
      - { student_id, teacher_id, subject, request_date, reason }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        if 'student_id' not in data or 'request_date' not in data:
            return jsonify({'success': False, 'error': 'student_id and request_date are required'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Ensure student exists
        cursor.execute('SELECT id FROM students WHERE id = ?', (data['student_id'],))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'success': False, 'error': 'Student not found'}), 404

        class_id = data.get('class_id')
        # Resolve class_id if not supplied: need teacher_id + subject
        if not class_id:
            teacher_id = data.get('teacher_id')
            subject = data.get('subject')
            if not teacher_id or not subject:
                conn.close()
                return jsonify({'success': False, 'error': 'Either class_id or (teacher_id and subject) must be provided'}), 400

            # Resolve teacher_profile id (accept user_id or profile id)
            cursor.execute('SELECT id FROM teacher_profiles WHERE user_id = ?', (teacher_id,))
            tp = cursor.fetchone()
            if tp:
                teacher_profile_id = tp['id']
            else:
                try:
                    candidate = int(teacher_id)
                    cursor.execute('SELECT id FROM teacher_profiles WHERE id = ?', (candidate,))
                    if cursor.fetchone():
                        teacher_profile_id = candidate
                    else:
                        conn.close()
                        return jsonify({'success': False, 'error': 'Teacher profile not found'}), 404
                except ValueError:
                    conn.close()
                    return jsonify({'success': False, 'error': 'Invalid teacher id'}), 400

            cursor.execute('SELECT id FROM classes WHERE teacher_id = ? AND class_name LIKE ? LIMIT 1', (teacher_profile_id, f"%{subject}%"))
            cls = cursor.fetchone()
            if cls:
                class_id = cls['id']
            else:
                conn.close()
                return jsonify({'success': False, 'error': 'Class not found for given teacher and subject; please select class directly'}), 400

        # Prevent duplicate pending request
        cursor.execute('''
            SELECT id FROM attendance_requests 
            WHERE student_id = ? AND class_id = ? AND request_date = ? 
            AND status = 'pending'
        ''', (data['student_id'], class_id, data['request_date']))

        if cursor.fetchone():
            conn.close()
            return jsonify({'success': False, 'error': 'You already have a pending request for this date and class'}), 400

        # Insert request (store class_id only)
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

        # Notify teacher
        if class_row:
            cursor.execute('SELECT user_id FROM teacher_profiles WHERE id = ?', (class_row['teacher_id'],))
            teacher_profile = cursor.fetchone()
            if teacher_profile:
                try:
                    from services.notification_service import NotificationService
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
                except Exception:
                    pass

        # Notify admins
        try:
            from services.notification_service import NotificationService
            NotificationService.notify_admins(
                title="New Attendance Request",
                message=f"{student_name} submitted an attendance request.",
                notification_type="attendance_request",
                related_id=request_id
            )
        except Exception:
            pass

        conn.close()

        return jsonify({'success': True, 'message': 'Request submitted successfully', 'request_id': request_id}), 201

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@student_attendance_bp.route('/attendance-requests/student/<int:student_id>', methods=['GET'])
def get_student_attendance_requests(student_id):
    """Get all attendance requests for a specific student (accepts student_id or user_id)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # If the provided id doesn't match a student.id, try treating it as a user_id
        cursor.execute('SELECT id FROM students WHERE id = ?', (student_id,))
        student_row = cursor.fetchone()
        if not student_row:
            cursor.execute('SELECT id FROM students WHERE user_id = ?', (student_id,))
            student_row = cursor.fetchone()
            if student_row:
                student_id = student_row['id']

        cursor.execute('''
            SELECT 
                ar.id,
                ar.student_id,
                ar.class_id,
                COALESCE(subj.name, c.class_name) as subject,
                COALESCE(d.name, '') as department,
                ar.request_date,
                ar.reason,
                ar.status,
                ar.created_at,
                ar.responded_at,
                tu.name as teacher_name
            FROM attendance_requests ar
            LEFT JOIN classes c ON ar.class_id = c.id
            LEFT JOIN subjects subj ON c.subject_id = subj.id
            LEFT JOIN departments d ON subj.department_id = d.id
            LEFT JOIN teacher_profiles tp ON c.teacher_id = tp.id
            LEFT JOIN users tu ON tp.user_id = tu.id
            WHERE ar.student_id = ?
            ORDER BY ar.created_at DESC
        ''', (student_id,))
        
        requests = cursor.fetchall()
        result = [dict(req) for req in requests]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'requests': result,
            'count': len(result)
        })
        
    except Exception as e:
        conn.close()
        return jsonify({'success': False, 'error': str(e)}), 500

@student_attendance_bp.route('/student/enrolled-classes/<int:student_id>', methods=['GET'])
def get_student_enrolled_classes(student_id):
    """Get all classes a student is enrolled in"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT 
                e.id as enrollment_id,
                e.student_id,
                e.class_id,
                COALESCE(subj.name, c.class_name) as subject,
                COALESCE(d.name, '') as department,
                e.section,
                e.semester,
                e.academic_year,
                c.class_name,
                COALESCE(c.room, '') as room,
                c.teacher_id
            FROM enrollment e
            JOIN classes c ON e.class_id = c.id
            LEFT JOIN subjects subj ON c.subject_id = subj.id
            LEFT JOIN departments d ON subj.department_id = d.id
            WHERE e.student_id = ?
        ''', (student_id,))
        
        classes = cursor.fetchall()
        result = [dict(cls) for cls in classes]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'classes': result,
            'count': len(result)
        })
        
    except Exception as e:
        conn.close()
        return jsonify({'success': False, 'error': str(e)}), 500

@student_attendance_bp.route('/attendance-requests/teacher/<int:teacher_profile_id>', methods=['GET'])
def get_teacher_attendance_requests(teacher_profile_id):
    """Get all attendance requests for a specific teacher"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT 
                ar.id,
                ar.student_id,
                ar.class_id,
                COALESCE(subj.name, c.class_name) as subject,
                COALESCE(d.name, '') as department,
                ar.request_date,
                ar.reason,
                ar.status,
                ar.created_at,
                ar.responded_at,
                u.name as student_name,
                u.email as student_email,
                s.enrollment_no,
                s.course as student_course,
                s.semester
            FROM attendance_requests ar
            JOIN classes c ON ar.class_id = c.id
            LEFT JOIN subjects subj ON c.subject_id = subj.id
            LEFT JOIN departments d ON subj.department_id = d.id
            JOIN students s ON ar.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE c.teacher_id = ?
            ORDER BY 
                CASE WHEN ar.status = 'pending' THEN 1 ELSE 2 END,
                ar.created_at DESC
        ''', (teacher_profile_id,))
        
        requests = cursor.fetchall()
        result = [dict(req) for req in requests]
        
        conn.close()
        
        return jsonify({
            'requests': result,
            'count': len(result),
            'pending_count': len([r for r in result if r['status'] == 'pending'])
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
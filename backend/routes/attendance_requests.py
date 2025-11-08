from flask import Blueprint, request, jsonify
from models.database import get_db_connection
from datetime import datetime
from services.notification_service import NotificationService

attendance_requests_bp = Blueprint('attendance_requests', __name__)

@attendance_requests_bp.route('/requests', methods=['GET'])
def get_pending_requests():
    """Get pending attendance requests for a teacher"""
    teacher_id = request.args.get('teacher_id')
    
    if not teacher_id:
        return jsonify({'error': 'Teacher ID is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get pending requests for this teacher - FIXED JOIN to use students table
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
                s.enrollment_no
            FROM attendance_requests ar
            JOIN students s ON ar.student_id = s.id  -- FIXED: Join with students table
            JOIN users u ON s.user_id = u.id         -- FIXED: Then join with users table
            WHERE ar.teacher_id = ? AND ar.status = 'pending'
            ORDER BY ar.created_at DESC
        ''', (teacher_id,))
        
        requests = cursor.fetchall()
        result = [dict(req) for req in requests]
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@attendance_requests_bp.route('/requests', methods=['POST'])
def create_attendance_request():
    """Create a new attendance request (Student)"""
    data = request.json
    
    required_fields = ['student_id', 'teacher_id', 'department', 'subject', 'request_date']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if request already exists for same student, teacher, date, and subject
        cursor.execute('''
            SELECT id FROM attendance_requests 
            WHERE student_id = ? AND teacher_id = ? AND request_date = ? AND subject = ? AND status = 'pending'
        ''', (data['student_id'], data['teacher_id'], data['request_date'], data['subject']))
        
        if cursor.fetchone():
            return jsonify({'error': 'You already have a pending request for this class and date'}), 400
        
        # Create new request
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
        
        # 🔔 Send notification to teacher about new attendance request
        # Get student name for notification
        cursor.execute('''
            SELECT u.name 
            FROM students s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.id = ?
        ''', (data['student_id'],))
        student = cursor.fetchone()
        student_name = student['name'] if student else 'Student'
        
        request_data = {
            'id': request_id,
            'student_name': student_name,
            'department': data['department'],
            'subject': data['subject'],
            'request_date': data['request_date'],
            'reason': data.get('reason', '')
        }
        
        # Get teacher user_id for notification
        cursor.execute('SELECT user_id FROM teacher_profiles WHERE id = ?', (data['teacher_id'],))
        teacher_profile = cursor.fetchone()
        if teacher_profile:
            NotificationService.notify_attendance_request(
                teacher_id=teacher_profile['user_id'],
                request_data=request_data
            )
        
        return jsonify({'message': 'Attendance request submitted successfully'}), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@attendance_requests_bp.route('/requests/<int:request_id>/approve', methods=['POST'])
def approve_attendance_request(request_id):
    """Approve attendance request and mark student as present - ENHANCED VERSION"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get the request details with all necessary information
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
        
        request_data = cursor.fetchone()
        if not request_data:
            return jsonify({'error': 'Request not found or already processed'}), 404
        
        request_dict = dict(request_data)
        
        # Find or create a class for this subject and teacher
        cursor.execute('''
            SELECT id FROM classes 
            WHERE teacher_id = ? AND class_name LIKE ?
            LIMIT 1
        ''', (request_dict['teacher_id'], f"%{request_dict['subject']}%"))
        
        class_data = cursor.fetchone()
        
        if not class_data:
            # Create a class entry if it doesn't exist
            cursor.execute('''
                INSERT INTO classes (teacher_id, class_name, subject_code, schedule)
                VALUES (?, ?, ?, 'As per request')
            ''', (request_dict['teacher_id'], request_dict['subject'], request_dict['subject']))
            class_id = cursor.lastrowid
        else:
            class_id = class_data['id']
        
        # Check if student is enrolled in this class, if not enroll them
        cursor.execute('''
            SELECT id FROM enrollment 
            WHERE student_id = ? AND class_id = ?
        ''', (request_dict['student_id'], class_id))
        
        if not cursor.fetchone():
            cursor.execute('''
                INSERT INTO enrollment 
                (student_id, class_id, subject, department, section, semester, academic_year)
                VALUES (?, ?, ?, ?, 'A', 1, '2024-2025')
            ''', (request_dict['student_id'], class_id, request_dict['subject'], request_dict['department']))
        
        # Check if attendance already exists for this student, class, and date
        cursor.execute('''
            SELECT id FROM attendance 
            WHERE student_id = ? AND class_id = ? AND attendance_date = ?
        ''', (request_dict['student_id'], class_id, request_dict['request_date']))
        
        existing_attendance = cursor.fetchone()
        
        if existing_attendance:
            # Update existing attendance to present
            cursor.execute('''
                UPDATE attendance 
                SET status = 'present', 
                    marked_by = ?, 
                    marked_via_request = TRUE, 
                    request_id = ?, 
                    subject = ?, 
                    department = ?,
                    created_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (
                request_dict['teacher_id'], 
                request_id, 
                request_dict['subject'],
                request_dict['department'],
                existing_attendance['id']
            ))
        else:
            # Create new attendance record
            cursor.execute('''
                INSERT INTO attendance 
                (student_id, class_id, attendance_date, status, marked_by, 
                 marked_via_request, request_id, subject, department)
                VALUES (?, ?, ?, 'present', ?, TRUE, ?, ?, ?)
            ''', (
                request_dict['student_id'],
                class_id,
                request_dict['request_date'],
                request_dict['teacher_id'],
                request_id,
                request_dict['subject'],
                request_dict['department']
            ))
        
        # Update the request status to approved
        cursor.execute('''
            UPDATE attendance_requests 
            SET status = 'approved', responded_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (request_id,))
        
        conn.commit()
        
        return jsonify({
            'message': 'Attendance request approved and student marked as present',
            'attendance_marked': True,
            'student_name': request_dict['student_name'],
            'subject': request_dict['subject'],
            'date': request_dict['request_date']
        })
        
    except Exception as e:
        conn.rollback()
        print(f"Error approving request: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@attendance_requests_bp.route('/requests/<int:request_id>/reject', methods=['POST'])
def reject_attendance_request(request_id):
    """Reject attendance request"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get request details for response message
        cursor.execute('''
            SELECT ar.*, u.name as student_name
            FROM attendance_requests ar
            JOIN students s ON ar.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE ar.id = ? AND ar.status = 'pending'
        ''', (request_id,))
        
        request_data = cursor.fetchone()
        if not request_data:
            return jsonify({'error': 'Request not found or already processed'}), 404
        
        request_dict = dict(request_data)
        
        # Update the request status to rejected
        cursor.execute('''
            UPDATE attendance_requests 
            SET status = 'rejected', responded_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (request_id,))
        
        conn.commit()
        
        return jsonify({
            'message': 'Attendance request rejected',
            'student_name': request_dict['student_name'],
            'subject': request_dict['subject'],
            'date': request_dict['request_date']
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@attendance_requests_bp.route('/requests/student/<int:student_id>', methods=['GET'])
def get_student_requests(student_id):
    """Get attendance request history for a student"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT 
                ar.*,
                tp.full_name as teacher_name,
                u.email as teacher_email
            FROM attendance_requests ar
            JOIN teacher_profiles tp ON ar.teacher_id = tp.id  -- FIXED: Join with teacher_profiles
            JOIN users u ON tp.user_id = u.id
            WHERE ar.student_id = ?
            ORDER BY ar.created_at DESC
        ''', (student_id,))
        
        requests = cursor.fetchall()
        result = [dict(req) for req in requests]
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@attendance_requests_bp.route('/requests/stats/<int:teacher_id>', methods=['GET'])
def get_request_stats(teacher_id):
    """Get statistics for attendance requests"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get counts by status
        cursor.execute('''
            SELECT 
                status,
                COUNT(*) as count
            FROM attendance_requests 
            WHERE teacher_id = ?
            GROUP BY status
        ''', (teacher_id,))
        
        stats = cursor.fetchall()
        result = {stat['status']: stat['count'] for stat in stats}
        
        # Get today's pending requests
        cursor.execute('''
            SELECT COUNT(*) as count 
            FROM attendance_requests 
            WHERE teacher_id = ? AND status = 'pending' AND request_date = DATE('now')
        ''', (teacher_id,))
        
        today_pending = cursor.fetchone()['count']
        result['today_pending'] = today_pending
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
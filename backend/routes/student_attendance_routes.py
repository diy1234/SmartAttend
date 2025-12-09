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
                a.subject,
                a.department,
                a.attendance_date,
                a.status,
                a.method,
                a.marked_via_request,
                a.request_id,
                a.created_at,
                c.class_name,
                tp.full_name as teacher_name
            FROM attendance a
            LEFT JOIN classes c ON a.class_id = c.id
            LEFT JOIN teacher_profiles tp ON c.teacher_id = tp.id
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
    """Create a new attendance request"""
    print("📨 Received attendance request")
    
    try:
        data = request.get_json()
        print(f"📝 Creating attendance request with data: {data}")
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        required_fields = ['student_id', 'teacher_id', 'department', 'subject', 'request_date']
        missing_fields = []
        for field in required_fields:
            if field not in data or not data[field]:
                missing_fields.append(field)
        
        if missing_fields:
            return jsonify({
                'success': False, 
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT id FROM students WHERE id = ?', (data['student_id'],))
        student = cursor.fetchone()
        
        if not student:
            conn.close()
            return jsonify({'success': False, 'error': 'Student not found'}), 404
        
        cursor.execute('SELECT id FROM teacher_profiles WHERE id = ?', (data['teacher_id'],))
        teacher = cursor.fetchone()
        
        if not teacher:
            conn.close()
            return jsonify({'success': False, 'error': 'Teacher not found'}), 404
        
        cursor.execute('''
            SELECT u.name 
            FROM students s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.id = ?
        ''', (data['student_id'],))
        student_info = cursor.fetchone()
        student_name = student_info['name'] if student_info else 'Student'
        
        cursor.execute('''
            SELECT id FROM attendance_requests 
            WHERE student_id = ? AND request_date = ? AND subject = ?
        ''', (data['student_id'], data['request_date'], data['subject']))
        
        existing_request = cursor.fetchone()
        if existing_request:
            conn.close()
            return jsonify({
                'success': False, 
                'error': 'Attendance request already exists for this date and subject'
            }), 400
        
        cursor.execute('''
            INSERT INTO attendance_requests 
            (student_id, teacher_id, department, subject, request_date, reason, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['student_id'],
            data['teacher_id'],
            data['department'],
            data['subject'],
            data['request_date'],
            data.get('reason', ''),
            data.get('status', 'pending')
        ))
        
        request_id = cursor.lastrowid
        
        try:
            cursor.execute('SELECT user_id FROM teacher_profiles WHERE id = ?', (data['teacher_id'],))
            teacher_user = cursor.fetchone()
            
            if teacher_user:
                teacher_user_id = teacher_user['user_id']
                notification_title = "New Attendance Request"
                notification_message = f"{student_name} from {data['department']} - {data['subject']} requests attendance for {data['request_date']}"
                
                cursor.execute('''
                    INSERT INTO notifications 
                    (user_id, title, message, type, related_id, is_read)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    teacher_user_id,
                    notification_title,
                    notification_message,
                    'attendance_request',
                    request_id,
                    False
                ))
                print(f"✅ Notification created for teacher user_id: {teacher_user_id}")
        except Exception as notification_error:
            print(f"⚠️ Failed to create notification: {notification_error}")
        
        conn.commit()
        conn.close()
        
        print(f"✅ Attendance request created successfully with ID: {request_id}")
        
        return jsonify({
            'success': True,
            'message': 'Attendance request submitted successfully',
            'request_id': request_id
        })
        
    except Exception as e:
        print(f"❌ Error creating attendance request: {e}")
        import traceback
        print(f"🔍 Full traceback: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': str(e)}), 500

@student_attendance_bp.route('/attendance-requests/student/<int:student_id>', methods=['GET'])
def get_student_attendance_requests(student_id):
    """Get all attendance requests for a specific student"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT 
                ar.id,
                ar.student_id,
                ar.teacher_id,
                ar.department,
                ar.subject,
                ar.request_date,
                ar.reason,
                ar.status,
                ar.created_at,
                ar.responded_at,
                tp.full_name as teacher_name
            FROM attendance_requests ar
            LEFT JOIN teacher_profiles tp ON ar.teacher_id = tp.id
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
                e.subject,
                e.department,
                e.section,
                e.semester,
                e.academic_year,
                c.class_name,
                c.subject_code,
                c.teacher_id
            FROM enrollment e
            JOIN classes c ON e.class_id = c.id
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
                ar.department,
                ar.subject,
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
            JOIN students s ON ar.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE ar.teacher_id = ?
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
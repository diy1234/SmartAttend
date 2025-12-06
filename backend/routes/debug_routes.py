# routes/debug_routes.py
from flask import Blueprint, request, jsonify
from models.database import get_db_connection

debug_bp = Blueprint('debug', __name__)

@debug_bp.route('/debug/current-student', methods=['GET'])
def debug_current_student():
    """Debug endpoint to check current student data"""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({'success': False, 'error': 'user_id parameter required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT s.id as student_id, u.id as user_id, u.name, u.email, s.enrollment_no, s.course, s.semester
            FROM students s
            JOIN users u ON s.user_id = u.id
            WHERE u.id = ? OR s.id = ?
        ''', (user_id, user_id))
        
        student = cursor.fetchone()
        
        if student:
            cursor.execute('SELECT id FROM face_encodings WHERE student_id = ?', (student['student_id'],))
            face_exists = cursor.fetchone()
            
            return jsonify({
                'success': True,
                'student_data': dict(student),
                'face_registered': face_exists is not None,
                'face_encoding_id': face_exists['id'] if face_exists else None
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Student not found',
                'user_id_provided': user_id
            })
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()

@debug_bp.route('/debug/attendance-request', methods=['POST'])
def debug_attendance_request():
    """Debug route to check attendance request data"""
    try:
        data = request.get_json()
        print("📨 Received attendance request data:")
        print(f"   Data: {data}")
        print(f"   Headers: {dict(request.headers)}")
        
        return jsonify({
            'success': True,
            'received_data': data,
            'message': 'Debug info printed in console'
        })
    except Exception as e:
        print(f"❌ Error in debug route: {e}")
        return jsonify({'error': str(e)}), 500

@debug_bp.route('/debug/attendance-requests', methods=['GET'])
def debug_attendance_requests():
    """Debug route to check attendance requests data"""
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
                s.enrollment_no,
                u.name as student_name,
                u.email as student_email,
                tp.full_name as teacher_name
            FROM attendance_requests ar
            JOIN students s ON ar.student_id = s.id
            JOIN users u ON s.user_id = u.id
            LEFT JOIN teacher_profiles tp ON ar.teacher_id = tp.id
            ORDER BY ar.created_at DESC
        ''')
        
        requests = cursor.fetchall()
        
        cursor.execute('SELECT id, user_id, full_name FROM teacher_profiles')
        teachers = cursor.fetchall()
        
        cursor.execute('SELECT id, user_id, enrollment_no FROM students')
        students = cursor.fetchall()
        
        conn.close()
        
        return jsonify({
            'attendance_requests': [dict(req) for req in requests],
            'teacher_profiles': [dict(teacher) for teacher in teachers],
            'students': [dict(student) for student in students],
            'count': len(requests)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@debug_bp.route('/debug/notifications', methods=['GET'])
def debug_notifications():
    """Debug route to check all notifications"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT 
                n.id,
                n.user_id,
                n.title,
                n.message,
                n.type,
                n.related_id,
                n.is_read,
                n.created_at,
                u.name as user_name,
                u.role as user_role
            FROM notifications n
            JOIN users u ON n.user_id = u.id
            ORDER BY n.created_at DESC
        ''')
        
        notifications = cursor.fetchall()
        
        cursor.execute('''
            SELECT tp.id as profile_id, tp.user_id, u.name, u.email 
            FROM teacher_profiles tp
            JOIN users u ON tp.user_id = u.id
        ''')
        
        teachers = cursor.fetchall()
        
        conn.close()
        
        return jsonify({
            'notifications': [dict(notif) for notif in notifications],
            'teachers': [dict(teacher) for teacher in teachers],
            'total_notifications': len(notifications)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@debug_bp.route('/debug/attendance-analytics', methods=['GET'])
def debug_attendance_analytics():
    """Debug endpoint to check attendance marking and analytics"""
    teacher_id = request.args.get('teacher_id')
    
    if not teacher_id:
        return jsonify({'error': 'teacher_id parameter required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get teacher profile ID
        cursor.execute('SELECT id FROM teacher_profiles WHERE user_id = ?', (teacher_id,))
        teacher_profile = cursor.fetchone()
        
        if not teacher_profile:
            return jsonify({
                'error': 'Teacher profile not found',
                'teacher_user_id': teacher_id
            }), 404
        
        teacher_profile_id = teacher_profile['id']
        
        # Get all classes for this teacher
        cursor.execute('''
            SELECT id, class_name, subject_code FROM classes WHERE teacher_id = ?
        ''', (teacher_profile_id,))
        
        classes = [dict(row) for row in cursor.fetchall()]
        
        # Get attendance records for these classes
        class_ids = [c['id'] for c in classes]
        
        attendance_data = {}
        for class_id in class_ids:
            cursor.execute('''
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
                    SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
                FROM attendance
                WHERE class_id = ?
            ''', (class_id,))
            
            row = cursor.fetchone()
            attendance_data[class_id] = dict(row) if row else {'total': 0, 'present': 0, 'absent': 0}
        
        # Get recent attendance records
        cursor.execute('''
            SELECT 
                a.id,
                a.student_id,
                a.class_id,
                a.attendance_date,
                a.status,
                a.marked_by,
                a.subject,
                a.department,
                u.name as student_name,
                c.class_name
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            JOIN users u ON s.user_id = u.id
            JOIN classes c ON a.class_id = c.id
            WHERE c.teacher_id = ?
            ORDER BY a.created_at DESC
            LIMIT 20
        ''', (teacher_profile_id,))
        
        recent_attendance = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            'teacher_profile_id': teacher_profile_id,
            'classes_count': len(classes),
            'classes': classes,
            'attendance_by_class': attendance_data,
            'recent_attendance': recent_attendance,
            'total_attendance_records': sum(d['total'] for d in attendance_data.values())
        })
        
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500
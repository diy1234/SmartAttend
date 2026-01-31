from flask import Blueprint, request, jsonify
from datetime import datetime
from models.database import get_db_connection
from services.notification_service import NotificationService

attendance_bp = Blueprint('attendance', __name__)

@attendance_bp.route('/', methods=['POST'])
def mark_attendance():
    try:
        data = request.get_json()
        student_id = data.get('student_id')    # students.id
        class_id = data.get('class_id')
        status = data.get('status')
        marked_by = data.get('marked_by')
        
        attendance_date = datetime.now().date()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Mark / update today's attendance
        cursor.execute('''
            INSERT OR REPLACE INTO attendance 
            (student_id, class_id, attendance_date, status, marked_by)
            VALUES (?, ?, ?, ?, ?)
        ''', (student_id, class_id, attendance_date, status, marked_by))
        
        # --------- CHECK ATTENDANCE PERCENTAGE ----------
        cursor.execute('''
            SELECT 
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
                COUNT(*) as total_classes
            FROM attendance
            WHERE student_id = ?
        ''', (student_id,))
        
        stats = cursor.fetchone()
        present = stats['present_count'] or 0
        total = stats['total_classes'] or 1
        percentage = (present / total) * 100.0

        # Find the student's user_id
        cursor.execute('SELECT user_id FROM students WHERE id = ?', (student_id,))
        stu = cursor.fetchone()
        student_user_id = stu['user_id'] if stu else None

        # If attendance < 75%, send warning (max once per day)
        if student_user_id and percentage < 75:
            cursor.execute('''
                SELECT COUNT(*) as c
                FROM notifications
                WHERE user_id = ? 
                  AND type = 'attendance_warning'
                  AND DATE(created_at) = DATE('now')
            ''', (student_user_id,))
            already = cursor.fetchone()['c']

            if already == 0:
                NotificationService.notify_user(
                    user_id=student_user_id,
                    title="Low Attendance Warning",
                    message=f"Your attendance is now {percentage:.2f}%. Please attend regularly to avoid shortage.",
                    notification_type='attendance_warning'
                )

        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Attendance marked successfully'}), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@attendance_bp.route('/student-percent', methods=['GET'])
def get_student_attendance_percent():
    """
    Calculate attendance percentage for a student in a specific subject.
    This endpoint properly joins attendance with classes and enrollment tables
    to ensure subject-wise filtering works correctly.
    
    Params:
    - student_id: ID of the student
    - subject: Name of the subject (required for filtering)
    """
    student_id = request.args.get('student_id')
    subject = request.args.get('subject')
    
    if not student_id or not subject:
        return jsonify({'error': 'student_id and subject are required'}), 400
    
    try:
        student_id = int(student_id)
    except ValueError:
        return jsonify({'error': 'Invalid student_id'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Query attendance for the specific student and subject
        # Join with classes to get the subject name (since enrollment stores subject info)
        # and with enrollment to verify enrollment
        cursor.execute('''
            SELECT 
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
                COUNT(*) as total_classes
            FROM attendance a
            JOIN classes c ON a.class_id = c.id
            LEFT JOIN subjects s ON c.subject_id = s.id
            WHERE a.student_id = ?
              AND (c.class_name = ? OR s.name = ?)
        ''', (student_id, subject, subject))
        
        row = cursor.fetchone()
        present = row['present_count'] or 0 if row else 0
        total = row['total_classes'] or 0 if row else 0
        
        # Calculate percentage
        percentage = round((present / total) * 100) if total > 0 else 0
        
        conn.close()
        
        return jsonify({
            'percent': percentage,
            'present': present,
            'total': total
        })
    
    except Exception as e:
        conn.close()
        print(f"Error calculating attendance: {str(e)}")
        return jsonify({'error': str(e), 'percent': 0}), 500


@attendance_bp.route('/student-stats', methods=['GET'])
def get_student_attendance_stats():
    """Get overall attendance statistics by department and subject for a student"""
    student_id = request.args.get('student_id')
    
    if not student_id:
        return jsonify({'error': 'student_id is required'}), 400
    
    try:
        student_id = int(student_id)
    except ValueError:
        return jsonify({'error': 'Invalid student_id'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get attendance statistics grouped by department and subject
        cursor.execute('''
            SELECT 
                COALESCE(d.name, '') as department,
                COALESCE(s.name, c.class_name) as subject,
                COUNT(*) as total_classes,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as classes_attended,
                ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as attendance_percent
            FROM attendance a
            JOIN classes c ON a.class_id = c.id
            LEFT JOIN subjects s ON c.subject_id = s.id
            LEFT JOIN departments d ON s.department_id = d.id
            WHERE a.student_id = ?
            GROUP BY department, subject
            ORDER BY department, subject
        ''', (student_id,))
        
        stats = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return jsonify({
            'success': True,
            'stats': stats
        })
    
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@attendance_bp.route('/', methods=['GET'])
def get_attendance():
    class_id = request.args.get('class_id')
    date = request.args.get('date')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT a.*, u.name as student_name, s.enrollment_no
        FROM attendance a
        JOIN students st ON a.student_id = st.id
        JOIN users u ON st.user_id = u.id
        WHERE a.class_id = ? AND a.attendance_date = ?
    ''', (class_id, date))
    
    attendance = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify({'attendance': attendance})

@attendance_bp.route('/analytics', methods=['GET'])
def get_attendance_analytics():
    """Get attendance analytics for a teacher - FIXED VERSION"""
    teacher_id = request.args.get('teacher_id')  # This should be teacher profile ID
    period = request.args.get('period', 'all')  # all, week, month
    
    if not teacher_id:
        return jsonify({'error': 'Teacher ID is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if this is a user_id or teacher_profile_id
    try:
        teacher_id_int = int(teacher_id)
        
        # If it's a small number, it might be user_id, check if teacher profile exists
        cursor.execute('SELECT id FROM teacher_profiles WHERE user_id = ?', (teacher_id_int,))
        teacher_profile = cursor.fetchone()
        
        if teacher_profile:
            # It was a user_id, use the teacher profile ID instead
            teacher_profile_id = teacher_profile['id']
        else:
            # Check if it's already a teacher profile ID
            cursor.execute('SELECT id FROM teacher_profiles WHERE id = ?', (teacher_id_int,))
            if cursor.fetchone():
                teacher_profile_id = teacher_id_int
            else:
                conn.close()
                return jsonify({'error': 'Teacher profile not found'}), 404
    except ValueError:
        conn.close()
        return jsonify({'error': 'Invalid teacher ID format'}), 400
    
    date_filter = ""
    if period == 'week':
        date_filter = "AND a.attendance_date >= date('now', '-7 days')"
    elif period == 'month':
        date_filter = "AND a.attendance_date >= date('now', '-1 month')"
    
    try:
        # Get overall statistics - FIXED: Use classes table instead of class_schedules
        cursor.execute(f'''
            SELECT 
                COUNT(*) as total_records,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count
            FROM attendance a
            JOIN classes c ON a.class_id = c.id
            WHERE c.teacher_id = ? {date_filter}
        ''', (teacher_profile_id,))
        
        overall_stats = dict(cursor.fetchone())
        print(f"Analytics for teacher_profile_id {teacher_profile_id}: {overall_stats}")
        
        # Get subject-wise statistics - FIXED: Use classes table
        cursor.execute(f'''
            SELECT 
                COALESCE(s.name, c.class_name) as subject_name,
                COALESCE(d.name, '') as department_name,
                COUNT(*) as total,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count
            FROM attendance a
            JOIN classes c ON a.class_id = c.id
            LEFT JOIN subjects s ON c.subject_id = s.id
            LEFT JOIN departments d ON s.department_id = d.id
            WHERE c.teacher_id = ? {date_filter}
            GROUP BY subject_name, department_name
        ''', (teacher_profile_id,))
        
        subject_stats = [dict(row) for row in cursor.fetchall()]
        print(f"Subject-wise stats: {len(subject_stats)} subjects found")
        
        # Get daily statistics - FIXED: Use classes table
        cursor.execute(f'''
            SELECT 
                date(a.attendance_date) as date,
                COALESCE(s.name, c.class_name) as subject_name,
                COUNT(*) as total,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count
            FROM attendance a
            JOIN classes c ON a.class_id = c.id
            LEFT JOIN subjects s ON c.subject_id = s.id
            WHERE c.teacher_id = ? {date_filter}
            GROUP BY date(a.attendance_date), subject_name
            ORDER BY a.attendance_date DESC
        ''', (teacher_profile_id,))
        
        daily_stats = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            'overall': overall_stats,
            'subject_wise': subject_stats,
            'daily': daily_stats
        })
        
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500
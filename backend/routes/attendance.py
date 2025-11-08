from flask import Blueprint, request, jsonify
from datetime import datetime
from models.database import get_db_connection

attendance_bp = Blueprint('attendance', __name__)

@attendance_bp.route('/', methods=['POST'])
def mark_attendance():
    try:
        data = request.get_json()
        student_id = data.get('student_id')
        class_id = data.get('class_id')
        status = data.get('status')
        marked_by = data.get('marked_by')
        
        attendance_date = datetime.now().date()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO attendance 
            (student_id, class_id, attendance_date, status, marked_by)
            VALUES (?, ?, ?, ?, ?)
        ''', (student_id, class_id, attendance_date, status, marked_by))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Attendance marked successfully'}), 201
    except Exception as e:
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
        
        # Get subject-wise statistics - FIXED: Use classes table
        cursor.execute(f'''
            SELECT 
                c.class_name as subject_name,
                a.department as department_name,
                COUNT(*) as total,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count
            FROM attendance a
            JOIN classes c ON a.class_id = c.id
            WHERE c.teacher_id = ? {date_filter}
            GROUP BY c.class_name, a.department
        ''', (teacher_profile_id,))
        
        subject_stats = [dict(row) for row in cursor.fetchall()]
        
        # Get daily statistics - FIXED: Use classes table
        cursor.execute(f'''
            SELECT 
                date(a.attendance_date) as date,
                c.class_name as subject_name,
                COUNT(*) as total,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count
            FROM attendance a
            JOIN classes c ON a.class_id = c.id
            WHERE c.teacher_id = ? {date_filter}
            GROUP BY date(a.attendance_date), c.class_name
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
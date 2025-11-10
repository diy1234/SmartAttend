from flask import Blueprint, request, jsonify
from models.database import get_db_connection
import sqlite3
from datetime import datetime

teacher_dashboard_bp = Blueprint('teacher_dashboard', __name__)

@teacher_dashboard_bp.route('/my-courses', methods=['GET'])
def get_teacher_courses():
    """Get all courses for a teacher with proper department info"""
    try:
        # Get teacher ID from query parameter
        teacher_id = request.args.get('teacher_id')
        
        if not teacher_id:
            return jsonify({'error': 'Teacher ID is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get teacher profile ID from user ID
        cursor.execute('SELECT id FROM teacher_profiles WHERE user_id = ?', (teacher_id,))
        teacher_profile = cursor.fetchone()
        
        if not teacher_profile:
            conn.close()
            return jsonify({'error': 'Teacher profile not found'}), 404
        
        teacher_profile_id = teacher_profile['id']
        
        # Get classes assigned to this teacher with proper enrollment information
        cursor.execute('''
            SELECT 
                c.id as id,
                c.class_name as subject,
                c.subject_code,
                c.schedule,
                COALESCE(e.department, 'Computer Science') as department,
                COUNT(DISTINCT e.student_id) as student_count
            FROM classes c
            LEFT JOIN enrollment e ON c.id = e.class_id
            WHERE c.teacher_id = ?
            GROUP BY c.id, c.class_name, c.subject_code, c.schedule, e.department
            ORDER BY c.class_name
        ''', (teacher_profile_id,))
        
        classes = cursor.fetchall()
        
        # Format the response for frontend
        formatted_courses = []
        for cls in classes:
            formatted_courses.append({
                'id': cls['id'],
                'subject': cls['subject'],
                'subject_code': cls['subject_code'],
                'schedule': cls['schedule'] or 'Not scheduled',
                'department': cls['department'],
                'room': 'TBA',
                'student_count': cls['student_count']
            })
        
        conn.close()
        
        print(f"📚 Returning {len(formatted_courses)} courses for teacher {teacher_id}")
        for course in formatted_courses:
            print(f"  - {course['subject']} ({course['department']}) - {course['student_count']} students")
        
        return jsonify({
            'courses': formatted_courses,
            'count': len(formatted_courses)
        }), 200
        
    except Exception as e:
        print(f"Error in get_teacher_courses: {str(e)}")
        return jsonify({'error': str(e)}), 500

@teacher_dashboard_bp.route('/stats', methods=['GET'])
def get_teacher_stats():
    """Get teacher dashboard statistics"""
    try:
        teacher_id = request.args.get('teacher_id')
        
        if not teacher_id:
            return jsonify({'error': 'Teacher ID is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get teacher profile ID
        cursor.execute('SELECT id FROM teacher_profiles WHERE user_id = ?', (teacher_id,))
        teacher_profile = cursor.fetchone()
        
        if not teacher_profile:
            conn.close()
            return jsonify({'error': 'Teacher profile not found'}), 404
        
        teacher_profile_id = teacher_profile['id']
        
        # Get total courses count
        cursor.execute('SELECT COUNT(*) as course_count FROM classes WHERE teacher_id = ?', (teacher_profile_id,))
        course_count = cursor.fetchone()['course_count']
        
        # Get total students count
        cursor.execute('''
            SELECT COUNT(DISTINCT e.student_id) as student_count
            FROM enrollment e
            JOIN classes c ON e.class_id = c.id
            WHERE c.teacher_id = ?
        ''', (teacher_profile_id,))
        student_count = cursor.fetchone()['student_count']
        
        # Get pending attendance requests
        cursor.execute('''
            SELECT COUNT(*) as pending_requests
            FROM attendance_requests 
            WHERE teacher_id = ? AND status = 'pending'
        ''', (teacher_profile_id,))
        pending_requests = cursor.fetchone()['pending_requests']
        
        conn.close()
        
        return jsonify({
            'course_count': course_count,
            'student_count': student_count,
            'pending_requests': pending_requests
        })
        
    except Exception as e:
        print(f"Error in get_teacher_stats: {str(e)}")
        return jsonify({'error': str(e)}), 500

@teacher_dashboard_bp.route('/course-students/<int:class_id>', methods=['GET'])
def get_course_students(class_id):
    """Get all students enrolled in a specific class"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get class details
        cursor.execute('''
            SELECT 
                c.id,
                c.class_name as subject,
                c.subject_code,
                c.teacher_id
            FROM classes c
            WHERE c.id = ?
        ''', (class_id,))
        
        course = cursor.fetchone()
        
        if not course:
            conn.close()
            return jsonify({'error': 'Course not found'}), 404
        
        # Get teacher name
        cursor.execute('''
            SELECT tp.full_name, u.name
            FROM teacher_profiles tp
            JOIN users u ON tp.user_id = u.id
            WHERE tp.id = ?
        ''', (course['teacher_id'],))
        teacher = cursor.fetchone()
        teacher_name = teacher['full_name'] if teacher and teacher['full_name'] else teacher['name'] if teacher else 'Unknown Teacher'
        
        # Get students enrolled in this class
        cursor.execute('''
            SELECT 
                s.id as student_id,
                u.id as user_id,
                u.name as student_name,
                u.email,
                s.enrollment_no,
                s.course as student_course,
                s.semester,
                COUNT(a.id) as total_classes,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
                CASE 
                    WHEN COUNT(a.id) > 0 THEN 
                        ROUND((SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(a.id)), 2)
                    ELSE 0 
                END as attendance_percentage
            FROM enrollment e
            JOIN students s ON e.student_id = s.id
            JOIN users u ON s.user_id = u.id
            LEFT JOIN attendance a ON s.id = a.student_id AND e.class_id = a.class_id
            WHERE e.class_id = ?
            GROUP BY s.id, u.id, u.name, u.email, s.enrollment_no, s.course, s.semester
            ORDER BY u.name
        ''', (class_id,))
        
        students = cursor.fetchall()
        
        # Format students data for frontend
        formatted_students = []
        for student in students:
            formatted_students.append({
                'id': student['student_id'],
                'name': student['student_name'],
                'email': student['email'],
                'enrollment_no': student['enrollment_no'],
                'course': student['student_course'],
                'semester': student['semester'],
                'attendance': f"{student['attendance_percentage']}%",
                'present_count': student['present_count'],
                'total_classes': student['total_classes'],
                'attendance_percentage': student['attendance_percentage']
            })
        
        conn.close()
        
        print(f"📋 Returning {len(formatted_students)} students for class {class_id}")
        
        return jsonify({
            'course': {
                'id': course['id'],
                'name': course['subject'],
                'subject': course['subject'],
                'subject_code': course['subject_code'],
                'department': 'Computer Science',
                'teacher_name': teacher_name
            },
            'students': formatted_students,
            'student_count': len(formatted_students)
        }), 200
        
    except Exception as e:
        print(f"Error in get_course_students: {str(e)}")
        return jsonify({'error': str(e)}), 500

@teacher_dashboard_bp.route('/course-attendance/<int:class_id>', methods=['GET'])
def get_course_attendance(class_id):
    """Get detailed attendance for a specific course"""
    try:
        date = request.args.get('date')  # Optional date filter
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get course details
        cursor.execute('''
            SELECT 
                c.class_name,
                c.subject_code,
                c.teacher_id
            FROM classes c
            WHERE c.id = ?
        ''', (class_id,))
        
        course = cursor.fetchone()
        
        if not course:
            return jsonify({'error': 'Course not found'}), 404
        
        # Get teacher name
        cursor.execute('''
            SELECT tp.full_name, u.name
            FROM teacher_profiles tp
            JOIN users u ON tp.user_id = u.id
            WHERE tp.id = ?
        ''', (course['teacher_id'],))
        teacher = cursor.fetchone()
        teacher_name = teacher['full_name'] if teacher and teacher['full_name'] else teacher['name'] if teacher else 'Unknown Teacher'
        
        # Build attendance query
        query = '''
            SELECT 
                a.attendance_date,
                u.name as student_name,
                s.enrollment_no,
                a.status,
                a.method,
                a.created_at
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE a.class_id = ?
        '''
        params = [class_id]
        
        if date:
            query += ' AND a.attendance_date = ?'
            params.append(date)
        
        query += ' ORDER BY a.attendance_date DESC, u.name'
        
        cursor.execute(query, params)
        attendance_records = cursor.fetchall()
        
        # Format attendance data
        formatted_attendance = []
        for record in attendance_records:
            formatted_attendance.append({
                'date': record['attendance_date'],
                'student_name': record['student_name'],
                'enrollment_no': record['enrollment_no'],
                'status': record['status'],
                'method': record['method'],
                'marked_at': record['created_at']
            })
        
        conn.close()
        
        return jsonify({
            'course': {
                'name': course['class_name'],
                'subject_code': course['subject_code'],
                'teacher_name': teacher_name
            },
            'attendance': formatted_attendance,
            'count': len(formatted_attendance)
        }), 200
        
    except Exception as e:
        print(f"Error in get_course_attendance: {str(e)}")
        return jsonify({'error': str(e)}), 500

@teacher_dashboard_bp.route('/mark-attendance', methods=['POST'])
def mark_attendance():
    """Mark attendance for students in a course"""
    try:
        data = request.get_json()
        
        class_id = data.get('class_id')
        attendance_date = data.get('date')
        attendance_data = data.get('attendance')  # List of {student_id, status}
        marked_by = data.get('teacher_id')  # Teacher user ID from request
        
        if not all([class_id, attendance_date, attendance_data, marked_by]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get teacher profile ID
        cursor.execute('SELECT id FROM teacher_profiles WHERE user_id = ?', (marked_by,))
        teacher_profile = cursor.fetchone()
        
        if not teacher_profile:
            conn.close()
            return jsonify({'error': 'Teacher profile not found'}), 404
        
        teacher_profile_id = teacher_profile['id']
        
        # Get class details to get subject and department
        cursor.execute('SELECT class_name, subject_code FROM classes WHERE id = ?', (class_id,))
        class_info = cursor.fetchone()
        
        if not class_info:
            conn.close()
            return jsonify({'error': 'Class not found'}), 404
        
        subject = class_info['class_name']
        
        # Get department from enrollment
        cursor.execute('SELECT department FROM enrollment WHERE class_id = ? LIMIT 1', (class_id,))
        dept_result = cursor.fetchone()
        department = dept_result['department'] if dept_result else 'Computer Science'
        
        # Mark attendance for each student
        success_count = 0
        errors = []
        
        for record in attendance_data:
            student_id = record.get('student_id')
            status = record.get('status')
            
            if not all([student_id, status]):
                errors.append(f"Invalid record: {record}")
                continue
            
            try:
                # Check if attendance already exists for this date
                cursor.execute('''
                    SELECT id FROM attendance 
                    WHERE student_id = ? AND class_id = ? AND attendance_date = ?
                ''', (student_id, class_id, attendance_date))
                
                existing = cursor.fetchone()
                
                if existing:
                    # Update existing attendance
                    cursor.execute('''
                        UPDATE attendance 
                        SET status = ?, marked_by = ?, created_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    ''', (status, teacher_profile_id, existing['id']))
                else:
                    # Insert new attendance
                    cursor.execute('''
                        INSERT INTO attendance 
                        (student_id, class_id, attendance_date, status, marked_by, subject, department)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (student_id, class_id, attendance_date, status, teacher_profile_id, subject, department))
                
                success_count += 1
                
            except sqlite3.Error as e:
                errors.append(f"Failed to mark attendance for student {student_id}: {str(e)}")
        
        conn.commit()
        conn.close()
        
        response = {
            'message': f'Attendance marked successfully for {success_count} students',
            'success_count': success_count
        }
        
        if errors:
            response['errors'] = errors
        
        return jsonify(response), 200
        
    except Exception as e:
        print(f"Error in mark_attendance: {str(e)}")
        return jsonify({'error': str(e)}), 500

@teacher_dashboard_bp.route('/attendance-summary/<int:class_id>', methods=['GET'])
def get_attendance_summary(class_id):
    """Get attendance summary for a course"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get course details
        cursor.execute('''
            SELECT 
                c.class_name,
                c.subject_code,
                c.teacher_id
            FROM classes c
            WHERE c.id = ?
        ''', (class_id,))
        
        course = cursor.fetchone()
        
        if not course:
            return jsonify({'error': 'Course not found'}), 404
        
        # Get teacher name
        cursor.execute('''
            SELECT tp.full_name, u.name
            FROM teacher_profiles tp
            JOIN users u ON tp.user_id = u.id
            WHERE tp.id = ?
        ''', (course['teacher_id'],))
        teacher = cursor.fetchone()
        teacher_name = teacher['full_name'] if teacher and teacher['full_name'] else teacher['name'] if teacher else 'Unknown Teacher'
        
        # Get total classes conducted
        cursor.execute('''
            SELECT COUNT(DISTINCT attendance_date) as total_classes
            FROM attendance 
            WHERE class_id = ?
        ''', (class_id,))
        
        total_classes = cursor.fetchone()['total_classes']
        
        # Get attendance summary by student
        cursor.execute('''
            SELECT 
                s.id as student_id,
                u.name as student_name,
                s.enrollment_no,
                COUNT(a.id) as total_attended,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
                CASE 
                    WHEN COUNT(a.id) > 0 THEN 
                        ROUND((SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(a.id)), 2)
                    ELSE 0 
                END as attendance_percentage
            FROM enrollment e
            JOIN students s ON e.student_id = s.id
            JOIN users u ON s.user_id = u.id
            LEFT JOIN attendance a ON e.student_id = a.student_id AND a.class_id = e.class_id
            WHERE e.class_id = ?
            GROUP BY s.id, u.name, s.enrollment_no
            ORDER BY attendance_percentage DESC
        ''', (class_id,))
        
        summary = cursor.fetchall()
        
        # Calculate overall statistics
        total_students = len(summary)
        avg_attendance = 0
        if total_students > 0:
            total_percentage = sum([row['attendance_percentage'] for row in summary])
            avg_attendance = round(total_percentage / total_students, 2)
        
        conn.close()
        
        return jsonify({
            'course': {
                'name': course['class_name'],
                'subject_code': course['subject_code'],
                'teacher_name': teacher_name
            },
            'total_classes': total_classes,
            'total_students': total_students,
            'average_attendance': avg_attendance,
            'summary': [
                {
                    'student_id': row['student_id'],
                    'student_name': row['student_name'],
                    'enrollment_no': row['enrollment_no'],
                    'total_attended': row['total_attended'],
                    'present_count': row['present_count'],
                    'attendance_percentage': row['attendance_percentage']
                } for row in summary
            ]
        }), 200
        
    except Exception as e:
        print(f"Error in get_attendance_summary: {str(e)}")
        return jsonify({'error': str(e)}), 500

@teacher_dashboard_bp.route('/weekly-schedule', methods=['GET'])
def get_weekly_schedule():
    """Get weekly schedule for the teacher"""
    try:
        teacher_id = request.args.get('teacher_id')
        
        if not teacher_id:
            return jsonify({'error': 'Teacher ID is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get teacher profile ID
        cursor.execute('SELECT id FROM teacher_profiles WHERE user_id = ?', (teacher_id,))
        teacher_profile = cursor.fetchone()
        
        if not teacher_profile:
            conn.close()
            return jsonify({'error': 'Teacher profile not found'}), 404
        
        teacher_profile_id = teacher_profile['id']
        
        # Get weekly schedule
        cursor.execute('''
            SELECT 
                cs.day_of_week as day,
                cs.start_time,
                cs.end_time,
                cs.room_number as room,
                s.name as subject,
                d.name as department
            FROM class_schedules cs
            JOIN subjects s ON cs.subject_id = s.id
            JOIN departments d ON cs.department_id = d.id
            WHERE cs.teacher_id = ?
            ORDER BY 
                CASE cs.day_of_week
                    WHEN 'Monday' THEN 1
                    WHEN 'Tuesday' THEN 2
                    WHEN 'Wednesday' THEN 3
                    WHEN 'Thursday' THEN 4
                    WHEN 'Friday' THEN 5
                    WHEN 'Saturday' THEN 6
                    WHEN 'Sunday' THEN 7
                END,
                cs.start_time
        ''', (teacher_profile_id,))
        
        schedules = cursor.fetchall()
        
        # Format schedule data for frontend
        formatted_schedule = []
        for schedule in schedules:
            formatted_schedule.append({
                'id': f"schedule_{schedule['day']}_{schedule['start_time']}",
                'day': schedule['day'],
                'time': f"{schedule['start_time']} - {schedule['end_time']}",
                'subject': schedule['subject'],
                'room': schedule['room'],
                'department': schedule['department'],
                'dept': schedule['department']  # Add dept alias for consistency
            })
        
        # Also get classes without specific schedules
        cursor.execute('''
            SELECT 
                c.class_name as subject,
                c.schedule,
                c.subject_code
            FROM classes c
            WHERE c.teacher_id = ?
            AND NOT EXISTS (
                SELECT 1 FROM class_schedules cs 
                WHERE cs.teacher_id = c.teacher_id 
                AND cs.subject_id IN (SELECT id FROM subjects WHERE name LIKE '%' || c.class_name || '%')
            )
        ''', (teacher_profile_id,))
        
        unscheduled_classes = cursor.fetchall()
        
        for cls in unscheduled_classes:
            # Parse schedule from class data if available
            schedule_parts = cls['schedule'].split(' - ') if cls['schedule'] else ['Not Scheduled', '']
            formatted_schedule.append({
                'id': f"class_{cls['subject_code']}",
                'day': schedule_parts[0] if schedule_parts else 'Not Scheduled',
                'time': schedule_parts[1] if len(schedule_parts) > 1 else 'TBA',
                'subject': cls['subject'],
                'room': 'TBA',
                'department': 'Computer Science',
                'dept': 'Computer Science'
            })
        
        conn.close()
        
        return jsonify({
            'schedule': formatted_schedule,
            'count': len(formatted_schedule)
        }), 200
        
    except Exception as e:
        print(f"Error in get_weekly_schedule: {str(e)}")
        return jsonify({'error': str(e)}), 500

@teacher_dashboard_bp.route('/pending-requests', methods=['GET'])
def get_pending_requests():
    """Get pending attendance requests for the teacher"""
    try:
        teacher_id = request.args.get('teacher_id')
        
        if not teacher_id:
            return jsonify({'error': 'Teacher ID is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get teacher profile ID
        cursor.execute('SELECT id FROM teacher_profiles WHERE user_id = ?', (teacher_id,))
        teacher_profile = cursor.fetchone()
        
        if not teacher_profile:
            conn.close()
            return jsonify({'error': 'Teacher profile not found'}), 404
        
        teacher_profile_id = teacher_profile['id']
        
        # Get pending attendance requests
        cursor.execute('''
            SELECT 
                ar.id,
                ar.request_date,
                ar.reason,
                ar.status,
                ar.created_at,
                u.name as student_name,
                st.enrollment_no,
                ar.department,
                ar.subject
            FROM attendance_requests ar
            JOIN students st ON ar.student_id = st.id
            JOIN users u ON st.user_id = u.id
            WHERE ar.teacher_id = ? AND ar.status = 'pending'
            ORDER BY ar.created_at DESC
        ''', (teacher_profile_id,))
        
        requests = cursor.fetchall()
        
        # Format requests data
        formatted_requests = []
        for req in requests:
            formatted_requests.append({
                'id': req['id'],
                'student_name': req['student_name'],
                'enrollment_no': req['enrollment_no'],
                'request_date': req['request_date'],
                'reason': req['reason'],
                'department': req['department'],
                'subject': req['subject'],
                'status': req['status'],
                'created_at': req['created_at']
            })
        
        conn.close()
        
        return jsonify({
            'requests': formatted_requests,
            'count': len(formatted_requests)
        }), 200
        
    except Exception as e:
        print(f"Error in get_pending_requests: {str(e)}")
        return jsonify({'error': str(e)}), 500

@teacher_dashboard_bp.route('/update-request-status', methods=['POST'])
def update_request_status():
    """Update attendance request status"""
    try:
        data = request.get_json()
        
        request_id = data.get('request_id')
        status = data.get('status')  # 'approved' or 'rejected'
        teacher_id = data.get('teacher_id')  # Teacher user ID
        
        if not all([request_id, status, teacher_id]) or status not in ['approved', 'rejected']:
            return jsonify({'error': 'Invalid request data'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get teacher profile ID
        cursor.execute('SELECT id FROM teacher_profiles WHERE user_id = ?', (teacher_id,))
        teacher_profile = cursor.fetchone()
        
        if not teacher_profile:
            conn.close()
            return jsonify({'error': 'Teacher profile not found'}), 404
        
        teacher_profile_id = teacher_profile['id']
        
        # Verify the request belongs to this teacher
        cursor.execute('SELECT id FROM attendance_requests WHERE id = ? AND teacher_id = ?', (request_id, teacher_profile_id))
        request_record = cursor.fetchone()
        
        if not request_record:
            conn.close()
            return jsonify({'error': 'Request not found or unauthorized'}), 404
        
        # Update request status
        cursor.execute('''
            UPDATE attendance_requests 
            SET status = ?, responded_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (status, request_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': f'Request {status} successfully'
        }), 200
        
    except Exception as e:
        print(f"Error in update_request_status: {str(e)}")
        return jsonify({'error': str(e)}), 500

@teacher_dashboard_bp.route('/pending-requests-count', methods=['GET'])
def get_pending_requests_count():
    """Get count of pending attendance requests for teacher dashboard"""
    teacher_id = request.args.get('teacher_id')
    
    if not teacher_id:
        return jsonify({'error': 'Teacher ID is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get teacher profile ID
        cursor.execute('SELECT id FROM teacher_profiles WHERE user_id = ?', (teacher_id,))
        teacher_profile = cursor.fetchone()
        
        if not teacher_profile:
            conn.close()
            return jsonify({'error': 'Teacher profile not found'}), 404
        
        teacher_profile_id = teacher_profile['id']
        
        # Get count of pending requests
        cursor.execute('''
            SELECT COUNT(*) as pending_count 
            FROM attendance_requests 
            WHERE teacher_id = ? AND status = 'pending'
        ''', (teacher_profile_id,))
        
        result = cursor.fetchone()
        return jsonify({'pending_requests': result['pending_count']})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
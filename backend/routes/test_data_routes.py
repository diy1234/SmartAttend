# routes/test_data_routes.py
from flask import Blueprint, request, jsonify
from models.database import get_db_connection

test_data_bp = Blueprint('test_data', __name__)

@test_data_bp.route('/test/create-sample-requests', methods=['POST'])
def create_sample_requests():
    """Create sample attendance requests for testing"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('SELECT id FROM teacher_profiles LIMIT 1')
        teacher = cursor.fetchone()
        
        cursor.execute('SELECT id FROM students LIMIT 3')
        students = cursor.fetchall()
        
        if not teacher or not students:
            return jsonify({'error': 'No teachers or students found'}), 404
        
        teacher_id = teacher['id']
        
        sample_requests = [
            {
                'student_id': students[0]['id'],
                'teacher_id': teacher_id,
                'department': 'Computer Science',
                'subject': 'Data Structures',
                'request_date': '2024-01-15',
                'reason': 'Medical appointment',
                'status': 'pending'
            },
            {
                'student_id': students[1]['id'] if len(students) > 1 else students[0]['id'],
                'teacher_id': teacher_id,
                'department': 'Computer Science', 
                'subject': 'Web Development',
                'request_date': '2024-01-16',
                'reason': 'Family emergency',
                'status': 'pending'
            },
            {
                'student_id': students[2]['id'] if len(students) > 2 else students[0]['id'],
                'teacher_id': teacher_id,
                'department': 'Computer Science',
                'subject': 'Database Systems',
                'request_date': '2024-01-17',
                'reason': 'Transportation issues',
                'status': 'pending'
            }
        ]
        
        created_count = 0
        for request_data in sample_requests:
            cursor.execute('''
                SELECT id FROM attendance_requests 
                WHERE student_id = ? AND teacher_id = ? AND request_date = ? AND subject = ?
            ''', (request_data['student_id'], request_data['teacher_id'], request_data['request_date'], request_data['subject']))
            
            if not cursor.fetchone():
                cursor.execute('''
                    INSERT INTO attendance_requests 
                    (student_id, teacher_id, department, subject, request_date, reason, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    request_data['student_id'],
                    request_data['teacher_id'], 
                    request_data['department'],
                    request_data['subject'],
                    request_data['request_date'],
                    request_data['reason'],
                    request_data['status']
                ))
                
                request_id = cursor.lastrowid
                
                try:
                    cursor.execute('SELECT user_id FROM teacher_profiles WHERE id = ?', (request_data['teacher_id'],))
                    teacher_user = cursor.fetchone()
                    
                    cursor.execute('''
                        SELECT u.name 
                        FROM students s 
                        JOIN users u ON s.user_id = u.id 
                        WHERE s.id = ?
                    ''', (request_data['student_id'],))
                    student_info = cursor.fetchone()
                    student_name = student_info['name'] if student_info else 'Student'
                    
                    if teacher_user:
                        teacher_user_id = teacher_user['user_id']
                        notification_title = "New Attendance Request"
                        notification_message = f"{student_name} from {request_data['department']} - {request_data['subject']} requests attendance for {request_data['request_date']}"
                        
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
                
                created_count += 1
        
        conn.commit()
        
        return jsonify({
            'message': f'Created {created_count} sample attendance requests',
            'teacher_id': teacher_id,
            'sample_data': sample_requests
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@test_data_bp.route('/test/create-sample-schedules', methods=['POST'])
def create_sample_schedules():
    """Create sample class schedules with notifications for testing"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('SELECT id, user_id FROM teacher_profiles LIMIT 1')
        teacher = cursor.fetchone()
        
        cursor.execute('SELECT id, name FROM departments WHERE name = "Computer Science"')
        department = cursor.fetchone()
        
        cursor.execute('SELECT id, name FROM subjects WHERE name IN ("Data Structures", "Web Development", "Database Systems")')
        subjects = cursor.fetchall()
        
        if not teacher or not department or not subjects:
            return jsonify({'error': 'Required data not found'}), 404
        
        teacher_id = teacher['id']
        teacher_user_id = teacher['user_id']
        department_id = department['id']
        
        sample_schedules = [
            {
                'teacher_id': teacher_id,
                'department_id': department_id,
                'subject_id': subjects[0]['id'] if len(subjects) > 0 else 1,
                'day_of_week': 'Monday',
                'start_time': '10:00',
                'end_time': '11:00',
                'room_number': 'Room 101',
                'created_by': 1
            },
            {
                'teacher_id': teacher_id,
                'department_id': department_id,
                'subject_id': subjects[1]['id'] if len(subjects) > 1 else 2,
                'day_of_week': 'Wednesday',
                'start_time': '14:00',
                'end_time': '15:30',
                'room_number': 'Lab 201',
                'created_by': 1
            },
            {
                'teacher_id': teacher_id,
                'department_id': department_id,
                'subject_id': subjects[2]['id'] if len(subjects) > 2 else 3,
                'day_of_week': 'Friday',
                'start_time': '11:00',
                'end_time': '12:30',
                'room_number': 'Room 102',
                'created_by': 1
            }
        ]
        
        created_count = 0
        created_schedules = []
        
        for schedule_data in sample_schedules:
            cursor.execute('''
                SELECT id FROM class_schedules 
                WHERE teacher_id = ? AND department_id = ? AND subject_id = ? AND day_of_week = ? AND start_time = ?
            ''', (
                schedule_data['teacher_id'],
                schedule_data['department_id'],
                schedule_data['subject_id'],
                schedule_data['day_of_week'],
                schedule_data['start_time']
            ))
            
            if not cursor.fetchone():
                cursor.execute('''
                    INSERT INTO class_schedules 
                    (teacher_id, department_id, subject_id, day_of_week, start_time, end_time, room_number, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    schedule_data['teacher_id'],
                    schedule_data['department_id'],
                    schedule_data['subject_id'],
                    schedule_data['day_of_week'],
                    schedule_data['start_time'],
                    schedule_data['end_time'],
                    schedule_data['room_number'],
                    schedule_data['created_by']
                ))
                
                schedule_id = cursor.lastrowid
                
                subject_name = "Unknown Subject"
                for subject in subjects:
                    if subject['id'] == schedule_data['subject_id']:
                        subject_name = subject['name']
                        break
                
                notification_title = "New Class Scheduled"
                notification_message = f"Class scheduled for {schedule_data['day_of_week']} at {schedule_data['start_time']} - {subject_name} (Computer Science)"
                
                cursor.execute('''
                    INSERT INTO notifications 
                    (user_id, title, message, type, related_id, is_read)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    teacher_user_id,
                    notification_title,
                    notification_message,
                    'class_scheduled',
                    schedule_id,
                    False
                ))
                
                created_count += 1
                created_schedules.append({
                    'schedule_id': schedule_id,
                    'subject': subject_name,
                    'day': schedule_data['day_of_week'],
                    'time': f"{schedule_data['start_time']} - {schedule_data['end_time']}"
                })
        
        conn.commit()
        
        return jsonify({
            'message': f'Created {created_count} sample class schedules with notifications',
            'teacher_user_id': teacher_user_id,
            'created_schedules': created_schedules
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@test_data_bp.route('/test/teacher-info', methods=['GET'])
def get_teacher_info():
    """Test route to get teacher profile ID for testing"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT tp.id as profile_id, tp.user_id, u.name, u.email, tp.faculty_id
        FROM teacher_profiles tp
        JOIN users u ON tp.user_id = u.id
        LIMIT 1
    ''')
    
    teacher = cursor.fetchone()
    conn.close()
    
    if teacher:
        return jsonify({
            'teacher_profile_id': teacher['profile_id'],
            'user_id': teacher['user_id'],
            'name': teacher['name'],
            'email': teacher['email'],
            'faculty_id': teacher['faculty_id'],
            'message': 'Use this teacher_profile_id for testing API endpoints'
        })
    else:
        return jsonify({'error': 'No teacher profiles found'}), 404
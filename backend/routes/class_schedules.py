from flask import Blueprint, request, jsonify
from models.database import get_db_connection
from services.notification_service import NotificationService

class_schedules_bp = Blueprint('class_schedules', __name__)


@class_schedules_bp.route('/schedules/publish', methods=['POST'])
def publish_schedule_to_teacher():
    """Publish a set of schedule entries to a teacher dashboard and send notifications
    Expected JSON: { teacher_email: str, entries: [{ day, dept, subject, time }] }
    This endpoint will create a class_scheduled notification for the teacher (does not create schedule rows).
    """
    data = request.get_json() or {}
    teacher_email = data.get('teacher_email')
    entries = data.get('entries', [])

    if not teacher_email or not isinstance(entries, list) or len(entries) == 0:
        return jsonify({'error': 'teacher_email and non-empty entries are required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # find teacher user id
        cursor.execute('SELECT id, name FROM users WHERE email = ?', (teacher_email,))
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'Teacher not found'}), 404

        teacher_id = user['id']

        created_notifications = 0
        for en in entries:
            # parse time if present (format like 'HH:MM - HH:MM')
            time_str = en.get('time') or ''
            start_time = None
            if isinstance(time_str, str) and '-' in time_str:
                start_time = time_str.split('-')[0].strip()

            class_schedule_data = {
                'day_of_week': en.get('day') or en.get('day_of_week') or '',
                'start_time': start_time or (en.get('start_time') or ''),
                'subject_name': en.get('subject') or en.get('subject_name') or '',
                'department': en.get('dept') or en.get('department') or ''
            }

            NotificationService.notify_class_scheduled(teacher_id=teacher_id, class_schedule_data=class_schedule_data)
            created_notifications += 1

        return jsonify({'message': f'Published {created_notifications} schedule notifications to teacher'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@class_schedules_bp.route('/schedules', methods=['GET'])
def get_all_schedules():
    """Get all class schedules"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT 
                cs.id,
                cs.day_of_week,
                cs.start_time,
                cs.end_time,
                cs.room_number,
                u.name as teacher_name,
                u.email as teacher_email,
                d.name as department_name,
                s.name as subject_name,
                admin.name as created_by_name
            FROM class_schedules cs
            JOIN users u ON cs.teacher_id = u.id
            JOIN departments d ON cs.department_id = d.id
            JOIN subjects s ON cs.subject_id = s.id
            JOIN users admin ON cs.created_by = admin.id
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
        ''')
        
        schedules = cursor.fetchall()
        result = []
        for schedule in schedules:
            result.append(dict(schedule))
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@class_schedules_bp.route('/schedules', methods=['POST'])
def create_schedule():
    """Create a new class schedule (Admin only)"""
    data = request.json
    
    required_fields = ['teacher_id', 'department_id', 'subject_id', 'day_of_week', 'start_time', 'end_time', 'created_by']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if teacher exists and is actually a teacher
        cursor.execute('SELECT role FROM users WHERE id = ?', (data['teacher_id'],))
        teacher = cursor.fetchone()
        if not teacher or teacher['role'] != 'teacher':
            return jsonify({'error': 'Invalid teacher ID or user is not a teacher'}), 400
        
        # Check for schedule conflicts
        cursor.execute('''
            SELECT id FROM class_schedules 
            WHERE teacher_id = ? AND day_of_week = ? AND (
                (start_time <= ? AND end_time > ?) OR
                (start_time < ? AND end_time >= ?) OR
                (start_time >= ? AND end_time <= ?)
            )
        ''', (
            data['teacher_id'], data['day_of_week'],
            data['start_time'], data['start_time'],
            data['end_time'], data['end_time'],
            data['start_time'], data['end_time']
        ))
        
        conflict = cursor.fetchone()
        if conflict:
            return jsonify({'error': 'Schedule conflict: Teacher already has a class at this time'}), 400
        
        # Insert new schedule
        cursor.execute('''
            INSERT INTO class_schedules 
            (teacher_id, department_id, subject_id, day_of_week, start_time, end_time, room_number, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['teacher_id'],
            data['department_id'],
            data['subject_id'],
            data['day_of_week'],
            data['start_time'],
            data['end_time'],
            data.get('room_number'),
            data['created_by']
        ))
        
        conn.commit()
        schedule_id = cursor.lastrowid
        
        # Return the created schedule with details
        cursor.execute('''
            SELECT 
                cs.id,
                cs.day_of_week,
                cs.start_time,
                cs.end_time,
                cs.room_number,
                u.name as teacher_name,
                u.email as teacher_email,
                d.name as department_name,
                s.name as subject_name
            FROM class_schedules cs
            JOIN users u ON cs.teacher_id = u.id
            JOIN departments d ON cs.department_id = d.id
            JOIN subjects s ON cs.subject_id = s.id
            WHERE cs.id = ?
        ''', (schedule_id,))
        
        new_schedule = cursor.fetchone()
        schedule_dict = dict(new_schedule)
        
        # 🔔 Send notification to teacher about new class schedule
        NotificationService.notify_class_scheduled(
            teacher_id=data['teacher_id'],
            class_schedule_data=schedule_dict
        )
        
        return jsonify(schedule_dict), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@class_schedules_bp.route('/schedules/<int:schedule_id>', methods=['PUT'])
def update_schedule(schedule_id):
    """Update a class schedule (Admin only)"""
    data = request.json
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if schedule exists
        cursor.execute('SELECT * FROM class_schedules WHERE id = ?', (schedule_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Schedule not found'}), 404
        
        # Update schedule
        cursor.execute('''
            UPDATE class_schedules SET
                teacher_id = COALESCE(?, teacher_id),
                department_id = COALESCE(?, department_id),
                subject_id = COALESCE(?, subject_id),
                day_of_week = COALESCE(?, day_of_week),
                start_time = COALESCE(?, start_time),
                end_time = COALESCE(?, end_time),
                room_number = COALESCE(?, room_number)
            WHERE id = ?
        ''', (
            data.get('teacher_id'),
            data.get('department_id'),
            data.get('subject_id'),
            data.get('day_of_week'),
            data.get('start_time'),
            data.get('end_time'),
            data.get('room_number'),
            schedule_id
        ))
        
        conn.commit()
        return jsonify({'message': 'Schedule updated successfully'})
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@class_schedules_bp.route('/schedules/<int:schedule_id>', methods=['DELETE'])
def delete_schedule(schedule_id):
    """Delete a class schedule (Admin only)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('DELETE FROM class_schedules WHERE id = ?', (schedule_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Schedule not found'}), 404
            
        return jsonify({'message': 'Schedule deleted successfully'})
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@class_schedules_bp.route('/schedules/teacher/<int:teacher_id>', methods=['GET'])
def get_teacher_schedule(teacher_id):
    """Get schedule for a specific teacher"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT 
                cs.id,
                cs.day_of_week,
                cs.start_time,
                cs.end_time,
                cs.room_number,
                d.name as department_name,
                s.name as subject_name
            FROM class_schedules cs
            JOIN departments d ON cs.department_id = d.id
            JOIN subjects s ON cs.subject_id = s.id
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
        ''', (teacher_id,))
        
        schedules = cursor.fetchall()
        result = [dict(schedule) for schedule in schedules]
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@class_schedules_bp.route('/departments', methods=['GET'])
def get_departments():
    """Get all departments"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('SELECT * FROM departments ORDER BY name')
        departments = cursor.fetchall()
        return jsonify([dict(dept) for dept in departments])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@class_schedules_bp.route('/subjects', methods=['GET'])
def get_subjects():
    """Get all subjects or subjects by department"""
    department_id = request.args.get('department_id')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        if department_id:
            cursor.execute('''
                SELECT s.*, d.name as department_name 
                FROM subjects s 
                JOIN departments d ON s.department_id = d.id 
                WHERE s.department_id = ? 
                ORDER BY s.name
            ''', (department_id,))
        else:
            cursor.execute('''
                SELECT s.*, d.name as department_name 
                FROM subjects s 
                JOIN departments d ON s.department_id = d.id 
                ORDER BY d.name, s.name
            ''')
        
        subjects = cursor.fetchall()
        return jsonify([dict(subject) for subject in subjects])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@class_schedules_bp.route('/teachers', methods=['GET'])
def get_teachers():
    """Get all teachers"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT u.id, u.name, u.email, f.department 
            FROM users u 
            LEFT JOIN faculty f ON u.id = f.user_id 
            WHERE u.role = 'teacher' 
            ORDER BY u.name
        ''')
        
        teachers = cursor.fetchall()
        return jsonify([dict(teacher) for teacher in teachers])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
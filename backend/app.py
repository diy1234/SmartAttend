from flask import Flask, jsonify
from flask_cors import CORS
from flask_mail import Mail, Message
from config import Config
from models.database import init_db

# Import blueprints
from routes.auth import auth_bp
from routes.users import users_bp
from routes.classes import classes_bp
from routes.attendance import attendance_bp
from routes.teacher_profiles import teacher_profiles_bp
from routes.class_schedules import class_schedules_bp
from routes.attendance_requests import attendance_requests_bp
from routes.notifications import notifications_bp
from routes.teacher_dashboard import teacher_dashboard_bp
from routes.admin_dashboard import admin_bp
from routes.student_routes import student_bp

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

# Initialize Flask-Mail
mail = Mail(app)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(users_bp, url_prefix='/api/users')
app.register_blueprint(classes_bp, url_prefix='/api/classes')
app.register_blueprint(attendance_bp, url_prefix='/api/attendance')
app.register_blueprint(teacher_profiles_bp, url_prefix='/api/teachers')
app.register_blueprint(class_schedules_bp, url_prefix='/api/schedules')
app.register_blueprint(attendance_requests_bp, url_prefix='/api/attendance-requests')
app.register_blueprint(notifications_bp, url_prefix='/api')
app.register_blueprint(teacher_dashboard_bp, url_prefix='/api/teacher-dashboard')
app.register_blueprint(admin_bp, url_prefix='/api')
app.register_blueprint(student_bp, url_prefix='/api/student')

@app.route('/')
def api_info():
    return jsonify({
        'message': 'SmartAttend Backend API',
        'version': '1.0.0',
        'endpoints': {
            'auth': [
                'POST /api/auth/signup',
                'POST /api/auth/login', 
                'POST /api/auth/forgot-password',
                'POST /api/auth/reset-password',
                'POST /api/auth/verify-reset-token'
            ],
            'teacher_dashboard': [
                'GET /api/teacher-dashboard/my-courses?teacher_id={id}',
                'GET /api/teacher-dashboard/stats?teacher_id={id}',
                'GET /api/teacher-dashboard/weekly-schedule?teacher_id={id}',
                'GET /api/teacher-dashboard/pending-requests?teacher_id={id}',
                'GET /api/teacher-dashboard/course-students/{class_id}',
                'GET /api/teacher-dashboard/course-attendance/{class_id}',
                'GET /api/teacher-dashboard/attendance-summary/{class_id}',
                'POST /api/teacher-dashboard/mark-attendance',
                'POST /api/teacher-dashboard/update-request-status'
            ],
            'users': ['GET /api/users/profile'],
            'classes': ['GET /api/classes', 'POST /api/classes'],
            'attendance': ['POST /api/attendance', 'GET /api/attendance'],
            'teachers': ['GET /api/teachers/profile', 'POST /api/teachers/profile']
        }
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'SmartAttend API is running',
        'database': 'connected'
    })

# New endpoint to get teacher profile by user ID
@app.route('/api/teachers/profile-by-user/<int:user_id>', methods=['GET'])
def get_teacher_profile_by_user(user_id):
    """Get teacher profile by user ID"""
    from models.database import get_db_connection
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT tp.id as profile_id, tp.user_id, u.name, u.email, tp.faculty_id, tp.department
            FROM teacher_profiles tp
            JOIN users u ON tp.user_id = u.id
            WHERE tp.user_id = ?
        ''', (user_id,))
        
        teacher = cursor.fetchone()
        conn.close()
        
        if teacher:
            return jsonify({
                'teacher_profile_id': teacher['profile_id'],
                'user_id': teacher['user_id'],
                'name': teacher['name'],
                'email': teacher['email'],
                'faculty_id': teacher['faculty_id'],
                'department': teacher['department']
            })
        else:
            return jsonify({'error': 'Teacher profile not found'}), 404
            
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

# Test route to get teacher profile ID
@app.route('/api/test/teacher-info', methods=['GET'])
def get_teacher_info():
    """Test route to get teacher profile ID for testing"""
    from models.database import get_db_connection
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get first teacher profile
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

@app.route('/api/debug/attendance-requests', methods=['GET'])
def debug_attendance_requests():
    """Debug route to check attendance requests data"""
    from models.database import get_db_connection
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get all attendance requests
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
        
        # Get teacher profiles
        cursor.execute('SELECT id, user_id, full_name FROM teacher_profiles')
        teachers = cursor.fetchall()
        
        # Get students
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

@app.route('/api/test/create-sample-requests', methods=['POST'])
def create_sample_requests():
    """Create sample attendance requests for testing"""
    from models.database import get_db_connection
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get a teacher profile ID
        cursor.execute('SELECT id FROM teacher_profiles LIMIT 1')
        teacher = cursor.fetchone()
        
        # Get some student IDs
        cursor.execute('SELECT id FROM students LIMIT 3')
        students = cursor.fetchall()
        
        if not teacher or not students:
            return jsonify({'error': 'No teachers or students found'}), 404
        
        teacher_id = teacher['id']
        
        # Create sample requests with different statuses
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
            # Check if request already exists
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

@app.route('/api/attendance-requests/teacher/<int:teacher_profile_id>', methods=['GET'])
def get_teacher_attendance_requests(teacher_profile_id):
    """Get all attendance requests for a specific teacher"""
    from models.database import get_db_connection
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get all requests for this teacher with student details
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

if __name__ == '__main__':
    init_db()
    print("🚀 SmartAttend Backend Starting...")
    print("📍 API Running on: http://127.0.0.1:5000")
    print("🔑 Default Admin: admin@smartattend.com / admin123")
    print("👨‍🏫 Default Teacher: teacher@smartattend.com / teacher123")
    app.run(debug=Config.DEBUG, port=5000)
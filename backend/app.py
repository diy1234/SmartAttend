import sqlite3
import os
from flask import Flask, jsonify, request 
from flask_cors import CORS
from flask_mail import Mail, Message
from config import Config
from models.database import init_db
# Import face recognition service if available. If OpenCV / numpy are incompatible
# (common on Windows when binary wheels mismatch), fall back to a lightweight stub
# that provides the same interface but returns informative errors or empty results.
try:
    from face_recognition_service import face_service
except Exception as _import_err:
    class _StubFaceService:
        def __init__(self, err=None):
            self.known_faces = {}
            self.is_trained = False
            self._error = err

        def load_known_faces(self):
            return None

        def get_model_status(self):
            return {
                'is_trained': False,
                'error': str(self._error) if self._error else 'face service unavailable'
            }

        def get_service_status(self):
            return {
                'face_count': 0,
                'face_cascade_loaded': False,
                'known_users': []
            }

        def register_face(self, user_id, image_data):
            return {'success': False, 'error': 'Face registration unavailable: face modules not installed.'}

        def recognize_faces(self, image_data):
            return {
                'success': False,
                'recognized_faces': [],
                'total_faces_detected': 0,
                'error': 'Face recognition unavailable: face modules not installed.'
            }

    face_service = _StubFaceService(_import_err)

# Import blueprints
from routes.auth import auth_bp
from routes.users import users_bp
from routes.classes import classes_bp
from routes.attendance import attendance_bp
from routes.teacher_profiles import teacher_profiles_bp
from routes.class_schedules import class_schedules_bp
from routes.attendance_requests import attendance_requests_bp
from routes.attendance_history_routes import attendance_history_bp
from routes.notifications import notifications_bp
from routes.teacher_dashboard import teacher_dashboard_bp
from routes.admin_routes import admin_bp
from routes.departments_routes import departments_bp
from routes.admin_list_routes import admin_list_bp
from routes.student_routes import student_bp
from routes.contact_routes import contact_bp

from routes.teacher_subjects import teacher_subjects_bp
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
app.register_blueprint(attendance_history_bp, url_prefix='/api/attendance-history')
app.register_blueprint(notifications_bp, url_prefix='/api')
app.register_blueprint(teacher_dashboard_bp, url_prefix='/api/teacher-dashboard')
app.register_blueprint(admin_bp, url_prefix='/api')
app.register_blueprint(departments_bp, url_prefix='/api/departments')
app.register_blueprint(admin_list_bp, url_prefix='/api/admin')
app.register_blueprint(student_bp, url_prefix='/api/student')
app.register_blueprint(contact_bp, url_prefix="/api/contact")
app.register_blueprint(teacher_subjects_bp, url_prefix='/api')
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
            'schedules': [
                'POST /api/schedules',
                'POST /api/schedules/bulk',
                'POST /api/test/create-sample-schedules'
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

def get_db_connection():
    """Create and return a database connection"""
    # Get the absolute path to your database file
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, 'attendance.db')
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # This enables name-based access to columns
    return conn

# Face Recognition Routes

@app.route('/api/train-face-model', methods=['POST'])
def train_face_model():
    """Force retrain the face recognition model"""
    try:
        face_service.load_known_faces()
        return jsonify({
            'success': True,
            'message': 'Face recognition model trained successfully',
            'face_count': len(face_service.known_faces),
            'is_trained': face_service.is_trained
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/face-model-status', methods=['GET'])
def get_face_model_status():
    """Get face model training status"""
    try:
        status = face_service.get_model_status()
        return jsonify({
            'success': True,
            'model_status': status
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/debug/recent-attendance', methods=['GET'])
def debug_recent_attendance():
    """Debug endpoint to check recent attendance records"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get recent attendance records (last 10)
        cursor.execute('''
            SELECT a.id, a.student_id, a.class_id, a.attendance_date, a.status, 
                   a.created_at, u.name as student_name, c.subject, c.teacher_id,
                   tp.full_name as teacher_name
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            JOIN users u ON s.user_id = u.id
            JOIN classes c ON a.class_id = c.id
            LEFT JOIN teacher_profiles tp ON c.teacher_id = tp.id
            ORDER BY a.created_at DESC
            LIMIT 10
        ''')
        
        recent_attendance = cursor.fetchall()
        
        conn.close()
        
        return jsonify({
            'recent_attendance': [dict(record) for record in recent_attendance],
            'count': len(recent_attendance),
            'message': 'Most recent attendance records'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/debug/face-data', methods=['GET'])
def debug_face_data():
    """Debug endpoint to check stored face data"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get all face encodings
        cursor.execute('''
            SELECT fe.id, fe.student_id, u.name, s.enrollment_no, fe.created_at
            FROM face_encodings fe
            JOIN students s ON fe.student_id = s.id
            JOIN users u ON s.user_id = u.id
            ORDER BY fe.created_at DESC
        ''')
        
        face_data = cursor.fetchall()

         # Get total counts
        cursor.execute('SELECT COUNT(*) as total FROM face_encodings')
        total_count = cursor.fetchone()['total']
        
        conn.close()
        
        return jsonify({
            'success': True,
            'total_registered_faces': total_count,
            'face_data': [dict(row) for row in face_data],
            'service_known_faces': len(face_service.known_faces),
            'service_status': face_service.get_service_status()
        })
        
    except Exception as e:
        conn.close()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/debug/face-service-status', methods=['GET'])
def debug_face_service_status():
    """Get detailed face service status"""
    try:
        return jsonify({
            'success': True,
            'service_status': face_service.get_service_status(),
            'known_faces_details': [
                {
                    'student_id': student_id,
                    'name': data['name'],
                    'enrollment_no': data['enrollment_no'],
                    'encoding_length': len(data['encoding']) if data['encoding'] is not None else 0
                }
                for student_id, data in face_service.known_faces.items()
            ]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/force-reload-faces', methods=['POST'])
def force_reload_faces():
    """Force reload faces from database"""
    try:
        face_service.load_known_faces()
        return jsonify({
            'success': True,
            'message': 'Faces reloaded successfully',
            'face_count': len(face_service.known_faces)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/register-face', methods=['POST'])
def register_face():
    """Register student face for recognition using user_id"""
    try:
        data = request.get_json()
        
        if not data or 'user_id' not in data or 'image_data' not in data:
            return jsonify({'success': False, 'error': 'User ID and image data are required'}), 400
        
        user_id = data['user_id']
        image_data = data['image_data']
        
        result = face_service.register_face(user_id, image_data)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message']
            })
        else:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 400
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/recognize-faces', methods=['POST'])
def recognize_faces():
    """Recognize faces in an image - UPDATED FOR USER_ID"""
    try:
        print("🎯 Starting /api/recognize-faces route...")
        
        data = request.get_json()
        
        if not data or 'image_data' not in data:
            return jsonify({'success': False, 'error': 'Image data is required'}), 400
        
        image_data = data['image_data']
        class_id = data.get('class_id')
        
        print("🔄 Calling face_service.recognize_faces...")
        result = face_service.recognize_faces(image_data)
        print(f"✅ Face service returned: {result.get('success', False)}")
        
        if not result.get('success', False):
            return jsonify(result), 400
        
        # If class_id is provided, filter recognized students to only those enrolled in the class
        if class_id and 'recognized_faces' in result and result['recognized_faces']:
            print(f"🔍 Filtering for class_id: {class_id}")
            try:
                conn = get_db_connection()
                cursor = conn.cursor()
                
                enrolled_students = []
                for face in result['recognized_faces']:
                    if face.get('student_id'):
                        cursor.execute('''
                            SELECT s.id FROM enrollment e
                            JOIN students s ON e.student_id = s.id
                            WHERE e.class_id = ? AND s.id = ?
                        ''', (class_id, face['student_id']))
                        
                        if cursor.fetchone():
                            # Also skip students who are already marked PRESENT for
                            # this class on today's date to avoid duplicate recognition
                            cursor.execute('''
                                SELECT 1 FROM attendance
                                WHERE student_id = ? AND class_id = ? AND attendance_date = date('now') AND status = 'present'
                                LIMIT 1
                            ''', (face['student_id'], class_id))

                            already_marked = cursor.fetchone()
                            if already_marked:
                                print(f"⏭️ Skipping already marked student {face.get('student_id')} for class {class_id}")
                            else:
                                enrolled_students.append(face)
                        else:
                            print(f"❌ Student {face.get('student_id')} not enrolled in class {class_id}")
                
                conn.close()
                result['recognized_faces'] = enrolled_students
                print(f"✅ Filtered to {len(enrolled_students)} enrolled students")
                
            except Exception as filter_error:
                print(f"⚠️ Error filtering by class: {filter_error}")
        
        print(f"🎉 Sending successful response with {len(result.get('recognized_faces', []))} recognized faces")
        return jsonify(result)
            
    except Exception as e:
        print(f"❌ Error in /api/recognize-faces route: {e}")
        import traceback
        print(f"🔍 Route traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': str(e),
            'recognized_faces': [],
            'total_faces_detected': 0
        }), 500

@app.route('/api/students/course-attendance', methods=['GET'])
def get_students_course_attendance():
    """Get all students with their course-specific attendance"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                u.name as student_name,
                u.email,
                s.enrollment_no,
                s.course,
                COUNT(a.id) as total_classes,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
                CASE 
                    WHEN COUNT(a.id) > 0 THEN 
                        ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(a.id), 2)
                    ELSE 0 
                END as attendance_percentage
            FROM students s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN attendance a ON s.id = a.student_id
            GROUP BY s.id, u.name, u.email, s.enrollment_no, s.course
            ORDER BY s.course, u.name
        ''')
        
        students = cursor.fetchall()
        
        # Get course-wise statistics
        cursor.execute('''
            SELECT 
                s.course,
                COUNT(DISTINCT s.id) as total_students,
                AVG(
                    CASE 
                        WHEN total_classes > 0 THEN 
                            (present_count * 100.0 / total_classes)
                        ELSE 0 
                    END
                ) as avg_attendance_percentage
            FROM students s
            LEFT JOIN (
                SELECT 
                    student_id,
                    COUNT(*) as total_classes,
                    SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count
                FROM attendance 
                GROUP BY student_id
            ) a ON s.id = a.student_id
            GROUP BY s.course
            ORDER BY s.course
        ''')
        
        course_stats = cursor.fetchall()
        
        students_data = []
        for row in students:
            students_data.append({
                'student_name': row['student_name'],
                'email': row['email'],
                'enrollment_no': row['enrollment_no'],
                'course': row['course'],
                'total_classes': row['total_classes'],
                'present_count': row['present_count'],
                'attendance_percentage': row['attendance_percentage']
            })
        
        course_data = []
        for row in course_stats:
            course_data.append({
                'course': row['course'],
                'total_students': row['total_students'],
                'avg_attendance_percentage': round(row['avg_attendance_percentage'], 2)
            })
        
        return jsonify({
            'success': True, 
            'students': students_data,
            'course_stats': course_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/test-face-recognition', methods=['POST'])
def test_face_recognition():
    """Test endpoint to verify face recognition works"""
    try:
        print("🧪 Testing face recognition endpoint...")
        
        # Create a mock response that matches what the frontend expects
        test_response = {
            'success': True,
            'recognized_faces': [
                {
                    'name': 'Student Three',
                    'student_id': 3,
                    'enrollment_no': 'S003',
                    'confidence': 0.99,
                    'distance': 25.75
                }
            ],
            'total_faces_detected': 1,
            'best_match': {
                'name': 'Student Three',
                'student_id': 3,
                'enrollment_no': 'S003',
                'confidence': 0.99,
                'distance': 25.75
            },
            'message': 'Test recognition successful'
        }
        
        print("✅ Sending test response")
        return jsonify(test_response)
        
    except Exception as e:
        print(f"❌ Test endpoint error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/face-registration-status/<int:user_id>', methods=['GET'])
def check_face_registration_status(user_id):
    """Check if a user has registered their face"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        print(f"🔍 Checking face registration for user ID: {user_id}")
        
        cursor.execute('''
            SELECT fe.id, fe.user_id, u.name, s.enrollment_no, s.id as student_id
            FROM face_encodings fe
            JOIN users u ON fe.user_id = u.id
            LEFT JOIN students s ON u.id = s.user_id
            WHERE fe.user_id = ?
        ''', (user_id,))
        
        face_exists = cursor.fetchone()
        
        if face_exists:
            print(f"✅ Face found for user {user_id}: {face_exists['name']}")
        else:
            print(f"❌ No face found for user {user_id}")
        
        return jsonify({
            'success': True,
            'face_registered': face_exists is not None,
            'user_id': user_id,
            'student_id': face_exists['student_id'] if face_exists else None,
            'student_name': face_exists['name'] if face_exists else None,
            'enrollment_no': face_exists['enrollment_no'] if face_exists else None
        })
        
    except Exception as e:
        print(f"❌ Error checking face registration: {e}")
        return jsonify({
            'success': False, 
            'error': str(e),
            'face_registered': False
        }), 500
    finally:
        conn.close()

@app.route('/api/face-stats', methods=['GET'])
def get_face_stats():
    """Get face recognition statistics"""
    return jsonify({
        'success': True,
        'total_registered_faces': face_service.get_face_count(),
        'service_status': 'active'
    })

@app.route('/api/debug/current-student', methods=['GET'])
def debug_current_student():
    """Debug endpoint to check current student data"""
    from flask import request
    
    # Get user ID from query parameter or from auth header
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({'success': False, 'error': 'user_id parameter required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get student data
        cursor.execute('''
            SELECT s.id as student_id, u.id as user_id, u.name, u.email, s.enrollment_no, s.course, s.semester
            FROM students s
            JOIN users u ON s.user_id = u.id
            WHERE u.id = ? OR s.id = ?
        ''', (user_id, user_id))
        
        student = cursor.fetchone()
        
        if student:
            # Check face registration
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

@app.route('/api/debug/attendance-request', methods=['POST'])
def debug_attendance_request():
    """Debug route to check attendance request data"""
    from flask import request  # Import request
    
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

@app.route('/api/debug/notifications', methods=['GET'])
def debug_notifications():
    """Debug route to check all notifications"""
    from models.database import get_db_connection
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get all notifications
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
        
        # Get all teachers and their user IDs
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
                
                request_id = cursor.lastrowid
                
                # CREATE NOTIFICATION FOR THE TEACHER
                try:
                    # Get teacher's user_id from teacher_profiles
                    cursor.execute('SELECT user_id FROM teacher_profiles WHERE id = ?', (request_data['teacher_id'],))
                    teacher_user = cursor.fetchone()
                    
                    # Get student name for notification
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
                    # Don't fail the whole request if notification fails
                
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

# Add these routes to your app.py

@app.route('/api/attendance/student/<int:student_id>', methods=['GET'])
def get_student_attendance(student_id):
    """Get attendance records for a specific student"""
    from models.database import get_db_connection
    
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

@app.route('/api/attendance-requests', methods=['POST'])
def create_attendance_request():
    """Create a new attendance request"""
    from models.database import get_db_connection
    from flask import request  # Import request here as well
    
    print("📨 Received attendance request")
    
    try:
        data = request.get_json()
        print(f"📝 Creating attendance request with data: {data}")
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Validate required fields
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
        
        # Check if student exists
        cursor.execute('SELECT id FROM students WHERE id = ?', (data['student_id'],))
        student = cursor.fetchone()
        
        if not student:
            conn.close()
            return jsonify({'success': False, 'error': 'Student not found'}), 404
        
        # Check if teacher exists
        cursor.execute('SELECT id FROM teacher_profiles WHERE id = ?', (data['teacher_id'],))
        teacher = cursor.fetchone()
        
        if not teacher:
            conn.close()
            return jsonify({'success': False, 'error': 'Teacher not found'}), 404
        
        # Get student name for notification
        cursor.execute('''
            SELECT u.name 
            FROM students s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.id = ?
        ''', (data['student_id'],))
        student_info = cursor.fetchone()
        student_name = student_info['name'] if student_info else 'Student'
        
        # Check if request already exists for same student, date, and subject
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
        
        # Insert new request
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
        
        # CREATE NOTIFICATION FOR THE TEACHER
        try:
            # Get teacher's user_id from teacher_profiles
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
            # Don't fail the whole request if notification fails
        
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

@app.route('/api/attendance-requests/student/<int:student_id>', methods=['GET'])
def get_student_attendance_requests(student_id):
    """Get all attendance requests for a specific student"""
    from models.database import get_db_connection
    
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

@app.route('/api/student/enrolled-classes/<int:student_id>', methods=['GET'])
def get_student_enrolled_classes(student_id):
    """Get all classes a student is enrolled in"""
    from models.database import get_db_connection
    
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

# Class Schedule Routes with Notifications

@app.route('/api/schedules', methods=['POST'])
def create_class_schedule():
    """Create a new class schedule with notification"""
    from models.database import get_db_connection
    
    try:
        data = request.get_json()
        print(f"📅 Creating class schedule with data: {data}")
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['teacher_id', 'department_id', 'subject_id', 'day_of_week', 'start_time', 'end_time', 'created_by']
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
        
        # Check if teacher exists
        cursor.execute('SELECT id, user_id FROM teacher_profiles WHERE id = ?', (data['teacher_id'],))
        teacher = cursor.fetchone()
        
        if not teacher:
            conn.close()
            return jsonify({'success': False, 'error': 'Teacher not found'}), 404
        
        # Check if department exists
        cursor.execute('SELECT name FROM departments WHERE id = ?', (data['department_id'],))
        department = cursor.fetchone()
        
        if not department:
            conn.close()
            return jsonify({'success': False, 'error': 'Department not found'}), 404
        
        # Check if subject exists
        cursor.execute('SELECT name FROM subjects WHERE id = ?', (data['subject_id'],))
        subject = cursor.fetchone()
        
        if not subject:
            conn.close()
            return jsonify({'success': False, 'error': 'Subject not found'}), 404
        
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
            data.get('room_number', ''),
            data['created_by']
        ))
        
        schedule_id = cursor.lastrowid
        
        # CREATE NOTIFICATION FOR THE TEACHER
        try:
            teacher_user_id = teacher['user_id']
            department_name = department['name']
            subject_name = subject['name']
            
            notification_title = "New Class Scheduled"
            notification_message = f"Class scheduled for {data['day_of_week']} at {data['start_time']} - {subject_name} ({department_name})"
            
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
            print(f"✅ Class schedule notification created for teacher user_id: {teacher_user_id}")
        except Exception as notification_error:
            print(f"⚠️ Failed to create class schedule notification: {notification_error}")
            # Don't fail the whole request if notification fails
        
        conn.commit()
        conn.close()
        
        print(f"✅ Class schedule created successfully with ID: {schedule_id}")
        
        return jsonify({
            'success': True,
            'message': 'Class schedule created successfully',
            'schedule_id': schedule_id
        })
        
    except Exception as e:
        print(f"❌ Error creating class schedule: {e}")
        import traceback
        print(f"🔍 Full traceback: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/schedules/bulk', methods=['POST'])
def create_bulk_class_schedules():
    """Create multiple class schedules with notifications"""
    from models.database import get_db_connection
    
    try:
        data = request.get_json()
        print(f"📅 Creating bulk class schedules with data: {data}")
        
        if not data or 'schedules' not in data:
            return jsonify({'success': False, 'error': 'No schedules data provided'}), 400
        
        schedules = data['schedules']
        if not isinstance(schedules, list) or len(schedules) == 0:
            return jsonify({'success': False, 'error': 'Schedules must be a non-empty list'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        created_schedules = []
        errors = []
        
        for schedule_data in schedules:
            try:
                # Validate required fields for each schedule
                required_fields = ['teacher_id', 'department_id', 'subject_id', 'day_of_week', 'start_time', 'end_time', 'created_by']
                missing_fields = []
                for field in required_fields:
                    if field not in schedule_data or not schedule_data[field]:
                        missing_fields.append(field)
                
                if missing_fields:
                    errors.append(f"Schedule missing fields: {', '.join(missing_fields)}")
                    continue
                
                # Check if teacher exists
                cursor.execute('SELECT id, user_id FROM teacher_profiles WHERE id = ?', (schedule_data['teacher_id'],))
                teacher = cursor.fetchone()
                
                if not teacher:
                    errors.append(f"Teacher not found for ID: {schedule_data['teacher_id']}")
                    continue
                
                # Check if department exists
                cursor.execute('SELECT name FROM departments WHERE id = ?', (schedule_data['department_id'],))
                department = cursor.fetchone()
                
                if not department:
                    errors.append(f"Department not found for ID: {schedule_data['department_id']}")
                    continue
                
                # Check if subject exists
                cursor.execute('SELECT name FROM subjects WHERE id = ?', (schedule_data['subject_id'],))
                subject = cursor.fetchone()
                
                if not subject:
                    errors.append(f"Subject not found for ID: {schedule_data['subject_id']}")
                    continue
                
                # Insert new schedule
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
                    schedule_data.get('room_number', ''),
                    schedule_data['created_by']
                ))
                
                schedule_id = cursor.lastrowid
                
                # CREATE NOTIFICATION FOR THE TEACHER
                try:
                    teacher_user_id = teacher['user_id']
                    department_name = department['name']
                    subject_name = subject['name']
                    
                    notification_title = "New Class Scheduled"
                    notification_message = f"Class scheduled for {schedule_data['day_of_week']} at {schedule_data['start_time']} - {subject_name} ({department_name})"
                    
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
                    print(f"✅ Class schedule notification created for teacher user_id: {teacher_user_id}")
                except Exception as notification_error:
                    print(f"⚠️ Failed to create class schedule notification: {notification_error}")
                    # Don't fail the whole request if notification fails
                
                created_schedules.append({
                    'schedule_id': schedule_id,
                    'teacher_id': schedule_data['teacher_id'],
                    'subject': subject_name,
                    'department': department_name,
                    'day': schedule_data['day_of_week'],
                    'time': f"{schedule_data['start_time']} - {schedule_data['end_time']}"
                })
                
            except Exception as e:
                errors.append(f"Error creating schedule: {str(e)}")
                continue
        
        conn.commit()
        conn.close()
        
        response = {
            'success': True,
            'message': f'Created {len(created_schedules)} class schedules',
            'created_schedules': created_schedules,
            'total_created': len(created_schedules)
        }
        
        if errors:
            response['errors'] = errors
            response['message'] = f'Created {len(created_schedules)} schedules with {len(errors)} errors'
        
        return jsonify(response)
        
    except Exception as e:
        print(f"❌ Error creating bulk class schedules: {e}")
        import traceback
        print(f"🔍 Full traceback: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/test/create-sample-schedules', methods=['POST'])
def create_sample_schedules():
    """Create sample class schedules with notifications for testing"""
    from models.database import get_db_connection
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get a teacher profile ID
        cursor.execute('SELECT id, user_id FROM teacher_profiles LIMIT 1')
        teacher = cursor.fetchone()
        
        # Get department and subject IDs
        cursor.execute('SELECT id, name FROM departments WHERE name = "Computer Science"')
        department = cursor.fetchone()
        
        cursor.execute('SELECT id, name FROM subjects WHERE name IN ("Data Structures", "Web Development", "Database Systems")')
        subjects = cursor.fetchall()
        
        if not teacher or not department or not subjects:
            return jsonify({'error': 'Required data not found'}), 404
        
        teacher_id = teacher['id']
        teacher_user_id = teacher['user_id']
        department_id = department['id']
        
        # Create sample schedules
        sample_schedules = [
            {
                'teacher_id': teacher_id,
                'department_id': department_id,
                'subject_id': subjects[0]['id'] if len(subjects) > 0 else 1,
                'day_of_week': 'Monday',
                'start_time': '10:00',
                'end_time': '11:00',
                'room_number': 'Room 101',
                'created_by': 1  # Assuming admin user ID 1
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
            # Check if schedule already exists
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
                # Insert schedule
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
                
                # Get subject name for notification
                subject_name = "Unknown Subject"
                for subject in subjects:
                    if subject['id'] == schedule_data['subject_id']:
                        subject_name = subject['name']
                        break
                
                # CREATE NOTIFICATION
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

if __name__ == '__main__':
    init_db()
    print("🚀 SmartAttend Backend Starting...")
    print("📍 API Running on: http://127.0.0.1:5000")
    print("🔑 Default Admin: admin@smartattend.com / admin123")
    print("👨‍🏫 Default Teacher: teacher@smartattend.com / teacher123")
    app.run(debug=Config.DEBUG, port=5000)
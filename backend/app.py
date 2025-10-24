from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import os
import hashlib
import json
from datetime import datetime
from routes.attendance import attendance_bp
from routes.auth import auth_bp
from routes.classes import classes_bp
from routes.faculty import faculty_bp
from routes.students import students_bp
from password_reset import (
    create_and_send_reset_link, verify_token, cleanup_expired_tokens
)

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

# Add secret key for token generation
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

# Remove Flask-Mail initialization since we're using console output

app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(attendance_bp, url_prefix='/api')
app.register_blueprint(classes_bp, url_prefix='/api')
app.register_blueprint(faculty_bp, url_prefix='/api')
app.register_blueprint(students_bp, url_prefix='/api')

# Utility functions
def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

def parse_face_encoding(encoding_str):
    """Parse face encoding from string to Python list"""
    try:
        if encoding_str:
            return json.loads(encoding_str)
        return None
    except:
        return None

def serialize_face_encoding(encoding_array):
    """Serialize array to string for SQLite storage"""
    if encoding_array is not None:
        return json.dumps(encoding_array)
    return None

def init_face_encoding_table():
    """Initialize the face_encodings table in SQLite"""
    conn = sqlite3.connect('smartattend.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS face_encodings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            encoding TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    conn.close()
    print("Face encodings table initialized!")

def save_face_encoding(student_id, encoding_array):
    """Save face encoding to database"""
    try:
        encoding_str = serialize_face_encoding(encoding_array)
        if encoding_str:
            conn = sqlite3.connect('smartattend.db')
            cursor = conn.cursor()
            
            # Check if encoding already exists for student
            cursor.execute(
                "SELECT id FROM face_encodings WHERE student_id = ?",
                (student_id,)
            )
            existing = cursor.fetchone()
            
            if existing:
                # Update existing encoding
                cursor.execute(
                    "UPDATE face_encodings SET encoding = ?, created_at = CURRENT_TIMESTAMP WHERE student_id = ?",
                    (encoding_str, student_id)
                )
            else:
                # Insert new encoding
                cursor.execute(
                    "INSERT INTO face_encodings (student_id, encoding) VALUES (?, ?)",
                    (student_id, encoding_str)
                )
            
            conn.commit()
            conn.close()
            return True
        return False
    except Exception as e:
        print(f"Error saving face encoding: {e}")
        return False

def get_face_encoding(student_id):
    """Get face encoding for a student"""
    try:
        conn = sqlite3.connect('smartattend.db')
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT encoding FROM face_encodings WHERE student_id = ?",
            (student_id,)
        )
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return parse_face_encoding(result[0])
        return None
    except Exception as e:
        print(f"Error getting face encoding: {e}")
        return None

def get_all_face_encodings():
    """Get all face encodings with student info"""
    try:
        conn = sqlite3.connect('smartattend.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT fe.student_id, s.student_name, s.enrollment_no, fe.encoding
            FROM face_encodings fe
            JOIN students s ON fe.student_id = s.id
        ''')
        
        results = cursor.fetchall()
        conn.close()
        
        encodings = []
        for student_id, student_name, enrollment_no, encoding_str in results:
            encoding = parse_face_encoding(encoding_str)
            if encoding:
                encodings.append({
                    'student_id': student_id,
                    'student_name': student_name,
                    'enrollment_no': enrollment_no,
                    'encoding': encoding
                })
        
        return encodings
    except Exception as e:
        print(f"Error getting all face encodings: {e}")
        return []

# Simple database setup (SQLite)
def init_db():
    if not os.path.exists('smartattend.db'):
        conn = sqlite3.connect('smartattend.db')
        cursor = conn.cursor()
        
        # Create users table
        cursor.execute('''
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'student',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create students table
        cursor.execute('''
            CREATE TABLE students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                student_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                enrollment_no TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Create faculty table
        cursor.execute('''
            CREATE TABLE faculty (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                faculty_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                department TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Create classes table
        cursor.execute('''
            CREATE TABLE classes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                class_name TEXT NOT NULL,
                faculty_id INTEGER NOT NULL,
                schedule TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create enrollment table
        cursor.execute('''
            CREATE TABLE enrollment (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                class_id INTEGER NOT NULL,
                enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students (id),
                FOREIGN KEY (class_id) REFERENCES classes (id),
                UNIQUE (student_id, class_id)
            )
        ''')
        
        # Create attendance table
        cursor.execute('''
            CREATE TABLE attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                class_id INTEGER NOT NULL,
                date DATE NOT NULL,
                status TEXT CHECK(status IN ('present', 'absent', 'late')) NOT NULL DEFAULT 'absent',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students (id),
                FOREIGN KEY (class_id) REFERENCES classes (id),
                UNIQUE (student_id, class_id, date)
            )
        ''')
        
        # Create face_encodings table
        cursor.execute('''
            CREATE TABLE face_encodings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                encoding TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
            )
        ''')
        
        # Create password_reset_tokens table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                token TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                used BOOLEAN DEFAULT FALSE
            )
        ''')
        
        # Insert admin user (password: admin123)
        hashed_pw = hash_password('admin123')
        cursor.execute(
            "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
            ('Admin User', 'admin@smartattend.com', hashed_pw, 'admin')
        )
        
        conn.commit()
        conn.close()
        print("Database created successfully!")
    else:
        # Initialize face encoding table if it doesn't exist
        init_face_encoding_table()
        # Clean up old tokens on startup
    cleanup_expired_tokens()

def get_db():
    conn = sqlite3.connect('smartattend.db')
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password):
    """Simple password hashing using SHA-256 with salt"""
    salt = "smartattend_salt_2024"
    return hashlib.sha256((password + salt).encode()).hexdigest()

def check_password(hashed_password, password):
    """Check if password matches the hash"""
    return hashed_password == hash_password(password)



# Students routes
@app.route('/api/students', methods=['GET'])
def get_students():
    try:
        conn = get_db()
        students = conn.execute('SELECT * FROM students').fetchall()
        conn.close()
        return jsonify({'students': [dict(student) for student in students]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/students/<int:student_id>', methods=['GET'])
def get_student(student_id):
    try:
        conn = get_db()
        student = conn.execute('SELECT * FROM students WHERE id = ?', (student_id,)).fetchone()
        conn.close()
        
        if not student:
            return jsonify({'error': 'Student not found'}), 404
            
        return jsonify({'student': dict(student)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/students/<int:student_id>/attendance', methods=['GET'])
def get_student_attendance(student_id):
    try:
        conn = get_db()
        attendance = conn.execute('''
            SELECT a.*, c.class_name 
            FROM attendance a 
            JOIN classes c ON a.class_id = c.id 
            WHERE a.student_id = ? 
            ORDER BY a.date DESC
        ''', (student_id,)).fetchall()
        conn.close()
        
        return jsonify({'attendance': [dict(record) for record in attendance]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Classes routes
@app.route('/api/classes', methods=['GET'])
def get_classes():
    try:
        conn = get_db()
        classes = conn.execute('''
            SELECT c.*, f.faculty_name 
            FROM classes c 
            LEFT JOIN faculty f ON c.faculty_id = f.id
        ''').fetchall()
        conn.close()
        return jsonify({'classes': [dict(cls) for cls in classes]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/classes', methods=['POST'])
def create_class():
    try:
        data = request.get_json()
        class_name = data.get('class_name')
        faculty_id = data.get('faculty_id')
        schedule = data.get('schedule')

        if not class_name or not faculty_id:
            return jsonify({'error': 'Class name and faculty ID are required'}), 400

        conn = get_db()
        cursor = conn.execute(
            'INSERT INTO classes (class_name, faculty_id, schedule) VALUES (?, ?, ?)',
            (class_name, faculty_id, schedule)
        )
        conn.commit()
        
        class_id = cursor.lastrowid
        new_class = conn.execute('SELECT * FROM classes WHERE id = ?', (class_id,)).fetchone()
        conn.close()
        
        return jsonify({'class': dict(new_class)}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/classes/<int:class_id>/enroll', methods=['POST'])
def enroll_student(class_id):
    try:
        data = request.get_json()
        student_id = data.get('student_id')

        if not student_id:
            return jsonify({'error': 'Student ID is required'}), 400

        conn = get_db()
        
        # Check if already enrolled
        existing = conn.execute(
            'SELECT id FROM enrollment WHERE student_id = ? AND class_id = ?', 
            (student_id, class_id)
        ).fetchone()
        
        if existing:
            conn.close()
            return jsonify({'error': 'Student already enrolled in this class'}), 400
        
        conn.execute(
            'INSERT INTO enrollment (student_id, class_id) VALUES (?, ?)',
            (student_id, class_id)
        )
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Student enrolled successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Attendance routes
@app.route('/api/attendance', methods=['POST'])
def mark_attendance():
    try:
        data = request.get_json()
        student_id = data.get('student_id')
        class_id = data.get('class_id')
        status = data.get('status', 'present')
        date = data.get('date', datetime.now().date())

        if not student_id or not class_id:
            return jsonify({'error': 'Student ID and Class ID are required'}), 400

        conn = get_db()
        
        # Check if attendance already marked for today
        existing = conn.execute('''
            SELECT id FROM attendance 
            WHERE student_id = ? AND class_id = ? AND date = ?
        ''', (student_id, class_id, date)).fetchone()
        
        if existing:
            conn.close()
            return jsonify({'error': 'Attendance already marked for today'}), 400
        
        conn.execute(
            'INSERT INTO attendance (student_id, class_id, date, status) VALUES (?, ?, ?, ?)',
            (student_id, class_id, date, status)
        )
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Attendance marked successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/classes/<int:class_id>/attendance/<date>', methods=['GET'])
def get_class_attendance(class_id, date):
    try:
        conn = get_db()
        attendance = conn.execute('''
            SELECT a.*, s.student_name, s.enrollment_no 
            FROM attendance a 
            JOIN students s ON a.student_id = s.id 
            WHERE a.class_id = ? AND a.date = ?
        ''', (class_id, date)).fetchall()
        conn.close()
        
        return jsonify({'attendance': [dict(record) for record in attendance]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/classes/<int:class_id>/attendance-report', methods=['GET'])
def get_attendance_report(class_id):
    try:
        conn = get_db()
        report = conn.execute('''
            SELECT s.id, s.student_name, s.enrollment_no,
                   COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
                   COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
                   COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
                   COUNT(a.id) as total_days
            FROM enrollment e
            JOIN students s ON e.student_id = s.id
            LEFT JOIN attendance a ON e.student_id = a.student_id AND e.class_id = a.class_id
            WHERE e.class_id = ?
            GROUP BY s.id, s.student_name, s.enrollment_no
        ''', (class_id,)).fetchall()
        conn.close()
        
        return jsonify({'report': [dict(record) for record in report]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Face recognition routes
@app.route('/api/face/register', methods=['POST'])
def register_face():
    try:
        data = request.get_json()
        student_id = data.get('student_id')
        encoding = data.get('encoding')  # This should be a list of face encoding values
        
        if not student_id or not encoding:
            return jsonify({'error': 'Student ID and face encoding are required'}), 400
        
        # Verify student exists
        conn = get_db()
        student = conn.execute('SELECT id FROM students WHERE id = ?', (student_id,)).fetchone()
        conn.close()
        
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Save face encoding
        if save_face_encoding(student_id, encoding):
            return jsonify({'message': 'Face encoding registered successfully'}), 201
        else:
            return jsonify({'error': 'Failed to save face encoding'}), 500
            
    except Exception as e:
        print("Error in face registration:", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/api/face/encodings', methods=['GET'])
def get_face_encodings():
    try:
        encodings = get_all_face_encodings()
        return jsonify({'encodings': encodings}), 200
    except Exception as e:
        print("Error getting face encodings:", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/api/face/student/<int:student_id>', methods=['GET'])
def get_student_face_encoding(student_id):
    try:
        encoding = get_face_encoding(student_id)
        if encoding:
            return jsonify({'encoding': encoding}), 200
        else:
            return jsonify({'error': 'Face encoding not found for this student'}), 404
    except Exception as e:
        print("Error getting student face encoding:", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'SmartAttend API is running'})

@app.route('/')
def home():
    # Dynamically build a small map of public endpoints under /api for debugging
    endpoints = {}
    for rule in app.url_map.iter_rules():
        # only include our API routes
        if not rule.rule.startswith('/api'):
            continue
        # Normalize path (hide variable converters)
        path = rule.rule
        # Determine top-level group, e.g. /api/auth -> auth
        parts = path.split('/')
        group = parts[2] if len(parts) > 2 else 'root'
        endpoints.setdefault(group, set()).add(f"{','.join(sorted(rule.methods - set(['HEAD','OPTIONS'])))} {path}")

    # Convert sets to sorted lists
    endpoints = {k: sorted(list(v)) for k, v in endpoints.items()}

    return jsonify({
        'message': 'SmartAttend Backend API',
        'version': '1.0.0',
        'endpoints': endpoints
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("Initializing database...")
    init_db()
    print("Starting Flask server on http://127.0.0.1:5000")
    print("Press Ctrl+C to stop the server")
    # Run without the reloader to avoid double-import/reload inconsistencies
    app.run(debug=False, use_reloader=False, host='127.0.0.1', port=5000)
import json
import sqlite3
from datetime import datetime

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

# SQLite adapter for lists (for face encodings)
def adapt_list(lst):
    return json.dumps(lst)

def convert_list(text):
    return json.loads(text)

# Register the adapter for SQLite
sqlite3.register_adapter(list, adapt_list)
sqlite3.register_converter("LIST", convert_list)

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
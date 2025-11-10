from flask import Blueprint, request, jsonify
from models.database import get_db_connection
import json
import random
import string

teacher_profiles_bp = Blueprint('teacher_profiles', __name__)

def generate_faculty_id(department, user_id):
    """Generate automatic faculty ID based on department and user ID"""
    if not department:
        return f"FAC{user_id:04d}"
    
    # Get department code (first 3 letters uppercase)
    dept_code = department[:3].upper() if len(department) >= 3 else department.upper()
    
    # Generate random suffix
    random_suffix = ''.join(random.choices(string.digits, k=4))
    
    return f"{dept_code}{user_id:03d}{random_suffix}"

@teacher_profiles_bp.route('/profile', methods=['GET'])
def get_teacher_profile():
    """Get teacher profile by user ID"""
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # First, get the teacher profile using the numeric user_id
        cursor.execute('''
            SELECT tp.*, u.email as user_email 
            FROM teacher_profiles tp
            JOIN users u ON tp.user_id = u.id
            WHERE tp.user_id = ?
        ''', (user_id,))
        
        profile = cursor.fetchone()
        
        if profile:
            # Convert social_links from JSON string to list
            profile_dict = dict(profile)
            if profile_dict['social_links']:
                try:
                    profile_dict['social_links'] = json.loads(profile_dict['social_links'])
                except:
                    profile_dict['social_links'] = []
            else:
                profile_dict['social_links'] = []
                
            return jsonify(profile_dict)
        else:
            # Generate faculty ID for new profile
            faculty_id = generate_faculty_id('', user_id)
            
            # Get user email from users table
            cursor.execute('SELECT email FROM users WHERE id = ?', (user_id,))
            user_data = cursor.fetchone()
            user_email = user_data['email'] if user_data else ''
            
            # Return empty profile structure with generated faculty ID
            return jsonify({
                'user_id': int(user_id),
                'faculty_id': faculty_id,
                'full_name': '',
                'email': user_email,  # Use email from users table
                'department': '',
                'designation': 'Assistant Professor',
                'gender': 'Male',
                'contact': '',
                'photo': '',
                'linkedin': '',
                'social_links': [],
                'professional': '',
                'headline': '',
                'about_text': '',
                'domain': ''
            })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@teacher_profiles_bp.route('/profile', methods=['POST', 'PUT'])
def save_teacher_profile():
    """Create or update teacher profile"""
    data = request.json
    
    print(f"📥 Received profile data: {data}")  # Debug log
    
    if not data or 'user_id' not in data:
        return jsonify({'error': 'User ID is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Validate user_id is a valid integer
        try:
            user_id = int(data['user_id'])
        except (ValueError, TypeError):
            return jsonify({'error': 'User ID must be a valid integer'}), 400
        
        # Check if user exists and is a teacher
        cursor.execute('SELECT id, role FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user['role'] != 'teacher':
            return jsonify({'error': 'User is not a teacher'}), 400
        
        # Convert social_links list to JSON string
        social_links = data.get('social_links', [])
        social_links_json = json.dumps(social_links) if social_links else '[]'
        
        # Check if profile already exists
        cursor.execute('SELECT id, faculty_id FROM teacher_profiles WHERE user_id = ?', (user_id,))
        existing_profile = cursor.fetchone()
        
        faculty_id = data.get('faculty_id', '')
        department = data.get('department', '')
        
        # If no faculty ID exists or it's empty, generate a new one
        if not faculty_id:
            if existing_profile and existing_profile['faculty_id']:
                # Keep existing faculty ID
                faculty_id = existing_profile['faculty_id']
            else:
                # Generate new faculty ID
                faculty_id = generate_faculty_id(department, user_id)
        
        if existing_profile:
            # Update existing profile
            cursor.execute('''
                UPDATE teacher_profiles SET
                    faculty_id = ?, full_name = ?, email = ?, department = ?,
                    designation = ?, gender = ?, contact = ?, photo = ?,
                    linkedin = ?, social_links = ?, professional = ?,
                    headline = ?, about_text = ?, domain = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ''', (
                faculty_id,
                data.get('full_name', ''),
                data.get('email', ''),
                department,
                data.get('designation', 'Assistant Professor'),
                data.get('gender', 'Male'),
                data.get('contact', ''),
                data.get('photo', ''),
                data.get('linkedin', ''),
                social_links_json,
                data.get('professional', ''),
                data.get('headline', ''),
                data.get('about_text', ''),
                data.get('domain', ''),
                user_id
            ))
            action = "updated"
        else:
            # Create new profile
            cursor.execute('''
                INSERT INTO teacher_profiles (
                    user_id, faculty_id, full_name, email, department,
                    designation, gender, contact, photo, linkedin,
                    social_links, professional, headline, about_text, domain
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id,
                faculty_id,
                data.get('full_name', ''),
                data.get('email', ''),
                department,
                data.get('designation', 'Assistant Professor'),
                data.get('gender', 'Male'),
                data.get('contact', ''),
                data.get('photo', ''),
                data.get('linkedin', ''),
                social_links_json,
                data.get('professional', ''),
                data.get('headline', ''),
                data.get('about_text', ''),
                data.get('domain', '')
            ))
            action = "created"
        
        conn.commit()
        print(f"✅ Profile {action} successfully for user_id: {user_id}")
        return jsonify({
            'message': f'Profile {action} successfully',
            'faculty_id': faculty_id
        })
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error saving profile: {str(e)}")
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    finally:
        conn.close()

@teacher_profiles_bp.route('/profile/generate-faculty-id', methods=['POST'])
def generate_new_faculty_id():
    """Generate a new faculty ID based on current department"""
    data = request.json
    
    if not data or 'user_id' not in data:
        return jsonify({'error': 'User ID is required'}), 400
    
    try:
        user_id = int(data['user_id'])
    except (ValueError, TypeError):
        return jsonify({'error': 'User ID must be a valid integer'}), 400
    
    department = data.get('department', '')
    
    faculty_id = generate_faculty_id(department, user_id)
    
    return jsonify({
        'faculty_id': faculty_id,
        'message': 'Faculty ID generated successfully'
    })

@teacher_profiles_bp.route('/profile/photo', methods=['POST'])
def update_profile_photo():
    """Update only profile photo"""
    data = request.json
    
    if not data or 'user_id' not in data or 'photo' not in data:
        return jsonify({'error': 'User ID and photo are required'}), 400
    
    try:
        user_id = int(data['user_id'])
    except (ValueError, TypeError):
        return jsonify({'error': 'User ID must be a valid integer'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            UPDATE teacher_profiles 
            SET photo = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE user_id = ?
        ''', (data['photo'], user_id))
        
        conn.commit()
        return jsonify({'message': 'Profile photo updated successfully'})
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@teacher_profiles_bp.route('/debug/user-info', methods=['GET'])
def debug_user_info():
    """Debug endpoint to get user information"""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get user info
        cursor.execute('SELECT id, name, email, role FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get teacher profile info
        cursor.execute('SELECT * FROM teacher_profiles WHERE user_id = ?', (user_id,))
        profile = cursor.fetchone()
        
        return jsonify({
            'user': dict(user) if user else None,
            'profile': dict(profile) if profile else None
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
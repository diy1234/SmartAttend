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
        cursor.execute('''
            SELECT * FROM teacher_profiles 
            WHERE user_id = ?
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
            
            # Return empty profile structure with generated faculty ID
            return jsonify({
                'user_id': int(user_id),
                'faculty_id': faculty_id,
                'full_name': '',
                'email': '',
                'department': '',
                'designation': 'Assistant Professor',
                'gender': 'Male',
                'contact': '',
                'photo': '',
                'linkedin': '',
                'social_links': [],
                'professional': '',
                'headline': '',
                'about_text': ''
            })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@teacher_profiles_bp.route('/profile', methods=['POST', 'PUT'])
def save_teacher_profile():
    """Create or update teacher profile"""
    data = request.json
    
    if not data or 'user_id' not in data:
        return jsonify({'error': 'User ID is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Convert social_links list to JSON string
        social_links = data.get('social_links', [])
        social_links_json = json.dumps(social_links) if social_links else '[]'
        
        # Check if profile already exists
        cursor.execute('SELECT id, faculty_id FROM teacher_profiles WHERE user_id = ?', (data['user_id'],))
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
                faculty_id = generate_faculty_id(department, data['user_id'])
        
        if existing_profile:
            # Update existing profile
            cursor.execute('''
                UPDATE teacher_profiles SET
                    faculty_id = ?, full_name = ?, email = ?, department = ?,
                    designation = ?, gender = ?, contact = ?, photo = ?,
                    linkedin = ?, social_links = ?, professional = ?,
                    headline = ?, about_text = ?, updated_at = CURRENT_TIMESTAMP
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
                data['user_id']
            ))
        else:
            # Create new profile
            cursor.execute('''
                INSERT INTO teacher_profiles (
                    user_id, faculty_id, full_name, email, department,
                    designation, gender, contact, photo, linkedin,
                    social_links, professional, headline, about_text
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data['user_id'],
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
                data.get('about_text', '')
            ))
        
        conn.commit()
        return jsonify({
            'message': 'Profile saved successfully',
            'faculty_id': faculty_id
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@teacher_profiles_bp.route('/profile/generate-faculty-id', methods=['POST'])
def generate_new_faculty_id():
    """Generate a new faculty ID based on current department"""
    data = request.json
    
    if not data or 'user_id' not in data:
        return jsonify({'error': 'User ID is required'}), 400
    
    department = data.get('department', '')
    user_id = data['user_id']
    
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
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            UPDATE teacher_profiles 
            SET photo = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE user_id = ?
        ''', (data['photo'], data['user_id']))
        
        conn.commit()
        return jsonify({'message': 'Profile photo updated successfully'})
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
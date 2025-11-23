from flask import Blueprint, request, jsonify
from models.database import get_db_connection
import json
import random
import string
import base64
import os
from datetime import datetime

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

def save_profile_picture(photo_data, user_id):
    """Save profile picture and return the file path or base64 data"""
    if not photo_data:
        return ""
    
    # Check if it's a base64 image data URL
    if photo_data.startswith('data:image/'):
        try:
            # Extract the base64 data from the data URL
            header, encoded = photo_data.split(',', 1)
            
            # Get file extension from header
            if 'jpeg' in header or 'jpg' in header:
                extension = 'jpg'
            elif 'png' in header:
                extension = 'png'
            elif 'gif' in header:
                extension = 'gif'
            else:
                extension = 'jpg'  # default
            
            # Decode base64 data
            image_data = base64.b64decode(encoded)
            
            # OPTION 1: Save to file system (recommended for production)
            # Uncomment below if you want to save files to disk
            
            # # Create uploads directory if it doesn't exist
            # upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads', 'profiles')
            # os.makedirs(upload_dir, exist_ok=True)
            
            # # Generate filename
            # filename = f"teacher_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{extension}"
            # filepath = os.path.join(upload_dir, filename)
            
            # # Save file
            # with open(filepath, 'wb') as f:
            #     f.write(image_data)
            
            # return filepath  # Return file path
            
            # OPTION 2: Store base64 in database (simpler for development)
            return photo_data  # Store the full base64 data URL
            
        except Exception as e:
            print(f"❌ Error processing profile picture: {str(e)}")
            return ""
    
    # If it's already a file path or other format, return as is
    return photo_data

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
            SELECT tp.*, u.email as user_email, u.name as user_name
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
            
            # Ensure photo field is properly handled
            if not profile_dict['photo']:
                profile_dict['photo'] = ''
                
            print(f"✅ Retrieved profile for user_id: {user_id}")
            return jsonify(profile_dict)
        else:
            # Generate faculty ID for new profile
            faculty_id = generate_faculty_id('', user_id)
            
            # Get user email and name from users table
            cursor.execute('SELECT name, email FROM users WHERE id = ?', (user_id,))
            user_data = cursor.fetchone()
            user_email = user_data['email'] if user_data else ''
            user_name = user_data['name'] if user_data else ''
            
            # Return empty profile structure with generated faculty ID
            empty_profile = {
                'user_id': int(user_id),
                'faculty_id': faculty_id,
                'full_name': user_name,  # Pre-fill with user name
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
                'domain': '',
                'created_at': None,
                'updated_at': None
            }
            
            print(f"⚠️ No profile found for user_id: {user_id}, returning empty template")
            return jsonify(empty_profile)
            
    except Exception as e:
        print(f"❌ Error retrieving profile: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@teacher_profiles_bp.route('/profile', methods=['POST', 'PUT'])
def save_teacher_profile():
    """Create or update teacher profile with photo handling"""
    data = request.get_json()
    
    print(f"📥 Received profile data: {data}")  # Debug log
    
    if not data or 'user_id' not in data:
        print("❌ Missing user_id in request")
        return jsonify({'error': 'User ID is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Validate user_id is a valid integer
        try:
            user_id = int(data['user_id'])
            print(f"✅ User ID validated: {user_id} (type: {type(user_id).__name__})")
        except (ValueError, TypeError) as e:
            print(f"❌ Invalid user_id: {data['user_id']} - {str(e)}")
            return jsonify({'error': 'User ID must be a valid integer'}), 400
        
        # Check if user exists and is a teacher
        cursor.execute('SELECT id, role, name, email FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        if not user:
            print(f"❌ User not found with ID: {user_id}")
            return jsonify({'error': 'User not found'}), 404
        
        print(f"✅ User found: {user['name']} ({user['email']}) - Role: {user['role']}")
        
        if user['role'] != 'teacher':
            print(f"❌ User role is '{user['role']}', not 'teacher'")
            return jsonify({'error': 'User is not a teacher'}), 400
        
        # Process profile picture
        photo_data = data.get('photo', '')
        processed_photo = save_profile_picture(photo_data, user_id)
        
        # Convert social_links list to JSON string
        social_links = data.get('social_links', [])
        social_links_json = json.dumps(social_links) if social_links else '[]'
        
        # Check if profile already exists
        cursor.execute('SELECT id, faculty_id FROM teacher_profiles WHERE user_id = ?', (user_id,))
        existing_profile = cursor.fetchone()
        
        print(f"🔍 Existing profile check: {existing_profile}")
        
        faculty_id = data.get('faculty_id', '')
        department = data.get('department', '')
        
        # If no faculty ID exists or it's empty, generate a new one
        if not faculty_id:
            if existing_profile and existing_profile['faculty_id']:
                # Keep existing faculty ID
                faculty_id = existing_profile['faculty_id']
                print(f"📌 Keeping existing faculty ID: {faculty_id}")
            else:
                # Generate new faculty ID
                faculty_id = generate_faculty_id(department, user_id)
                print(f"🆕 Generated new faculty ID: {faculty_id}")
        
        # Use user's name and email as defaults if not provided
        full_name = data.get('full_name', user['name'])
        email = data.get('email', user['email'])
        
        print(f"📝 Profile data to save: name={full_name}, email={email}, dept={department}")
        
        if existing_profile:
            # Update existing profile
            print(f"🔄 Updating existing profile (ID: {existing_profile['id']})")
            cursor.execute('''
                UPDATE teacher_profiles SET
                    faculty_id = ?, full_name = ?, email = ?, department = ?,
                    designation = ?, gender = ?, contact = ?, photo = ?,
                    linkedin = ?, social_links = ?, professional = ?,
                    headline = ?, about_text = ?, domain = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ''', (
                faculty_id,
                full_name,
                email,
                department,
                data.get('designation', 'Assistant Professor'),
                data.get('gender', 'Male'),
                data.get('contact', ''),
                processed_photo,
                data.get('linkedin', ''),
                social_links_json,
                data.get('professional', ''),
                data.get('headline', ''),
                data.get('about_text', ''),
                data.get('domain', ''),
                user_id
            ))
            action = "updated"
            profile_id = existing_profile['id']
            print(f"✅ Update query executed")
        else:
            # Create new profile
            print(f"➕ Creating new profile")
            cursor.execute('''
                INSERT INTO teacher_profiles (
                    user_id, faculty_id, full_name, email, department,
                    designation, gender, contact, photo, linkedin,
                    social_links, professional, headline, about_text, domain
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id,
                faculty_id,
                full_name,
                email,
                department,
                data.get('designation', 'Assistant Professor'),
                data.get('gender', 'Male'),
                data.get('contact', ''),
                processed_photo,
                data.get('linkedin', ''),
                social_links_json,
                data.get('professional', ''),
                data.get('headline', ''),
                data.get('about_text', ''),
                data.get('domain', '')
            ))
            action = "created"
            profile_id = cursor.lastrowid
            print(f"✅ Insert query executed, new profile ID: {profile_id}")
        
        conn.commit()
        print(f"✅ Profile {action} successfully for user_id: {user_id}, profile_id: {profile_id}")
        
        response_data = {
            'message': f'Profile {action} successfully',
            'faculty_id': faculty_id,
            'profile_id': profile_id,
            'photo_saved': bool(processed_photo),
            'action': action
        }
        
        print(f"📤 Sending response: {response_data}")
        return jsonify(response_data), 200
        
    except Exception as e:
        conn.rollback()
        error_msg = f'Database error: {str(e)}'
        print(f"❌ Error saving profile: {error_msg}")
        print(f"🔍 Full exception: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"🔍 Traceback: {traceback.format_exc()}")
        return jsonify({'error': error_msg}), 500
    finally:
        conn.close()

@teacher_profiles_bp.route('/profile/photo', methods=['POST'])
def update_profile_photo():
    """Update only profile photo with proper base64 handling"""
    data = request.get_json()
    
    if not data or 'user_id' not in data:
        return jsonify({'error': 'User ID is required'}), 400
    
    try:
        user_id = int(data['user_id'])
    except (ValueError, TypeError):
        return jsonify({'error': 'User ID must be a valid integer'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if profile exists
        cursor.execute('SELECT id FROM teacher_profiles WHERE user_id = ?', (user_id,))
        profile = cursor.fetchone()
        
        if not profile:
            return jsonify({'error': 'Teacher profile not found'}), 404
        
        # Process and save the photo
        photo_data = data.get('photo', '')
        processed_photo = save_profile_picture(photo_data, user_id)
        
        cursor.execute('''
            UPDATE teacher_profiles 
            SET photo = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE user_id = ?
        ''', (processed_photo, user_id))
        
        conn.commit()
        
        return jsonify({
            'message': 'Profile photo updated successfully',
            'photo_saved': bool(processed_photo)
        })
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error updating profile photo: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@teacher_profiles_bp.route('/profile/generate-faculty-id', methods=['POST'])
def generate_new_faculty_id():
    """Generate a new faculty ID based on current department"""
    data = request.get_json()
    
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
        cursor.execute('SELECT id, name, email, role, created_at FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get teacher profile info
        cursor.execute('SELECT * FROM teacher_profiles WHERE user_id = ?', (user_id,))
        profile = cursor.fetchone()
        
        # Get all teacher profiles for debugging
        cursor.execute('SELECT COUNT(*) as profile_count FROM teacher_profiles')
        profile_count = cursor.fetchone()['profile_count']
        
        user_info = dict(user) if user else None
        profile_info = dict(profile) if profile else None
        
        # Check photo data
        if profile_info and profile_info.get('photo'):
            photo_preview = profile_info['photo'][:100] + '...' if len(profile_info['photo']) > 100 else profile_info['photo']
            profile_info['photo_preview'] = photo_preview
        
        return jsonify({
            'user': user_info,
            'profile': profile_info,
            'profile_exists': bool(profile),
            'total_profiles_in_db': profile_count
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@teacher_profiles_bp.route('/list', methods=['GET'])
def list_teacher_profiles():
    """Get list of all teacher profiles"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT 
                tp.id, tp.user_id, tp.faculty_id, tp.full_name, 
                tp.email, tp.department, tp.designation,
                tp.photo, tp.updated_at,
                u.name as user_name
            FROM teacher_profiles tp
            JOIN users u ON tp.user_id = u.id
            ORDER BY tp.full_name
        ''')
        
        profiles = cursor.fetchall()
        
        profiles_list = []
        for profile in profiles:
            profile_dict = dict(profile)
            # Add photo preview for debugging
            if profile_dict.get('photo'):
                profile_dict['has_photo'] = True
                profile_dict['photo_preview'] = profile_dict['photo'][:50] + '...' if len(profile_dict['photo']) > 50 else profile_dict['photo']
            else:
                profile_dict['has_photo'] = False
            profiles_list.append(profile_dict)
        
        return jsonify({
            'profiles': profiles_list,
            'count': len(profiles_list)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@teacher_profiles_bp.route('/check-photo/<int:user_id>', methods=['GET'])
def check_profile_photo(user_id):
    """Check if profile has photo and get photo info"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('SELECT photo FROM teacher_profiles WHERE user_id = ?', (user_id,))
        profile = cursor.fetchone()
        
        if not profile:
            return jsonify({'error': 'Profile not found'}), 404
        
        has_photo = bool(profile['photo'])
        photo_info = {
            'has_photo': has_photo,
            'photo_length': len(profile['photo']) if profile['photo'] else 0
        }
        
        # Add preview for base64 images
        if has_photo and profile['photo'].startswith('data:image/'):
            photo_info['type'] = 'base64'
            photo_info['preview'] = profile['photo'][:100] + '...'
        elif has_photo:
            photo_info['type'] = 'file_path'
            photo_info['preview'] = profile['photo']
        else:
            photo_info['type'] = 'none'
        
        return jsonify(photo_info)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
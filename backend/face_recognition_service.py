# face_recognition_service.py
import cv2
import numpy as np
import base64
import io
import pickle
import sqlite3
import os
import json
from PIL import Image
from models.database import get_db_connection

class SimpleFaceRecognitionService:
    def __init__(self):
        self.known_faces = {}
        self.face_cascade = None
        self.load_face_cascade()
        self.load_known_faces()

    def load_face_cascade(self):
        """Load OpenCV face detection cascade"""
        try:
            # Try multiple cascade paths
            cascade_paths = [
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml',
                'haarcascade_frontalface_default.xml',
                './models/haarcascade_frontalface_default.xml'
            ]
            
            for path in cascade_paths:
                if os.path.exists(path):
                    self.face_cascade = cv2.CascadeClassifier(path)
                    if not self.face_cascade.empty():
                        print(f"✅ Loaded face cascade from: {path}")
                        return
            
            # If no cascade found, download it
            print("⚠️ Downloading face cascade...")
            import urllib.request
            url = 'https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml'
            urllib.request.urlretrieve(url, 'haarcascade_frontalface_default.xml')
            self.face_cascade = cv2.CascadeClassifier('haarcascade_frontalface_default.xml')
            
        except Exception as e:
            print(f"❌ Could not load face cascade: {e}")

    def load_known_faces(self):
        """Load known faces from database using user_id"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT fe.id, fe.user_id, fe.face_encoding, u.name, s.enrollment_no, s.id as student_id
                FROM face_encodings fe
                JOIN users u ON fe.user_id = u.id
                LEFT JOIN students s ON u.id = s.user_id
            ''')
            
            face_data = cursor.fetchall()
            self.known_faces = {}
            
            for face in face_data:
                try:
                    face_encoding = pickle.loads(face['face_encoding'])
                    self.known_faces[face['user_id']] = {
                        'name': face['name'],
                        'enrollment_no': face['enrollment_no'],
                        'student_id': face['student_id'],
                        'encoding': face_encoding
                    }
                    print(f"✅ Loaded face for {face['name']} (User ID: {face['user_id']}, Student ID: {face['student_id']})")
                except Exception as e:
                    print(f"❌ Error loading face for user {face['user_id']}: {e}")
                    
            print(f"✅ Loaded {len(self.known_faces)} known faces from database")
            
        except Exception as e:
            print(f"❌ Error loading known faces: {e}")
        finally:
            conn.close()

    def extract_face_features(self, image_np):
        """
        Extract enhanced face features using OpenCV
        """
        try:
            # Convert to grayscale
            if len(image_np.shape) == 3:
                gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
            else:
                gray = image_np
            
            # Detect faces
            if self.face_cascade is None:
                print("❌ Face cascade not loaded")
                return None
                
            faces = self.face_cascade.detectMultiScale(
                gray, 
                scaleFactor=1.1, 
                minNeighbors=5, 
                minSize=(100, 100),
                flags=cv2.CASCADE_SCALE_IMAGE
            )
            
            if len(faces) == 0:
                print("❌ No faces detected")
                return None
            
            print(f"✅ Detected {len(faces)} face(s)")
            
            # Use the largest face
            faces = sorted(faces, key=lambda x: x[2] * x[3], reverse=True)
            x, y, w, h = faces[0]
            
            # Extract face region with padding
            padding = 20
            x1 = max(0, x - padding)
            y1 = max(0, y - padding)
            x2 = min(image_np.shape[1], x + w + padding)
            y2 = min(image_np.shape[0], y + h + padding)
            
            face_roi = gray[y1:y2, x1:x2]
            
            # Resize to standard size for consistent feature extraction
            face_resized = cv2.resize(face_roi, (100, 100))
            
            # Apply histogram equalization for better contrast
            face_equalized = cv2.equalizeHist(face_resized)
            
            # Extract multiple feature types
            features = []
            
            # 1. Raw pixel values (flattened and normalized)
            features.extend(face_equalized.flatten() / 255.0)
            
            # 2. Histogram features
            hist = cv2.calcHist([face_equalized], [0], None, [16], [0, 256])
            features.extend(hist.flatten() / np.sum(hist))
            
            # 3. Statistical features
            features.extend([
                np.mean(face_equalized),
                np.std(face_equalized),
                np.median(face_equalized),
                np.min(face_equalized),
                np.max(face_equalized)
            ])
            
            feature_vector = np.array(features, dtype=np.float32)
            
            print(f"✅ Extracted {len(feature_vector)} features")
            return feature_vector
            
        except Exception as e:
            print(f"❌ Error extracting face features: {e}")
            return None

    def register_face(self, user_id, image_data):
        """Register a new face for a user"""
        try:
            print(f"🔍 Starting face registration for user {user_id}")
            
            # Convert base64 image to numpy array
            if isinstance(image_data, str) and image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            image_np = np.array(image)
            
            # Convert RGB to BGR (OpenCV format) if needed
            if len(image_np.shape) == 3 and image_np.shape[2] == 3:
                rgb_image = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
            else:
                rgb_image = image_np
            
            print("📸 Image loaded, detecting faces...")
            
            # Extract face features
            face_features = self.extract_face_features(rgb_image)
            
            if face_features is None:
                return {'success': False, 'error': 'No face detected in image. Please ensure your face is clearly visible with good lighting.'}
            
            print("✅ Face detected, extracting features...")
            
            # Save to database
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Check if face already exists for this user
            cursor.execute('SELECT id FROM face_encodings WHERE user_id = ?', (user_id,))
            existing_face = cursor.fetchone()
            
            if existing_face:
                # Update existing face encoding
                cursor.execute('''
                    UPDATE face_encodings 
                    SET face_encoding = ?, created_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                ''', (pickle.dumps(face_features), user_id))
                action = "updated"
                print(f"🔄 Updated existing face encoding for user {user_id}")
            else:
                # Insert new face encoding
                cursor.execute('''
                    INSERT INTO face_encodings (user_id, face_encoding)
                    VALUES (?, ?)
                ''', (user_id, pickle.dumps(face_features)))
                action = "registered"
                print(f"✅ Registered new face encoding for user {user_id}")
            
            conn.commit()
            conn.close()
            
            # Reload known faces
            self.load_known_faces()
            
            return {
                'success': True, 
                'message': f'Face {action} successfully!',
                'features_length': len(face_features)
            }
            
        except Exception as e:
            print(f"❌ Error in face registration: {e}")
            return {'success': False, 'error': f'Registration failed: {str(e)}'}

    def compare_faces(self, features1, features2):
        """Compare two face feature vectors using Euclidean distance"""
        try:
            if features1 is None or features2 is None:
                return float('inf')
            
            # Ensure both feature vectors are numpy arrays
            features1 = np.array(features1, dtype=np.float32)
            features2 = np.array(features2, dtype=np.float32)
            
            # Ensure both feature vectors have the same length
            min_len = min(len(features1), len(features2))
            features1 = features1[:min_len]
            features2 = features2[:min_len]
            
            # Calculate Euclidean distance
            distance = np.linalg.norm(features1 - features2)
            return float(distance)
            
        except Exception as e:
            print(f"❌ Error comparing faces: {e}")
            return float('inf')

    def recognize_faces(self, image_data):
        """Recognize faces in an image using user_id"""
        try:
            print("🔍 Starting face recognition...")
            
            # Convert base64 image to numpy array
            if isinstance(image_data, str) and image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            image_np = np.array(image)
            
            # Convert RGB to BGR (OpenCV format) if needed
            if len(image_np.shape) == 3 and image_np.shape[2] == 3:
                rgb_image = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
            else:
                rgb_image = image_np
            
            # Extract face features from the input image
            input_features = self.extract_face_features(rgb_image)
            
            if input_features is None:
                return {
                    'success': True,
                    'recognized_faces': [],
                    'total_faces_detected': 0,
                    'message': 'No face detected in image'
                }
            
            print("✅ Face detected, starting recognition...")
            
            recognized_faces = []
            
            if len(self.known_faces) == 0:
                return {
                    'success': True,
                    'recognized_faces': [],
                    'total_faces_detected': 1,
                    'message': 'No registered faces available for recognition'
                }
            
            # Compare with known faces
            best_match = None
            best_distance = float('inf')
            
            for user_id, face_data in self.known_faces.items():
                distance = self.compare_faces(input_features, face_data['encoding'])
                
                # Convert distance to confidence (0-1 scale)
                confidence = max(0, 1 - (distance / 2000.0))
                
                print(f"  📊 Comparing with {face_data['name']}: distance={distance:.2f}, confidence={confidence:.2f}")
                
                if distance < best_distance:
                    best_distance = distance
                    best_match = {
                        'name': face_data['name'],
                        'user_id': user_id,
                        'student_id': face_data['student_id'],
                        'enrollment_no': face_data['enrollment_no'],
                        'confidence': float(confidence),
                        'distance': float(distance)
                    }
            
            # If we found a match within threshold
            if best_match and best_match['confidence'] > 0.6:  # 60% confidence threshold
                # Ensure all values are JSON serializable
                recognized_face = {
                    'name': str(best_match['name']),
                    'user_id': int(best_match['user_id']),
                    'student_id': int(best_match['student_id']),
                    'enrollment_no': str(best_match['enrollment_no']),
                    'confidence': float(best_match['confidence']),
                    'distance': float(best_match['distance'])
                }
                recognized_faces.append(recognized_face)
                print(f"✅ Recognized: {best_match['name']} (User ID: {best_match['user_id']}, Confidence: {best_match['confidence']:.2f})")
            else:
                print(f"❌ No confident match found. Best match: {best_match['name'] if best_match else 'None'} (Confidence: {best_match['confidence'] if best_match else 0:.2f})")

            # Prepare response with JSON serializable data
            response_data = {
                'success': True,
                'recognized_faces': recognized_faces,
                'total_faces_detected': 1,
                'best_match': {
                    'name': str(best_match['name']) if best_match else None,
                    'user_id': int(best_match['user_id']) if best_match else None,
                    'student_id': int(best_match['student_id']) if best_match else None,
                    'enrollment_no': str(best_match['enrollment_no']) if best_match else None,
                    'confidence': float(best_match['confidence']) if best_match else 0.0,
                    'distance': float(best_match['distance']) if best_match else 0.0
                } if best_match else None
            }
            
            print(f"✅ Recognition completed. Returning {len(recognized_faces)} recognized faces")
            return response_data
            
        except Exception as e:
            print(f"❌ Error in face recognition: {e}")
            import traceback
            print(f"🔍 Full traceback: {traceback.format_exc()}")
            return {
                'success': False, 
                'error': str(e),
                'recognized_faces': [],
                'total_faces_detected': 0
            }

    def get_face_count(self):
        """Get count of registered faces"""
        return len(self.known_faces)

    def get_service_status(self):
        """Get service status"""
        return {
            'face_count': len(self.known_faces),
            'face_cascade_loaded': self.face_cascade is not None and not self.face_cascade.empty(),
            'known_users': list(self.known_faces.keys())
        }
    
    def get_model_status(self):
        """Get model training status"""
        return {
            'is_trained': True,
            'face_count': len(self.known_faces),
            'classifier_type': 'SimpleFaceRecognition'
        }

    def debug_face_mappings(self):
        """Debug method to check current face mappings"""
        print("🔍 DEBUG: Current Face Mappings")
        for user_id, face_data in self.known_faces.items():
            print(f"  User ID: {user_id} -> Name: {face_data['name']}, Student ID: {face_data['student_id']}, Enrollment: {face_data['enrollment_no']}")

# Global instance
face_service = SimpleFaceRecognitionService()
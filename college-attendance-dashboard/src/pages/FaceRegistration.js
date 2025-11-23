import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import UserContext from '../context/UserContext';
import ToastContext from '../context/ToastContext';

const FaceRegistration = () => {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const webcamRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { showToast } = useContext(ToastContext);

  const videoConstraints = {
    width: 720,
    height: 480,
    facingMode: "user"
  };

  const handleCapture = async () => {
    setIsCapturing(true);
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    setIsCapturing(false);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setMessage('');
  };

  const handleSubmit = async () => {
    if (!capturedImage) {
      setMessage('Please capture your face image first');
      return;
    }

    try {
      setLoading(true);
      const studentUser = user || JSON.parse(localStorage.getItem('user'));
      
      if (!studentUser || studentUser.role !== 'student') {
        showToast('Student information not found', 'error');
        return;
      }

      console.log('👤 Current user object:', studentUser);
      
      // Use user_id directly - no complex mapping needed!
      const userId = studentUser.id;
      
      console.log(`🎯 Using user_id: ${userId} for registration`);

      const response = await fetch('http://127.0.0.1:5000/api/register-face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,  // Changed from student_id to user_id
          image_data: capturedImage
        })
      });

      const data = await response.json();

      if (data.success) {
        showToast('Face registered successfully!', 'success');
        setMessage('Face registered successfully! Redirecting to dashboard...');
        setTimeout(() => navigate('/student-dashboard'), 2000);
      } else {
        const errorMsg = `Registration failed: ${data.error}`;
        setMessage(errorMsg);
        showToast(errorMsg, 'error');
      }
    } catch (error) {
      console.error('❌ Error:', error);
      const errorMsg = 'An error occurred. Please try again later.';
      setMessage(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Check if user is already registered
  useEffect(() => {
    const checkFaceRegistration = async () => {
      try {
        const studentUser = user || JSON.parse(localStorage.getItem('user'));
        
        if (!studentUser || studentUser.role !== 'student') {
          return;
        }

        // Use user_id directly
        const userId = studentUser.id;
        
        const response = await fetch(`http://127.0.0.1:5000/api/face-registration-status/${userId}`);
        const data = await response.json();
        
        if (data.success && data.face_registered) {
          setMessage(`Face already registered for ${data.student_name}. You can re-register if needed.`);
        }
      } catch (error) {
        console.error('Error checking face registration:', error);
      }
    };

    checkFaceRegistration();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-center text-2xl font-bold text-gray-900 mb-8">
            Face Registration
          </h2>
          
          <div className="space-y-6">
            {!capturedImage ? (
              <div className="relative">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={videoConstraints}
                  onUserMedia={() => setIsCameraReady(true)}
                  onUserMediaError={() => {
                    setMessage('Camera access denied. Please allow camera permissions.');
                    showToast('Camera access denied', 'error');
                  }}
                  className="w-full rounded-lg"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  {!isCameraReady && (
                    <div className="text-white bg-black bg-opacity-50 p-4 rounded">
                      Loading camera...
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={capturedImage}
                  alt="Captured face"
                  className="w-full rounded-lg"
                />
                <div className="absolute bottom-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-sm">
                  Preview
                </div>
              </div>
            )}

            <div className="flex justify-center space-x-4">
              {!capturedImage ? (
                <button
                  onClick={handleCapture}
                  disabled={!isCameraReady || isCapturing}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
                >
                  {isCapturing ? 'Capturing...' : 'Capture Photo'}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleRetake}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
                  >
                    Retake
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors duration-200"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Registering...
                      </>
                    ) : (
                      'Register Face'
                    )}
                  </button>
                </>
              )}
            </div>

            {message && (
              <div className={`mt-4 p-3 rounded-md ${
                message.includes('successful') || message.includes('already registered')
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-red-100 text-red-700 border border-red-200'
              }`}>
                <div className="flex items-center">
                  {message.includes('successful') || message.includes('already registered') ? (
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                  {message}
                </div>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Instructions:
              </h3>
              <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                <li>Ensure good, even lighting on your face</li>
                <li>Look directly at the camera with a neutral expression</li>
                <li>Remove sunglasses, hats, or anything covering your face</li>
                <li>Make sure your entire face is visible in the frame</li>
                <li>Stay still while capturing the photo</li>
              </ul>
            </div>

            <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
              <p className="text-sm text-yellow-700">
                <strong>Note:</strong> This will register your face for attendance marking. 
                Make sure you're in a well-lit environment for best results.
              </p>
            </div>

            {/* Debug information */}
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Debug Info:
              </h3>
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>User ID:</strong> {user?.id || 'Not available'}</p>
                <p><strong>User Role:</strong> {user?.role || 'Not available'}</p>
                <p><strong>Using:</strong> user_id for face registration</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceRegistration;
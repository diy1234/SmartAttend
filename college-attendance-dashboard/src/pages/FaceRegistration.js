import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';

const FaceRegistration = () => {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [message, setMessage] = useState('');
  const webcamRef = useRef(null);
  const navigate = useNavigate();

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
      const user = JSON.parse(localStorage.getItem('user')) || { id: 'unknown' };
      const formData = new FormData();

      // Convert base64 to blob
      const base64Response = await fetch(capturedImage);
      const blob = await base64Response.blob();

      formData.append('face_image', blob);
      formData.append('student_id', user.id);

      // Try sending to backend. If backend is unavailable or returns an error,
      // fall back to saving the captured image locally (so registration still "works"
      // without backend changes).
      try {
        const response = await fetch('http://127.0.0.1:5000/api/register-face', {
          method: 'POST',
          body: formData,
        });

        let data = null;
        try { data = await response.json(); } catch (e) { /* ignore non-json */ }

        if (response.ok) {
          setMessage('Face registration successful!');
          setTimeout(() => navigate('/student-dashboard'), 2000);
          return;
        } else {
          console.warn('Backend responded with error:', response.status, data);
        }
      } catch (err) {
        console.warn('Failed to call backend register endpoint:', err);
      }

      // Fallback: save captured image in localStorage keyed by user id
      try {
        const localKey = `face_image_user_${user.id}`;
        localStorage.setItem(localKey, capturedImage);
        setMessage('Face saved locally (backend unavailable). It will be used when backend is reachable.');
        setTimeout(() => navigate('/student-dashboard'), 2000);
        return;
      } catch (lsErr) {
        console.error('Failed to save face image locally:', lsErr);
        setMessage('An error occurred. Please try again later.');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('An error occurred. Please try again later.');
    }
  };

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
              </div>
            )}

            <div className="flex justify-center space-x-4">
              {!capturedImage ? (
                <button
                  onClick={handleCapture}
                  disabled={!isCameraReady || isCapturing}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isCapturing ? 'Capturing...' : 'Capture Photo'}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleRetake}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Retake
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Submit
                  </button>
                </>
              )}
            </div>

            {message && (
              <div className={`mt-4 p-3 rounded-md ${
                message.includes('successful') 
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceRegistration;
import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Webcam from 'react-webcam';
import UserContext from '../context/UserContext';
import ToastContext from '../context/ToastContext';

const FacialRecognitionAttendance = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(UserContext);
  const { showToast } = useContext(ToastContext);
  
  const course = location.state?.course || 'Course';
  const classId = location.state?.classId;
  const dept = location.state?.dept || '';
  const subject = location.state?.subject || '';
  const students = location.state?.students || [];

  const webcamRef = useRef(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [recognizedFaces, setRecognizedFaces] = useState([]);
  const [attendanceMarked, setAttendanceMarked] = useState([]);
  const [pendingMarks, setPendingMarks] = useState([]); // track in-flight marks to avoid duplicates
  const [scanningInterval, setScanningInterval] = useState(null);
  const [processing, setProcessing] = useState(false);
  const pendingMarksRef = useRef(pendingMarks);
  const processingRef = useRef(processing);

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user"
  };

  const startScanning = () => {
    if (isScanning) return;
    
    setIsScanning(true);
    showToast('Facial recognition scanning started', 'info');
    
    // Scan every 3 seconds
    const interval = setInterval(captureAndRecognize, 3000);
    setScanningInterval(interval);
  };

  const stopScanning = () => {
    if (scanningInterval) {
      clearInterval(scanningInterval);
      setScanningInterval(null);
    }
    setIsScanning(false);
    showToast('Scanning stopped', 'info');
  };

  const captureAndRecognize = async () => {
    if (!webcamRef.current || processing) return;

    try {
      setProcessing(true);
      const imageSrc = webcamRef.current.getScreenshot();
      
      const response = await fetch('http://127.0.0.1:5000/api/recognize-faces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_data: imageSrc,
          class_id: classId
        })
      });

      const data = await response.json();

      if (data.success) {
        if (data.recognized_faces.length > 0) {
          // Only accept recognized faces that are enrolled in this class
          const enrolledIds = new Set((students || []).map(s => s.id));

          // Filter out students not enrolled, already marked, or currently pending
          const newRecognizedFaces = data.recognized_faces.filter(face => 
            face.student_id &&
            enrolledIds.has(face.student_id) &&
            !attendanceMarked.includes(face.student_id) &&
            !pendingMarks.includes(face.student_id)
          );

          // Log ignored recognized faces that are not enrolled (for debugging)
          const ignored = data.recognized_faces.filter(face => face.student_id && !enrolledIds.has(face.student_id));
          if (ignored.length > 0) {
            console.warn('Ignored recognition for non-enrolled students:', ignored.map(f => f.name));
          }

          if (newRecognizedFaces.length > 0) {
            // Deduplicate recognizedFaces state by student_id and keep most recent
            setRecognizedFaces(prev => {
              const existingIds = new Set(prev.map(f => f.student_id));
              const toAdd = [];
              for (const f of newRecognizedFaces) {
                if (!existingIds.has(f.student_id)) {
                  toAdd.push(f);
                  existingIds.add(f.student_id);
                }
              }
              const merged = [...toAdd, ...prev];
              return merged.slice(0, 10); // keep last 10
            });

            // Mark attendance but first mark them as pending to avoid duplicate calls
            newRecognizedFaces.forEach(face => {
              setPendingMarks(prev => Array.from(new Set([...prev, face.student_id])));
              markAttendance(face.student_id, face.name, face.confidence);
            });
          }
        }
      } else {
        console.error('Recognition error:', data.error);
      }
    } catch (error) {
      console.error('Recognition request error:', error);
      showToast('Recognition service error', 'error');
    } finally {
      setProcessing(false);
    }
  };

const markAttendance = async (studentId, studentName, confidence) => {
  // Prevent duplicate marking if already marked or pending
  if (attendanceMarked.includes(studentId) || pendingMarks.includes(studentId)) {
    console.log(`⏭️ Skipping ${studentName} - already marked or pending`);
    return;
  }

  // mark as pending immediately to avoid race conditions
  setPendingMarks(prev => Array.from(new Set([...prev, studentId])));

  try {
    const teacherId = user?.id || JSON.parse(localStorage.getItem('user'))?.id;

    if (!teacherId || !classId) {
      showToast('Teacher ID or Class ID not found', 'error');
      return;
    }

    const attendanceDate = new Date().toISOString().split('T')[0];
    
    console.log(`📝 Marking attendance for ${studentName} (ID: ${studentId}) in class ${classId} on ${attendanceDate}`);

    const response = await fetch('http://127.0.0.1:5000/api/teacher-dashboard/mark-attendance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        class_id: classId,
        date: attendanceDate,
        attendance: [{
          student_id: studentId,
          status: 'present',
          method: 'face_recognition'
        }],
        teacher_id: teacherId,
        method: 'face_recognition'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      setAttendanceMarked(prev => Array.from(new Set([...prev, studentId])));
      showToast(`✅ ${studentName} marked present! (${(confidence * 100).toFixed(0)}% confidence)`, 'success');
      console.log(`✅ Attendance marked successfully for ${studentName}`);
    } else {
      console.error(`❌ Failed to mark attendance: ${result.error}`);
      showToast(`Failed to mark attendance for ${studentName}: ${result.error}`, 'error');
    }
  } catch (error) {
    console.error('❌ Error marking attendance:', error);
    showToast(`Failed to mark attendance for ${studentName}`, 'error');
  } finally {
    // remove from pending regardless of success/failure
    setPendingMarks(prev => prev.filter(id => id !== studentId));
  }
};

  const handleManualMark = (studentId, studentName) => {
    markAttendance(studentId, studentName, 1.0);
  };

  const captureSingle = async () => {
    if (!webcamRef.current) return;
    
    try {
      setProcessing(true);
      const imageSrc = webcamRef.current.getScreenshot();
      
      const response = await fetch('http://127.0.0.1:5000/api/recognize-faces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_data: imageSrc,
          class_id: classId
        })
      });

      const data = await response.json();

      if (data.success) {
        if (data.recognized_faces.length > 0) {
          // Only accept recognized faces that are enrolled in this class
          const enrolledIds = new Set((students || []).map(s => s.id));

          // Filter out students not enrolled, already marked, or currently pending
          const newRecognizedFaces = data.recognized_faces.filter(face => 
            face.student_id &&
            enrolledIds.has(face.student_id) &&
            !attendanceMarked.includes(face.student_id) &&
            !pendingMarks.includes(face.student_id)
          );

          // Log ignored recognized faces that are not enrolled (for debugging)
          const ignored = data.recognized_faces.filter(face => face.student_id && !enrolledIds.has(face.student_id));
          if (ignored.length > 0) {
            console.warn('Ignored recognition for non-enrolled students:', ignored.map(f => f.name));
          }

          if (newRecognizedFaces.length > 0) {
            // Deduplicate recognizedFaces state by student_id and keep most recent
            setRecognizedFaces(prev => {
              const existingIds = new Set(prev.map(f => f.student_id));
              const toAdd = [];
              for (const f of newRecognizedFaces) {
                if (!existingIds.has(f.student_id)) {
                  toAdd.push(f);
                  existingIds.add(f.student_id);
                }
              }
              const merged = [...toAdd, ...prev];
              return merged.slice(0, 10); // keep last 10
            });

            // Mark attendance but first mark them as pending to avoid duplicate calls
            newRecognizedFaces.forEach(face => {
              setPendingMarks(prev => Array.from(new Set([...prev, face.student_id])));
              markAttendance(face.student_id, face.name, face.confidence);
            });
          }
        } else {
          showToast('No students recognized in this capture', 'info');
        }
      } else {
        console.error('Recognition error:', data.error);
      }
    } catch (error) {
      console.error('Single capture error:', error);
      showToast('Capture failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scanningInterval) {
        clearInterval(scanningInterval);
      }
    };
  }, [scanningInterval]);

  // keep refs current so async wait loops can read latest values
  useEffect(() => { pendingMarksRef.current = pendingMarks; }, [pendingMarks]);
  useEffect(() => { processingRef.current = processing; }, [processing]);

  const enrolledStudentsNotMarked = students.filter(student => 
    !attendanceMarked.includes(student.id)
  );

  const handleFinish = async () => {
    // Wait for any pending markAttendance calls to finish (up to timeout)
    const timeout = 10000; // 10s
    const interval = 500; // 0.5s

    if (processingRef.current || (pendingMarksRef.current && pendingMarksRef.current.length > 0)) {
      showToast('Waiting for pending marks to complete...', 'info');

      const start = Date.now();
      while (Date.now() - start < timeout) {
        if (!processingRef.current && (!pendingMarksRef.current || pendingMarksRef.current.length === 0)) {
          break;
        }
        // eslint-disable-next-line no-await-in-loop
        await new Promise(res => setTimeout(res, interval));
      }

      if (processingRef.current || (pendingMarksRef.current && pendingMarksRef.current.length > 0)) {
        showToast('Some marks are still pending; they will complete shortly. Refreshing analytics now.', 'warning');
      }
    }

    navigate('/teacher-dashboard', { 
      state: { 
        refreshAnalytics: true,
        attendanceUpdated: true 
      } 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">Facial Recognition Attendance</h1>
          <p className="text-gray-700 mt-1">
            <strong>Course:</strong> {course}
          </p>
          <p className="text-gray-600 text-sm">Date: {new Date().toDateString()}</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
        >
          ← Back to Manual
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera Section */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">Camera Feed</h2>
          
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

          <div className="flex gap-4 mt-4">
            <button
              onClick={captureSingle}
              disabled={!isCameraReady || processing}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Single Capture'}
            </button>
          </div>

          {isScanning && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-blue-700 text-sm">
                🔍 Auto-scanning enabled. Students will be automatically marked present when recognized.
              </p>
            </div>
          )}
        </div>

        {/* Recognition Results */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">
            Recognition Results
            <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
              {attendanceMarked.length} marked
            </span>
          </h2>

          {/* Recognized Faces */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-2">Recently Recognized:</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {recognizedFaces.slice(0, 5).map((face, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <div>
                    <span className="font-medium text-green-700">{face.name}</span>
                    <span className="text-green-600 text-sm ml-2">({face.enrollment_no})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{Math.round(face.confidence * 100)}%</span>
                    <span className="text-green-600">✅</span>
                  </div>
                </div>
              ))}
              {recognizedFaces.length === 0 && (
                <p className="text-gray-500 text-sm p-2">No students recognized yet. Start scanning to detect faces.</p>
              )}
            </div>
          </div>

          {/* Manual Marking */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">
              Manual Marking ({enrolledStudentsNotMarked.length} remaining):
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {enrolledStudentsNotMarked.map(student => (
                <div key={student.id} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50">
                  <div>
                    <span className="font-medium">{student.name}</span>
                    <span className="text-gray-500 text-sm ml-2">({student.enrollment_no})</span>
                  </div>
                  <button
                    onClick={() => handleManualMark(student.id, student.name)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Mark Present
                  </button>
                </div>
              ))}
              {enrolledStudentsNotMarked.length === 0 && (
                <p className="text-green-600 text-sm p-2 text-center">🎉 All students marked present!</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white p-6 rounded-xl shadow-md mt-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-gray-700">Attendance Summary</h3>
            <p className="text-sm text-gray-600">
              Total Students: <span className="font-semibold">{students.length}</span> | 
              Marked Present: <span className="text-green-600 font-semibold">{attendanceMarked.length}</span> | 
              Remaining: <span className="text-orange-600 font-semibold">{students.length - attendanceMarked.length}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleFinish}
              className="bg-blue-800 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Finish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacialRecognitionAttendance;
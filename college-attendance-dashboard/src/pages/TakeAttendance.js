import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DataContext from '../context/DataContext';
import ToastContext from '../context/ToastContext';
import UserContext from '../context/UserContext';

function TakeAttendance() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(UserContext);
  const { showToast } = useContext(ToastContext);
  const { addAttendance } = useContext(DataContext);
  
  const course = location.state?.course || 'Course';
  const classId = location.state?.classId;
  const dept = location.state?.dept || '';
  const subject = location.state?.subject || '';

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [locked, setLocked] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Fetch students from backend when component mounts
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // First try to get students from location state
        if (location.state?.students && location.state.students.length > 0) {
          console.log('Using students from location state:', location.state.students);
          const formattedStudents = location.state.students.map(s => ({
            id: s.id || s.student_id,
            name: s.name || s.student_name,
            enrollment_no: s.enrollment_no,
            status: 'Present'
          }));
          setStudents(formattedStudents);
          setLoading(false);
          return;
        }

        // If no students in state and we have classId, fetch from backend
        if (classId) {
          console.log('Fetching students for class_id:', classId);
          const response = await fetch(`http://127.0.0.1:5000/api/teacher-dashboard/course-students/${classId}`);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('Fetched students:', data);
          
          if (data.students && data.students.length > 0) {
            const formattedStudents = data.students.map(s => ({
              id: s.id || s.student_id,
              name: s.name || s.student_name,
              enrollment_no: s.enrollment_no,
              status: 'Present'
            }));
            setStudents(formattedStudents);
          } else {
            showToast('No students enrolled in this course', 'warning');
          }
        } else {
          showToast('Class ID not found', 'error');
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        showToast('Failed to load students', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [classId, location.state, showToast]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Attach stream to video when camera turns on
  useEffect(() => {
    if (cameraOn && streamRef.current && videoRef.current) {
      try {
        videoRef.current.srcObject = streamRef.current;
        const p = videoRef.current.play();
        if (p && p.catch) p.catch(() => {});
      } catch (e) {
        console.error('Video play error:', e);
      }
    }
  }, [cameraOn]);

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.enrollment_no && s.enrollment_no.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleStatus = (id) => {
    if (locked) return;
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: s.status === 'Present' ? 'Absent' : 'Present' } : s
      )
    );
  };

  const handleSubmit = async () => {
    try {
      setLocked(true);
      
      const teacherId = user?.id || JSON.parse(localStorage.getItem('user'))?.id;
      
      if (!teacherId) {
        showToast('Teacher ID not found', 'error');
        return;
      }

      if (!classId) {
        showToast('Class ID not found', 'error');
        return;
      }

      // Prepare attendance data for backend
      const attendanceDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const attendanceData = students.map(s => ({
        student_id: s.id,
        status: s.status.toLowerCase() // 'present' or 'absent'
      }));

      console.log('Submitting attendance:', {
        class_id: classId,
        date: attendanceDate,
        attendance: attendanceData,
        teacher_id: teacherId
      });

      // Submit to backend
      const response = await fetch('http://127.0.0.1:5000/api/teacher-dashboard/mark-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          class_id: classId,
          date: attendanceDate,
          attendance: attendanceData,
          teacher_id: teacherId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Attendance submission result:', result);

      // Also save to local context for compatibility
      const record = {
        id: Date.now(),
        course,
        dept,
        subject,
        class_id: classId,
        date: new Date().toISOString(),
        notes,
        students,
        submittedBy: user?.email || 'unknown',
        facultyApproved: true,
      };
      addAttendance(record);

      showToast('✅ Attendance submitted successfully!', 'success');
      navigate('/teacher-dashboard');
      
    } catch (error) {
      console.error('Error submitting attendance:', error);
      showToast('Failed to submit attendance', 'error');
      setLocked(false);
    }
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return showToast('Camera not supported in this browser', 'error');
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setCameraOn(true);
    } catch (err) {
      console.error('Camera error:', err);
      showToast('Unable to access camera', 'error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return showToast('Camera not running', 'error');
    if (!selectedStudentId) return showToast('Select a student first', 'error');
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/png');
    
    setStudents((prev) => prev.map((s) => (s.id === selectedStudentId ? { ...s, status: 'Present', capturedImage: data } : s)));
    showToast('Captured and marked Present', 'success', 2000);
    stopCamera();
  };

  // Add facial recognition navigation
  const handleFacialRecognition = () => {
    navigate('/facial-recognition-attendance', { 
      state: { 
        course: course,
        dept: dept,
        subject: subject,
        classId: classId,
        students: students
      } 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">Mark Attendance</h1>
          <p className="text-gray-700 mt-1">
            <strong>Course:</strong> {course}
          </p>
          <p className="text-gray-600 text-sm">Date: {new Date().toDateString()}</p>
          <p className="text-gray-600 text-sm">Total Students: {students.length}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleFacialRecognition}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            👤 Facial Recognition
          </button>
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search student by name or enrollment number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg p-2 text-gray-700"
        />
        <span className="text-sm text-gray-500">{filteredStudents.length} students</span>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-sm text-gray-700">
            Selected: <strong>{students.find(s=>s.id===selectedStudentId)?.name || 'None'}</strong>
          </div>
          {!cameraOn ? (
            <button
              onClick={startCamera}
              disabled={locked}
              className="px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50"
            >
              📷 Start Camera
            </button>
          ) : (
            <button onClick={stopCamera} className="px-3 py-1 rounded-lg bg-red-600 text-white">
              Stop Camera
            </button>
          )}
          <button
            onClick={capturePhoto}
            disabled={!cameraOn || !selectedStudentId}
            className="px-3 py-1 rounded-lg bg-green-600 text-white disabled:opacity-50"
          >
            Capture
          </button>
        </div>
      </div>

      {/* Student List */}
      {students.length === 0 ? (
        <div className="bg-white p-6 rounded-xl shadow-md mb-6 text-center">
          <p className="text-gray-600">No students enrolled in this course yet.</p>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-xl shadow-md mb-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-800 text-white">
                <th className="p-2 rounded-l-lg">ID</th>
                <th className="p-2">Enrollment No</th>
                <th className="p-2">Name</th>
                <th className="p-2 text-center rounded-r-lg">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr
                  key={student.id}
                  className={`border-b hover:bg-gray-100 transition ${
                    student.id === selectedStudentId ? 'bg-blue-50' : (student.status === 'Absent' ? 'bg-red-50' : '')
                  }`}
                >
                  <td className="p-2">{student.id}</td>
                  <td className="p-2">{student.enrollment_no || 'N/A'}</td>
                  <td className="p-2 flex items-center gap-3">
                    <div 
                      onClick={() => setSelectedStudentId(student.id)} 
                      className={`cursor-pointer ${student.id === selectedStudentId ? 'font-semibold' : ''}`}
                    >
                      {student.name}
                    </div>
                    {student.capturedImage && (
                      <img src={student.capturedImage} alt="thumb" className="w-10 h-10 object-cover rounded-full" />
                    )}
                  </td>
                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => toggleStatus(student.id)}
                        disabled={locked}
                        className={`px-4 py-1 rounded-lg font-medium ${
                          student.status === 'Present'
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-red-500 text-white hover:bg-red-600'
                        } ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {student.status}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Camera Modal */}
      {cameraOn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Capture Face for Student</h3>
              <div className="flex items-center gap-2">
                <button onClick={capturePhoto} className="px-3 py-1 bg-green-600 text-white rounded">Capture</button>
                <button onClick={stopCamera} className="px-3 py-1 bg-red-600 text-white rounded">Close</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-100 p-2 rounded">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-64 object-cover rounded" />
              </div>
              <div className="bg-gray-50 p-2 rounded flex items-center justify-center">
                <canvas ref={canvasRef} style={{ maxWidth: '100%', borderRadius: 8 }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes & Submit */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">Session Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add remarks for this session (optional)..."
          className="w-full border border-gray-300 rounded-lg p-3 text-gray-700 mb-4"
          rows="3"
          disabled={locked}
        />
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Present: <span className="font-bold text-green-600">{students.filter(s => s.status === 'Present').length}</span> | 
            Absent: <span className="font-bold text-red-600">{students.filter(s => s.status === 'Absent').length}</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={locked || students.length === 0}
            className={`px-6 py-2 rounded-lg text-white font-semibold ${
              locked || students.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-800 hover:bg-blue-700'
            }`}
          >
            {locked ? 'Attendance Locked' : 'Submit & Lock'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TakeAttendance;
import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DataContext from '../context/DataContext';
import ToastContext from '../context/ToastContext';

function TakeAttendance() {
  const navigate = useNavigate();
  const location = useLocation();
  const course = location.state?.course || 'CS301 - Data Structures';

  const [students, setStudents] = useState([
    { id: 1, name: 'Aditi Sharma', status: 'Present' },
    { id: 2, name: 'Rohan Mehta', status: 'Present' },
    { id: 3, name: 'Simran Kaur', status: 'Present' },
    { id: 4, name: 'Vikram Singh', status: 'Present' },
    { id: 5, name: 'Neha Patel', status: 'Present' },
    { id: 6, name: 'Arjun Verma', status: 'Present' },
  ]);

  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [locked, setLocked] = useState(false);
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = (id) => {
    if (locked) return;
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: s.status === 'Present' ? 'Absent' : 'Present' } : s
      )
    );
  };

  const { addAttendance } = useContext(DataContext);
  const { showToast } = useContext(ToastContext);

  useEffect(() => {
    return () => {
      // cleanup stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleSubmit = () => {
    setLocked(true);
    // try to include dept/subject so admin pages can filter by subject
    const inferredDept = location.state?.dept || '';
    const inferredSubject = location.state?.subject || (course && course.includes(' - ') ? course.split(' - ').slice(1).join(' - ').trim() : course);
    const record = {
      id: Date.now(),
      course,
      dept: inferredDept,
      subject: inferredSubject,
      date: new Date().toISOString(),
      notes,
      students,
      submittedBy: JSON.parse(localStorage.getItem('user'))?.email || 'unknown',
      facultyApproved: true,
    };
    addAttendance(record);
    showToast('✅ Attendance submitted successfully!', 'info', 3000);
    navigate('/admin-dashboard');
  };

  const startCamera = async (studentId) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return showToast('Camera not supported in this browser', 'error');
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setActiveStudentId(studentId);
      setCameraOn(true);
    } catch (err) {
      showToast('Unable to access camera', 'error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
    setActiveStudentId(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/png');
    // attach image to student and mark present
    setStudents((prev) => prev.map((s) => (s.id === activeStudentId ? { ...s, status: 'Present', capturedImage: data } : s)));
    showToast('Captured and marked Present', 'info', 2000);
    stopCamera();
  };

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
        </div>
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
        >
          ← Back
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search student..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg p-2 text-gray-700"
        />
        <span className="text-sm text-gray-500">{filteredStudents.length} students</span>
      </div>

      {/* Student List */}
      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-blue-800 text-white">
              <th className="p-2 rounded-l-lg">ID</th>
              <th className="p-2">Name</th>
              <th className="p-2 text-center rounded-r-lg">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr
                key={student.id}
                className={`border-b hover:bg-gray-100 transition ${
                  student.status === 'Absent' ? 'bg-red-50' : ''
                }`}
              >
                <td className="p-2">{student.id}</td>
                <td className="p-2 flex items-center gap-3">
                  <div>{student.name}</div>
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
                    <button
                      onClick={() => startCamera(student.id)}
                      disabled={locked}
                      title="Open camera for this student"
                      className="px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700"
                    >
                      📷
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Camera Modal (inline) */}
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
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={locked}
            className={`px-6 py-2 rounded-lg text-white font-semibold ${
              locked ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-800 hover:bg-blue-700'
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

import React from "react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useContext, useRef } from "react";
import DataContext from '../context/DataContext';
import UserContext from '../context/UserContext';
import ToastContext from '../context/ToastContext';
import slugify from '../utils/slugify';
import AttendanceAnalytics from './AttendanceAnalytics';

function TeacherDashboard(){
  const navigate = useNavigate();
  const { departments, leaveRequests, updateLeaveRequest, getAssignmentsForTeacher, getWeeklyScheduleForTeacher } = useContext(DataContext);
  const { user } = useContext(UserContext);
  const { showToast } = useContext(ToastContext);

  const [selectedDept, setSelectedDept] = useState(() => localStorage.getItem('selectedDept') || (departments[0]?.name || ''));
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ course_count: 0, student_count: 0, pending_requests: 0 });
  const [weeklySchedule, setWeeklySchedule] = useState([]);

  // Camera refs/state for quick Mark (Camera) flow
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOnQuick, setCameraOnQuick] = useState(false);

  // Fetch teacher courses, stats, and weekly schedule from backend
  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        setLoading(true);
        const teacherId = user?.id || JSON.parse(localStorage.getItem('user'))?.id;
        
        if (!teacherId) {
          showToast('Teacher ID not found', 'error');
          return;
        }

        // Fetch courses
        const coursesResponse = await fetch(`http://127.0.0.1:5000/api/teacher-dashboard/my-courses?teacher_id=${teacherId}`);
        
        if (!coursesResponse.ok) {
          throw new Error(`HTTP error! status: ${coursesResponse.status}`);
        }
        
        const coursesData = await coursesResponse.json();
        setCourses(coursesData.courses || []);
        
        // Fetch stats
        const statsResponse = await fetch(`http://127.0.0.1:5000/api/teacher-dashboard/stats?teacher_id=${teacherId}`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
        
        // Fetch weekly schedule
        const scheduleResponse = await fetch(`http://127.0.0.1:5000/api/teacher-dashboard/weekly-schedule?teacher_id=${teacherId}`);
        if (scheduleResponse.ok) {
          const scheduleData = await scheduleResponse.json();
          setWeeklySchedule(scheduleData.schedule || []);
        }
        
      } catch (error) {
        console.error('Error fetching teacher data:', error);
        showToast('Failed to load dashboard data', 'error');
        setCourses([]);
        setWeeklySchedule([]);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchTeacherData();
    }
  }, [user, showToast]);

  // Fetch students for a specific course
  const fetchCourseStudents = async (classId) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/teacher-dashboard/course-students/${classId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.students || [];
      
    } catch (error) {
      console.error('Error fetching course students:', error);
      showToast('Failed to load students', 'error');
      return [];
    }
  };

  // Handle view students - show in modal or navigate to subject details
  const handleViewStudents = async (course) => {
    try {
      showToast('Loading students...', 'info');
      const students = await fetchCourseStudents(course.schedule_id);
      
      // Navigate to subject details page with the students data
      navigate(`/departments/${slugify(course.department)}/${slugify(course.subject)}`, { 
        state: { 
          course: `${course.department} - ${course.subject}`,
          students: students,
          courseInfo: course
        } 
      });
      
    } catch (error) {
      console.error('Error loading students:', error);
      showToast('Failed to load students', 'error');
    }
  };

  // Handle mark attendance - navigate to take-attendance page
  const handleMarkAttendance = (course) => {
    navigate('/take-attendance', { 
      state: { 
        course: `${course.department} - ${course.subject}`,
        dept: course.department,
        subject: course.subject,
        scheduleId: course.schedule_id
      } 
    });
  };

  // Camera setup effect
  useEffect(() => {
    if (cameraOnQuick && streamRef.current && videoRef.current) {
      try {
        videoRef.current.srcObject = streamRef.current;
        const p = videoRef.current.play();
        if (p && p.catch) p.catch(() => {});
      } catch (e) {
        // ignore autoplay errors
      }
    }
  }, [cameraOnQuick]);

  const handleQuickCapture = () => {
    if (!videoRef.current || !canvasRef.current) return showToast('Camera not ready', 'error');
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/png');
    
    // stop camera
    const tracks = streamRef.current?.getTracks() || [];
    tracks.forEach(t => t.stop());
    streamRef.current = null;
    setCameraOnQuick(false);
    
    // Navigate to take-attendance with captured image
    navigate('/take-attendance', { 
      state: { 
        image: data, 
        course: `${selectedDept}`, 
        dept: selectedDept 
      } 
    });
  };

  useEffect(() => {
    localStorage.setItem('selectedDept', selectedDept);
  }, [selectedDept]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <h1 className="text-3xl font-bold text-blue-900 mb-6 flex items-center gap-2">
        👩‍🏫 Teacher Dashboard
      </h1>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white shadow-md rounded-xl p-5">
          <h2 className="font-semibold text-gray-700">My Courses</h2>
          <p className="mt-1 text-blue-900 font-medium">
            {loading ? 'Loading...' : `${stats.course_count || courses.length} Courses Assigned`}
          </p>
          <p className="text-sm text-gray-500">Total courses you're teaching</p>
          
          <div className="mt-3">
            <select 
              value={selectedDept} 
              onChange={(e) => setSelectedDept(e.target.value)} 
              className="w-full border p-2 rounded"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-xl p-5 text-center">
          <h2 className="font-semibold text-gray-700">Pending Attendance Requests</h2>
          <p className="text-3xl text-red-600 font-bold mt-2">{stats.pending_requests || 0}</p>
          <p className="text-gray-500 text-sm">Awaiting approval</p>
          <button
            onClick={() => navigate("/attendance-requests")}
            className="mt-3 bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Review Requests
          </button>
        </div>

        <div className="bg-white shadow-md rounded-xl p-5 text-center">
          <h2 className="font-semibold text-gray-700">Total Students</h2>
          <p className="text-3xl font-bold mt-2 text-blue-600">
            {stats.student_count || courses.reduce((total, course) => total + (course.student_count || 0), 0)}
          </p>
          <p className="text-gray-500 text-sm">Across all courses</p>
        </div>
      </div>

      {/* My Courses Table */}
      <div className="bg-white shadow-md rounded-xl p-5 mb-6">
        <h2 className="text-lg font-bold text-blue-900 mb-3">📘 My Courses</h2>
        
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading courses...</p>
          </div>
        ) : courses.length === 0 ? (
          <p className="text-gray-600 text-center py-4">No courses assigned yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-800 text-white text-left">
                  <th className="p-3 rounded-l-lg">Subject</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Schedule</th>
                  <th className="p-3 text-center">Room</th>
                  <th className="p-3 text-center">Students</th>
                  <th className="p-3 text-center rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses
                  .filter(course => !selectedDept || course.department === selectedDept)
                  .map((course) => (
                    <tr key={course.schedule_id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{course.subject}</td>
                      <td className="p-3">{course.department}</td>
                      <td className="p-3">{course.schedule}</td>
                      <td className="p-3 text-center">{course.room}</td>
                      <td className="p-3 text-center">{course.student_count}</td>
                      <td className="p-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleViewStudents(course)}
                            className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 text-sm"
                          >
                            View Students
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(course)}
                            className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 text-sm"
                          >
                            Mark Attendance
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Weekly Schedule */}
      <div className="bg-white shadow-md rounded-xl p-5 mb-6">
        <h2 className="text-lg font-bold text-blue-900 mb-3">📅 Weekly Schedule</h2>
        {weeklySchedule.length === 0 ? (
          <p className="text-gray-600">No weekly schedule assigned. Contact admin.</p>
        ) : (
          <ul className="space-y-2 text-gray-700">
            {weeklySchedule.map((s) => {
              const parts = (s.time || '').split('-').map(p => p.trim());
              const start = parts[0] || '-';
              const end = parts[1] || '-';
              return (
                <li key={s.id}>
                  {s.day}: {s.dept} - {s.subject} — <span className="font-medium">{start}</span> to <span className="font-medium">{end}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Attendance Analytics */}
      <div className="bg-white shadow-md rounded-xl p-5 mb-6">
        <h2 className="text-lg font-bold text-blue-900 mb-3">📊 Attendance Analytics</h2>
        <AttendanceAnalytics />
      </div>

      {/* Quick Camera Modal */}
      {cameraOnQuick && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Quick Capture — {selectedDept}</h3>
              <div className="flex items-center gap-2">
                <button onClick={handleQuickCapture} className="px-3 py-1 bg-green-600 text-white rounded">Capture</button>
                <button onClick={() => {
                  const tracks = streamRef.current?.getTracks() || [];
                  tracks.forEach(t => t.stop());
                  streamRef.current = null;
                  setCameraOnQuick(false);
                }} className="px-3 py-1 bg-red-600 text-white rounded">Close</button>
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
    </div>
  );
}

export default TeacherDashboard;
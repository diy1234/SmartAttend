import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  
  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [notificationStats, setNotificationStats] = useState({
    unread_count: 0,
    today_count: 0,
    type_stats: {}
  });
  const [showNotifications, setShowNotifications] = useState(false);

  const location = useLocation();

  // Scroll to hash if present (allow navbar search to jump to sections)
  useEffect(() => {
    if (location && location.hash) {
      const id = location.hash.replace('#', '');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { el.scrollIntoView(); }
        }
      }, 80);
    }
  }, [location]);

  // Get unique departments from courses data
  const availableDepartments = [...new Set(courses.map(course => course.department).filter(Boolean))];

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
        console.log('Courses data:', coursesData);
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
        
        // Fetch notification stats
        await fetchNotificationStats();
        
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

  // Fetch notification statistics
  const fetchNotificationStats = async () => {
    try {
      const userId = user?.id || JSON.parse(localStorage.getItem('user'))?.id;
      
      if (!userId) return;

      const response = await fetch(
        `http://127.0.0.1:5000/api/notifications/stats?user_id=${userId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setNotificationStats(data);
      }
    } catch (error) {
      console.error('Error fetching notification stats:', error);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const userId = user?.id || JSON.parse(localStorage.getItem('user'))?.id;
      
      if (!userId) {
        showToast('User ID not found', 'error');
        return;
      }

      const response = await fetch(
        `http://127.0.0.1:5000/api/notifications?user_id=${userId}&limit=10`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setNotifications(data);
      setShowNotifications(true);
      
    } catch (error) {
      console.error('Error fetching notifications:', error);
      showToast('Failed to load notifications', 'error');
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/notifications/${notificationId}/read`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      
      setNotificationStats(prev => ({
        ...prev,
        unread_count: Math.max(0, prev.unread_count - 1)
      }));
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const userId = user?.id || JSON.parse(localStorage.getItem('user'))?.id;
      
      if (!userId) {
        showToast('User ID not found', 'error');
        return;
      }

      const response = await fetch(
        'http://127.0.0.1:5000/api/notifications/read-all',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: userId })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      
      setNotificationStats(prev => ({
        ...prev,
        unread_count: 0
      }));
      
      showToast('All notifications marked as read', 'success');
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      showToast('Failed to mark all notifications as read', 'error');
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    setShowNotifications(false);

    switch (notification.type) {
      case 'attendance_request':
        navigate('/attendance-requests');
        break;
      case 'class_scheduled':
        navigate('/teacher-dashboard');
        break;
      default:
        break;
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'attendance_request':
        return '📋';
      case 'class_scheduled':
        return '📅';
      case 'system':
        return '⚙️';
      default:
        return '📢';
    }
  };

  // Format date for notifications
  const formatNotificationDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Fetch students for a specific course
  const fetchCourseStudents = async (classId) => {
    try {
      console.log('Fetching students for class_id:', classId);
      const response = await fetch(`http://127.0.0.1:5000/api/teacher-dashboard/course-students/${classId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Students data:', data);
      return data.students || [];
      
    } catch (error) {
      console.error('Error fetching course students:', error);
      showToast('Failed to load students', 'error');
      return [];
    }
  };

  // Handle view students
  const handleViewStudents = async (course) => {
    try {
      showToast('Loading students...', 'info');
      const students = await fetchCourseStudents(course.id);
      
      console.log('Navigating with students:', students);
      
      // Transform students data to match SubjectDetails component expectations
      const transformedStudents = students.map(student => ({
        ...student,
        attendance: {
          percentage: student.attendance_percentage || 0,
          present_count: student.present_count || 0,
          total_classes: student.total_classes || 0
        }
      }));
      
      navigate(`/departments/${slugify(course.department)}/${slugify(course.subject)}`, { 
        state: { 
          course: `${course.department} - ${course.subject}`,
          students: transformedStudents,
          courseInfo: course,
          classId: course.id
        } 
      });
      
    } catch (error) {
      console.error('Error loading students:', error);
      showToast('Failed to load students', 'error');
    }
  };

  // Handle mark attendance
  const handleMarkAttendance = async (course) => {
    try {
      showToast('Loading students for attendance...', 'info');
      const students = await fetchCourseStudents(course.id);
      
      console.log('Navigating to attendance with students:', students);
      
      navigate('/take-attendance', { 
        state: { 
          course: `${course.department} - ${course.subject}`,
          dept: course.department,
          subject: course.subject,
          classId: course.id,
          students: students
        } 
      });
    } catch (error) {
      console.error('Error loading students for attendance:', error);
      showToast('Failed to load students', 'error');
    }
  };

  // Filter courses based on selected department
  const filteredCourses = selectedDept && selectedDept !== 'All Departments' 
    ? courses.filter(course => course.department === selectedDept)
    : courses;

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
      {/* Header with Notification Bell */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-900 flex items-center gap-2">
          👩‍🏫 Teacher Dashboard
        </h1>
        
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={fetchNotifications}
            className="relative p-3 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
          >
            <span className="text-2xl">🔔</span>
            {notificationStats.unread_count > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                {notificationStats.unread_count}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
                <div className="flex gap-2">
                  {notificationStats.unread_count > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                        !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-1">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-medium ${
                              !notification.is_read ? 'text-blue-900' : 'text-gray-800'
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.is_read && (
                              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                New
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatNotificationDate(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-3 border-t border-gray-200 text-center">
                <button
                  onClick={() => navigate('/notifications')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overview Cards - Updated with Notification Stats */}
      <div id="overview" className="grid md:grid-cols-4 gap-6 mb-6">
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
              <option value="All Departments">All Departments</option>
              {availableDepartments.map((dept, index) => (
                <option key={index} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Showing {filteredCourses.length} of {courses.length} courses
              {selectedDept !== 'All Departments' && ` in ${selectedDept}`}
            </p>
          </div>
        </div>

        <div id="requests" className="bg-white shadow-md rounded-xl p-5 text-center">
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

        <div id="notifications" className="bg-white shadow-md rounded-xl p-5 text-center">
          <h2 className="font-semibold text-gray-700">Total Students</h2>
          <p className="text-3xl font-bold mt-2 text-blue-600">
            {stats.student_count || courses.reduce((total, course) => total + (course.student_count || 0), 0)}
          </p>
          <p className="text-gray-500 text-sm">Across all courses</p>
        </div>

        {/* New Notification Stats Card */}
        <div className="bg-white shadow-md rounded-xl p-5 text-center">
          <h2 className="font-semibold text-gray-700">Notifications</h2>
          <p className="text-3xl font-bold mt-2 text-purple-600">
            {notificationStats.unread_count || 0}
          </p>
          <p className="text-gray-500 text-sm">Unread notifications</p>
          <button
            onClick={() => navigate("/notifications")}
            className="mt-3 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            View All
          </button>
        </div>
      </div>

      {/* Rest of the component remains the same */}
      {/* My Courses Table */}
      <div id="courses" className="bg-white shadow-md rounded-xl p-5 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-blue-900">📘 My Courses</h2>
          {selectedDept !== 'All Departments' && (
            <button 
              onClick={() => setSelectedDept('All Departments')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Show All Departments
            </button>
          )}
        </div>
        
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading courses...</p>
          </div>
        ) : courses.length === 0 ? (
          <p className="text-gray-600 text-center py-4">No courses assigned yet.</p>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-600">No courses found for department: {selectedDept}</p>
            <button 
              onClick={() => setSelectedDept('All Departments')}
              className="mt-2 text-blue-600 hover:underline"
            >
              Show all courses
            </button>
          </div>
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
                {filteredCourses.map((course) => (
                  <tr key={course.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{course.subject}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        course.department === 'Computer Science' ? 'bg-blue-100 text-blue-800' :
                        course.department === 'Mathematics' ? 'bg-green-100 text-green-800' :
                        course.department === 'Physics' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {course.department}
                      </span>
                    </td>
                    <td className="p-3">{course.schedule}</td>
                    <td className="p-3 text-center">{course.room}</td>
                    <td className="p-3 text-center">
                      <span className="font-semibold text-blue-600">{course.student_count}</span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleViewStudents(course)}
                          className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 text-sm transition-colors"
                        >
                          View Students
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(course)}
                          className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 text-sm transition-colors"
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
      <div id="schedule" className="bg-white shadow-md rounded-xl p-5 mb-6">
        <h2 className="text-lg font-bold text-blue-900 mb-3">📅 Weekly Schedule</h2>
        {weeklySchedule.length === 0 ? (
          <p className="text-gray-600">No weekly schedule assigned. Contact admin.</p>
        ) : (
          <div className="space-y-3">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
              const daySchedules = weeklySchedule.filter(s => s.day === day);
              if (daySchedules.length === 0) return null;
              
              return (
                <div key={day} className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-gray-800">{day}</h3>
                  <div className="space-y-2 mt-1">
                    {daySchedules.map((schedule) => {
                      const parts = (schedule.time || '').split('-').map(p => p.trim());
                      const start = parts[0] || '-';
                      const end = parts[1] || '-';
                      return (
                        <div key={schedule.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                          <div>
                            <span className="font-medium">{schedule.subject}</span>
                            <span className="text-gray-600 text-sm ml-2">({schedule.department})</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {start} to {end} • {schedule.room}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Attendance Analytics */}
      <div id="analytics" className="bg-white shadow-md rounded-xl p-5 mb-6">
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
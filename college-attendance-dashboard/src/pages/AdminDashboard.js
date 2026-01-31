import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import UserContext from '../context/UserContext';
import ToastContext from '../context/ToastContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total_students: 0,
    total_teachers: 0,
    total_departments: 0,
    total_courses: 0,
    avg_attendance: 0,
  });

  const [departmentAttendance, setDepartmentAttendance] = useState([]);
  const [distribution, setDistribution] = useState({ above_75: 0, below_75: 0 });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const navigate = useNavigate();
  const [notificationStats, setNotificationStats] = useState({ unread_count: 0 });

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [activeDepartments, setActiveDepartments] = useState([]);

  // contexts
  const { user } = useContext(UserContext);
  const { showToast } = useContext(ToastContext);

  // Fetch all dashboard data on load
  useEffect(() => {
    fetchDashboardData();
    fetchNotificationStats();
  }, []);

  const fetchDashboardData = async () => {
  setLoading(true);

  try {
    const statsRes = await fetch("http://127.0.0.1:5000/api/admin/stats");
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      setStats({
        total_students: Number(statsData.total_students),
        total_teachers: Number(statsData.total_teachers),
        total_departments: Number(statsData.total_departments),
        total_courses: Number(statsData.total_courses),
        avg_attendance: Number(statsData.avg_attendance),
      });
    } else {
      console.error("Stats API failed:", statsRes.status);
    }
  } catch (e) {
    console.error("Stats fetch error:", e);
  }

  try {
    const deptRes = await fetch("http://127.0.0.1:5000/api/admin/department-attendance");
    if (deptRes.ok) {
      const deptData = await deptRes.json();
      setDepartmentAttendance(deptData);
    }
  } catch (e) {
    console.error("Department fetch error:", e);
  }

  try {
    const distRes = await fetch("http://127.0.0.1:5000/api/admin/attendance-distribution");
    if (distRes.ok) {
      const distData = await distRes.json();
      setDistribution(distData);
    }
  } catch (e) {
    console.error("Distribution fetch error:", e);
  }

  try {
  const deptListRes = await fetch("http://127.0.0.1:5000/api/admin/active-departments");
  if (deptListRes.ok) {
    const list = await deptListRes.json();
    setActiveDepartments(list);
  }} catch (e) {
    console.error("Active departments fetch error:", e);
  }

  setLoading(false);
  setLastUpdated(new Date());
};

  // Notification helpers
  const fetchNotificationStats = async () => {
    try {
      const userId = user?.id || JSON.parse(localStorage.getItem('user'))?.id;
      if (!userId) return;
      const res = await fetch(`http://127.0.0.1:5000/api/notifications/stats?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setNotificationStats(data);
      }
    } catch (err) {
      console.error('Error fetching notification stats:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const userId = user?.id || JSON.parse(localStorage.getItem('user'))?.id;
      if (!userId) {
        showToast && showToast('User ID not found', 'error');
        return;
      }

      const res = await fetch(`http://127.0.0.1:5000/api/notifications?user_id=${userId}&limit=20`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNotifications(data);
      setShowNotifications(true);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      showToast && showToast('Failed to load notifications', 'error');
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/notifications/${notificationId}/read`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
      setNotificationStats(prev => ({ ...prev, unread_count: Math.max(0, (prev.unread_count || 0) - 1) }));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const userId = user?.id || JSON.parse(localStorage.getItem('user'))?.id;
      if (!userId) return;
      const res = await fetch('http://127.0.0.1:5000/api/notifications/read-all', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setNotificationStats(prev => ({ ...prev, unread_count: 0 }));
      showToast && showToast(result.message || 'Marked all as read', 'success');
    } catch (err) {
      console.error('Error marking all as read:', err);
      showToast && showToast('Failed to mark all as read', 'error');
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) markAsRead(notification.id);
    setShowNotifications(false);
    switch (notification.type) {
      case 'attendance_request':
        navigate('/attendance-requests');
        break;
      case 'class_scheduled':
        navigate('/teacher-dashboard');
        break;
      default:
        navigate('/notifications');
        break;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'attendance_request': return '📋';
      case 'class_scheduled': return '📅';
      case 'system': return '⚙️';
      default: return '📢';
    }
  };

  const formatNotificationDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays === 1) return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };


  const refreshData = () => {
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600 text-lg">
          Loading live data from database...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#132E6B] flex items-center gap-2">
          🏫 Admin Dashboard
          <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
          </span>
        </h1>

        <div className="flex items-center gap-3">
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

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-800">Notifications</h3>
                  <div className="flex gap-2">
                    {notificationStats.unread_count > 0 && (
                      <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-800">Mark all read</button>
                    )}
                    <button onClick={() => setShowNotifications(false)} className="text-xs text-gray-500 hover:text-gray-700">✕</button>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No notifications</div>
                  ) : (
                    notifications.map((notification) => (
                      <div key={notification.id} onClick={() => handleNotificationClick(notification)} className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${!notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
                        <div className="flex items-start gap-3">
                          <span className="text-lg mt-1">{getNotificationIcon(notification.type)}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`font-medium ${!notification.is_read ? 'text-blue-900' : 'text-gray-800'}`}>{notification.title}</h4>
                              {!notification.is_read && (<span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">New</span>)}
                            </div>
                            <p className="text-gray-600 text-sm mb-2">{notification.message}</p>
                            <p className="text-xs text-gray-400">{formatNotificationDate(notification.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3 border-t border-gray-200 text-center">
                  <button onClick={() => navigate('/notifications')} className="text-blue-600 hover:text-blue-800 text-sm font-medium">View All Notifications</button>
                </div>
              </div>
            )}
          </div>

          <button onClick={refreshData} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">🔄 Refresh Data</button>
        </div>
      </div>


      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div
          onClick={() => navigate("/students")}
          className="cursor-pointer p-6 rounded-xl shadow text-white bg-blue-500 hover:scale-105 transition-transform"
        >
          <div className="text-sm">Total Students</div>
          <div className="text-2xl font-bold mt-2">{stats.total_students}</div>
          <div className="text-xs opacity-75 mt-1">From Database</div>
        </div>

        <div
          onClick={() => navigate("/teachers")}
          className="cursor-pointer p-6 rounded-xl shadow text-white bg-green-500 hover:scale-105 transition-transform"
        >
          <div className="text-sm">Total Teachers</div>
          <div className="text-2xl font-bold mt-2">{stats.total_teachers}</div>
          <div className="text-xs opacity-75 mt-1">Active</div>
        </div>

        <div
          onClick={() => navigate("/departments")}
          className="cursor-pointer p-6 rounded-xl shadow text-white bg-yellow-500 hover:scale-105 transition-transform"
        >
          <div className="text-sm">Departments</div>
          <div className="text-2xl font-bold mt-2">
            {stats.total_departments}
          </div>
          <div className="text-xs opacity-75 mt-1">Available</div>
        </div>

        <div
          onClick={() => navigate("/courses")}
          className="cursor-pointer p-6 rounded-xl shadow text-white bg-purple-500 hover:scale-105 transition-transform"
        >
          <div className="text-sm">Courses</div>
          <div className="text-2xl font-bold mt-2">{stats.total_courses}</div>
          <div className="text-xs opacity-75 mt-1">Active</div>
        </div>

        <div
          onClick={() => navigate("/attendance-analytics")}
          className="cursor-pointer p-6 rounded-xl shadow text-white bg-pink-500 hover:scale-105 transition-transform"
        >
          <div className="text-sm">Avg Attendance</div>
          <div className="text-2xl font-bold mt-2">
            {stats.avg_attendance}%
          </div>
          <div className="text-xs opacity-75 mt-1">Overall</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Department Attendance Chart */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-[#132E6B]">
            Department Attendance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentAttendance}>
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="percent" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Attendance Distribution Pie Chart */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-[#132E6B]">
            Attendance Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: "Above 75%", value: distribution.above_75 || 0 },
                  { name: "Below 75%", value: distribution.below_75 || 0 },
                ]}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label
              >
                <Cell fill="#10B981" />
                <Cell fill="#3B82F6" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active Departments */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4 text-[#132E6B]">
          📚 Active Departments
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeDepartments.length > 0 ? (
  activeDepartments.map((dept, idx) => (
    <div
      key={idx}
      onClick={() =>
        navigate(`/department-subjects?dept=${encodeURIComponent(dept.department)}`)
      }
      className="cursor-pointer border p-4 rounded-lg hover:shadow-md hover:bg-gray-50 transition"
    >
      <div className="font-semibold text-gray-800">
        {dept.department}
      </div>
      <div className="text-sm text-gray-500">
        Subjects: {dept.total_subjects}
      </div>
    </div>
  ))
) : (
  <div className="text-gray-500">No departments found.</div>
)}

        </div>
      </div>

      {/* Manage Departments Section */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold mb-3 text-[#132E6B]">
          Manage Departments & Courses
        </h3>
        <p className="text-gray-700 mb-4">
        </p>
        <Link
          to="/manage-departments"
          className="inline-block px-4 py-2 bg-blue-800 text-white rounded hover:bg-blue-900"
        >
          Open Manage Departments
        </Link>
      </div>

      
    </div>
  );
}

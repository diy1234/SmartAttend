import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from "../context/UserContext";
import ToastContext from "../context/ToastContext";

const Notifications = () => {
  const { user } = useContext(UserContext);
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    unread_count: 0,
    today_count: 0,
    type_stats: {}
  });
  const [filter, setFilter] = useState('all');

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const userId = user?.id || JSON.parse(localStorage.getItem('user'))?.id;
      
      if (!userId) {
        showToast('User ID not found', 'error');
        return;
      }

      const unreadOnly = filter === 'unread';
      const response = await fetch(
        `http://127.0.0.1:5000/api/notifications?user_id=${userId}&unread_only=${unreadOnly}&limit=100`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setNotifications(data);
      
    } catch (error) {
      console.error('Error fetching notifications:', error);
      showToast('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch notification stats
  const fetchNotificationStats = async () => {
    try {
      const userId = user?.id || JSON.parse(localStorage.getItem('user'))?.id;
      
      if (!userId) return;

      const response = await fetch(
        `http://127.0.0.1:5000/api/notifications/stats?user_id=${userId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching notification stats:', error);
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
      
      setStats(prev => ({
        ...prev,
        unread_count: Math.max(0, prev.unread_count - 1)
      }));
      
      showToast('Notification marked as read', 'success');
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
      showToast('Failed to mark notification as read', 'error');
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

      const result = await response.json();
      
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      
      setStats(prev => ({
        ...prev,
        unread_count: 0
      }));
      
      showToast(result.message, 'success');
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      showToast('Failed to mark all notifications as read', 'error');
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/notifications/${notificationId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      showToast('Notification deleted', 'success');
      
    } catch (error) {
      console.error('Error deleting notification:', error);
      showToast('Failed to delete notification', 'error');
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    switch (notification.type) {
      case 'attendance_request':
        navigate('/attendance-requests');
        break;
      case 'class_scheduled':
        navigate('/teacher-dashboard');
        break;
      case 'system':
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

  // Get notification type label
  const getNotificationTypeLabel = (type) => {
    switch (type) {
      case 'attendance_request':
        return 'Attendance Request';
      case 'class_scheduled':
        return 'Class Schedule';
      case 'system':
        return 'System';
      default:
        return 'General';
    }
  };

  // Format date
  const formatDate = (dateString) => {
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

  // Load data on component mount and when filter changes
  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchNotificationStats();
    }
  }, [user, filter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Notifications</h1>
            <p className="text-gray-600 mt-2">
              {stats.unread_count > 0 
                ? `${stats.unread_count} unread notification${stats.unread_count !== 1 ? 's' : ''}`
                : 'All caught up!'
              }
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(-1)}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Back
            </button>
            {stats.unread_count > 0 && (
              <button
                onClick={markAllAsRead}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Mark All as Read
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.unread_count}</div>
            <div className="text-gray-600 text-sm">Unread Notifications</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.today_count}</div>
            <div className="text-gray-600 text-sm">Today's Notifications</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-2xl font-bold text-purple-600">{notifications.length}</div>
            <div className="text-gray-600 text-sm">Total Notifications</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Notifications
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'unread' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Unread Only
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-lg shadow">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No notifications
              </h3>
              <p className="text-gray-500">
                {filter === 'unread' 
                  ? "You're all caught up! No unread notifications."
                  : "You don't have any notifications yet."
                }
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 cursor-pointer transition-colors border-b border-gray-100 hover:bg-gray-50 ${
                    !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4 flex-1">
                      <div className="text-2xl mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className={`font-semibold ${
                            !notification.is_read ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {notification.title}
                          </h3>
                          <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                            {getNotificationTypeLabel(notification.type)}
                          </span>
                          {!notification.is_read && (
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 mb-3">{notification.message}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{formatDate(notification.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="text-blue-600 text-sm border-none bg-transparent cursor-pointer hover:text-blue-800"
                        >
                          Mark Read
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="text-red-600 text-sm border-none bg-transparent cursor-pointer hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
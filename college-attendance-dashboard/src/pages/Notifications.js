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
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        padding: '24px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            animation: 'spin 1s linear infinite',
            borderRadius: '50%',
            height: '48px',
            width: '48px',
            borderBottom: '2px solid #1e40af',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '16px', color: '#4b5563' }}>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      padding: '24px'
    }}>
      <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{
              fontSize: '30px',
              fontWeight: 'bold',
              color: '#1e3a8a'
            }}>Notifications</h1>
            <p style={{ color: '#4b5563', marginTop: '4px' }}>
              {stats.unread_count > 0 
                ? `${stats.unread_count} unread notification${stats.unread_count !== 1 ? 's' : ''}`
                : 'All caught up!'
              }
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                backgroundColor: '#374151',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#374151'}
            >
              ← Back
            </button>
            {stats.unread_count > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  backgroundColor: '#2563eb',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
              >
                Mark All as Read
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>
              {stats.unread_count}
            </div>
            <div style={{ color: '#4b5563', fontSize: '14px' }}>Unread Notifications</div>
          </div>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
              {stats.today_count}
            </div>
            <div style={{ color: '#4b5563', fontSize: '14px' }}>Today's Notifications</div>
          </div>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7c3aed' }}>
              {notifications.length}
            </div>
            <div style={{ color: '#4b5563', fontSize: '14px' }}>Total Notifications</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: filter === 'all' ? '#2563eb' : '#e5e7eb',
                color: filter === 'all' ? 'white' : '#374151'
              }}
              onMouseOver={(e) => {
                if (filter !== 'all') {
                  e.target.style.backgroundColor = '#d1d5db';
                }
              }}
              onMouseOut={(e) => {
                if (filter !== 'all') {
                  e.target.style.backgroundColor = '#e5e7eb';
                }
              }}
            >
              All Notifications
            </button>
            <button
              onClick={() => setFilter('unread')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: filter === 'unread' ? '#2563eb' : '#e5e7eb',
                color: filter === 'unread' ? 'white' : '#374151'
              }}
              onMouseOver={(e) => {
                if (filter !== 'unread') {
                  e.target.style.backgroundColor = '#d1d5db';
                }
              }}
              onMouseOut={(e) => {
                if (filter !== 'unread') {
                  e.target.style.backgroundColor = '#e5e7eb';
                }
              }}
            >
              Unread Only
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📭</div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                No notifications
              </h3>
              <p style={{ color: '#6b7280' }}>
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
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: !notification.is_read ? '#eff6ff' : 'transparent',
                    borderLeft: !notification.is_read ? '4px solid #3b82f6' : 'none'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = !notification.is_read ? '#dbeafe' : '#f9fafb';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = !notification.is_read ? '#eff6ff' : 'transparent';
                  }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                      <div style={{ fontSize: '24px', marginTop: '4px' }}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h3 style={{
                            fontWeight: '600',
                            color: !notification.is_read ? '#1e40af' : '#111827'
                          }}>
                            {notification.title}
                          </h3>
                          <span style={{
                            backgroundColor: '#e5e7eb',
                            color: '#374151',
                            fontSize: '12px',
                            padding: '2px 8px',
                            borderRadius: '4px'
                          }}>
                            {getNotificationTypeLabel(notification.type)}
                          </span>
                          {!notification.is_read && (
                            <span style={{
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              fontSize: '12px',
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}>
                              New
                            </span>
                          )}
                        </div>
                        <p style={{ color: '#374151', marginBottom: '8px' }}>{notification.message}</p>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          fontSize: '14px',
                          color: '#6b7280'
                        }}>
                          <span>{formatDate(notification.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          style={{
                            color: '#2563eb',
                            fontSize: '14px',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer'
                          }}
                          onMouseOver={(e) => e.target.style.color = '#1d4ed8'}
                          onMouseOut={(e) => e.target.style.color = '#2563eb'}
                        >
                          Mark Read
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        style={{
                          color: '#dc2626',
                          fontSize: '14px',
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer'
                        }}
                        onMouseOver={(e) => e.target.style.color = '#b91c1c'}
                        onMouseOut={(e) => e.target.style.color = '#dc2626'}
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

      {/* Add CSS for spinner animation */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default Notifications;
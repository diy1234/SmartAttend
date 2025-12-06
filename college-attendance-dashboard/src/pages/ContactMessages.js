import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ContactMessages() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Check if user is admin
  useEffect(() => {
    if (user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchMessages();
  }, [user.role, navigate]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://127.0.0.1:5000/api/contact/messages', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      setMessages(Array.isArray(data) ? data : data.messages || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/contact/messages/${messageId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        // Update local state
        setMessages(messages.map(msg => 
          msg.id === messageId ? { ...msg, status: 'read' } : msg
        ));
      }
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading contact messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="text-3xl text-[#132E6B]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="#132E6B" viewBox="0 0 24 24">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-[#132E6B]">Contact Messages</h1>
          </div>
          <button 
            onClick={fetchMessages}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-800">
              <span className="text-lg">⚠️</span>
              <div>
                <strong>Error:</strong> {error}
              </div>
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 text-lg">No contact messages yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                  message.status === 'read' ? 'border-gray-400' : 'border-blue-600'
                } hover:shadow-lg transition-shadow`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#132E6B]">{message.name}</h3>
                    <p className="text-gray-600 text-sm">{message.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      message.status === 'read' 
                        ? 'bg-gray-200 text-gray-800' 
                        : 'bg-blue-200 text-blue-800'
                    }`}>
                      {message.status === 'read' ? 'Read' : 'Unread'}
                    </span>
                    {message.status !== 'read' && (
                      <button
                        onClick={() => markAsRead(message.id)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-gray-600 text-sm font-medium mb-2">Message:</h4>
                  <p className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-4 rounded border border-gray-200">
                    {message.message}
                  </p>
                </div>

                <div className="text-xs text-gray-500">
                  {new Date(message.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

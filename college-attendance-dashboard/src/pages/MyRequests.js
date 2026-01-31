import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function MyRequests() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [attendanceRequests, setAttendanceRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const user = JSON.parse(localStorage.getItem('user')) || {};

  // Debug function to check user data
  const debugUserInfo = () => {
    console.log("👤 USER DEBUG INFO:");
    console.log("   User object:", user);
    console.log("   User ID:", user.id || user.user_id);
    console.log("   User email:", user.email);
    console.log("   User role:", user.role);
  };

  // Fetch attendance requests from backend
  const fetchAttendanceRequests = async () => {
    try {
      debugUserInfo();
      const userId = user.id || user.user_id;
      
      if (!userId) {
        const errorMsg = 'No user ID found in localStorage';
        console.error(errorMsg);
        setError(errorMsg);
        setLoading(false);
        return;
      }

      console.log("🔄 Fetching attendance requests for user ID:", userId);
      
      // Try multiple endpoint variations (use axios baseURL - don't include the `/api` prefix)
      const endpoints = [
        `/attendance-requests/requests/student/${userId}`, // endpoint that returns list directly
        `/attendance-requests/student/${userId}`,
        `/attendance-requests?student_id=${userId}`
      ];

      let response = null;
      let successfulEndpoint = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`   Trying endpoint: ${endpoint}`);
          response = await api.get(endpoint);
          // Accept array responses, or responses with `requests` or a `success` flag
          if (response.data && (Array.isArray(response.data) || response.data.requests || response.data.success)) {
            successfulEndpoint = endpoint;
            console.log(`   ✅ Success with endpoint: ${endpoint}`);
            break;
          }
        } catch (err) {
          console.log(`   ❌ Failed with endpoint: ${endpoint}`, err.response?.data || err.message);
        }
      }

      if (!response || !response.data) {
        const errorMsg = 'No successful API response from any endpoint';
        console.error(errorMsg);
        setError(errorMsg);
        setLoading(false);
        return;
      }

      console.log("📊 API Response:", response.data);
      
      // Handle different response formats
      let requests = [];
      if (response.data.requests) {
        requests = response.data.requests;
      } else if (response.data.attendances) {
        requests = response.data.attendances;
      } else if (Array.isArray(response.data)) {
        requests = response.data;
      }

      console.log("✅ Processed requests:", requests);
      setAttendanceRequests(requests);
      setError(null);

    } catch (error) {
      console.error('❌ Error fetching attendance requests:', error);
      setError(`Failed to load requests: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Test direct database connection (for debugging)
  const testDirectConnection = async () => {
    try {
      console.log("🧪 Testing direct connection...");
      const userId = user.id || user.user_id;
      
      // Test if backend is reachable
      const healthResponse = await api.get('/api/health');
      console.log("   Backend health:", healthResponse.data);

      // Test if user exists in database
      const profileResponse = await api.get(`/users/profile?user_id=${userId}`);
      console.log("   User profile:", profileResponse.data);

    } catch (err) {
      console.error("   Direct connection test failed:", err);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchAttendanceRequests();
    testDirectConnection();
  }, []);

  // Refresh requests
  const refreshRequests = async () => {
    setRefreshing(true);
    setError(null);
    await fetchAttendanceRequests();
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Format reason text
  const formatReason = (reason) => {
    if (!reason) return 'No reason provided';
    return reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get status badge with colors
  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      'approved': { color: 'bg-green-100 text-green-800', label: 'Approved' },
      'rejected': { color: 'bg-red-100 text-red-800', label: 'Rejected' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your requests...</p>
          <p className="text-sm text-gray-500 mt-2">Checking database connection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">My Attendance Requests</h1>
          <p className="text-gray-700 mt-1">
            Showing requests for: <strong>{user.name || user.email}</strong>
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={refreshRequests}
            disabled={refreshing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {refreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Refreshing...
              </>
            ) : (
              <>
                🔄 Refresh
              </>
            )}
          </button>
          <button 
            onClick={() => navigate('/student-dashboard')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200"
          >
            ← Dashboard
          </button>
        </div>
      </div>

      {/* Debug Information */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-800">
            <span className="text-lg">⚠️</span>
            <div>
              <strong>Error Loading Requests:</strong> {error}
            </div>
          </div>
          <div className="mt-2 text-sm text-red-700">
            <p>User ID: {user.id || user.user_id || 'Not found'}</p>
            <p>Check browser console for detailed debug information</p>
          </div>
        </div>
      )}

      <div className="bg-white shadow-md rounded-xl p-6">
        {attendanceRequests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Attendance Requests Found</h3>
            <p className="text-gray-500 mb-4">
              {error 
                ? "Could not load your requests. Please check the error message above."
                : "You haven't submitted any attendance requests yet, or there are no requests in the database."
              }
            </p>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => navigate('/student-dashboard')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
              >
                Submit Your First Request
              </button>
              <button 
                onClick={refreshRequests}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
              >
                Try Again
              </button>
            </div>
            
            {/* Debug Actions */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Debug Information:</p>
              <div className="text-xs text-gray-500 font-mono">
                <p>User ID: {user.id || user.user_id || 'Not found'}</p>
                <p>User Email: {user.email || 'Not found'}</p>
                <p>Requests in state: {attendanceRequests.length}</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex justify-between items-center">
              <p className="text-gray-600">
                Showing <strong>{attendanceRequests.length}</strong> attendance request{attendanceRequests.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Approved</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Rejected</span>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-800 text-white">
                    <th className="p-4 text-left font-semibold">Subject</th>
                    <th className="p-4 text-left font-semibold">Department</th>
                    <th className="p-4 text-left font-semibold">Date</th>
                    <th className="p-4 text-left font-semibold">Reason</th>
                    <th className="p-4 text-left font-semibold">Status</th>
                    <th className="p-4 text-left font-semibold">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRequests.map(request => (
                    <tr key={request.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium text-gray-800">
                        {request.subject || 'N/A'}
                      </td>
                      <td className="p-4 text-gray-700">
                        {request.department || 'N/A'}
                      </td>
                      <td className="p-4 text-gray-700">
                        {formatDate(request.request_date)}
                      </td>
                      <td className="p-4 text-gray-700">
                        <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">
                          {formatReason(request.reason)}
                        </span>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="p-4 text-gray-700 text-sm">
                        {formatDate(request.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
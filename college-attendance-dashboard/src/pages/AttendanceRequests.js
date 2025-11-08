import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from "../context/UserContext";
import ToastContext from "../context/ToastContext";

function AttendanceRequests() {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { showToast } = useContext(ToastContext);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teacherProfileId, setTeacherProfileId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Get teacher profile ID
  useEffect(() => {
    const getTeacherProfileId = async () => {
      if (user?.role === 'teacher' && user?.id) {
        try {
          const response = await fetch(`http://127.0.0.1:5000/api/teachers/profile-by-user/${user.id}`);
          
          if (response.ok) {
            const profileData = await response.json();
            setTeacherProfileId(profileData.teacher_profile_id);
          } else {
            throw new Error('Could not get teacher profile');
          }
        } catch (error) {
          console.error('Error fetching teacher profile:', error);
          showToast('Failed to load teacher profile', 'error');
        }
      }
    };

    getTeacherProfileId();
  }, [user, showToast]);

  // Fetch all attendance requests for teacher
  useEffect(() => {
    const fetchTeacherRequests = async () => {
      if (user?.role !== 'teacher' || !teacherProfileId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`http://127.0.0.1:5000/api/attendance-requests/teacher/${teacherProfileId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setRequests(data.requests || []);
        
      } catch (error) {
        console.error('Error fetching attendance requests:', error);
        showToast('Failed to load attendance requests', 'error');
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherRequests();
  }, [user, teacherProfileId, showToast]);

  // Handle approve action
  const handleApprove = async (requestId) => {
    setActionLoading(requestId);
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/attendance-requests/requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Update the request in the list
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: 'approved', responded_at: new Date().toISOString() } : req
      ));
      
      showToast(`✅ ${result.message}`, 'success');
      
    } catch (error) {
      console.error(`Error approving request:`, error);
      showToast(`Failed to approve request: ${error.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle reject action
  const handleReject = async (requestId) => {
    setActionLoading(requestId);
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/attendance-requests/requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Update the request in the list
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: 'rejected', responded_at: new Date().toISOString() } : req
      ));
      
      showToast(`❌ ${result.message}`, 'success');
      
    } catch (error) {
      console.error(`Error rejecting request:`, error);
      showToast(`Failed to reject request: ${error.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter requests by status
  const pendingRequests = requests.filter(req => req.status === 'pending');
  const processedRequests = requests.filter(req => req.status !== 'pending');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendance requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">Student Attendance Requests</h1>
          <p className="text-gray-600 mt-2">
            {pendingRequests.length} pending, {processedRequests.length} processed
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Pending Requests Section */}
      {pendingRequests.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold text-blue-800">Pending Requests</h2>
            <span className="bg-red-500 text-white px-2 py-1 rounded-full text-sm">
              {pendingRequests.length}
            </span>
          </div>
          
          <div className="grid gap-4">
            {pendingRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-xl shadow-md border-l-4 border-yellow-500 p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="text-lg font-semibold text-gray-800">{request.student_name}</h3>
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                        PENDING
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Enrollment:</span>
                        <p className="font-medium">{request.enrollment_no}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Subject:</span>
                        <p className="font-medium">{request.subject}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Date:</span>
                        <p className="font-medium">{new Date(request.request_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Department:</span>
                        <p className="font-medium">{request.department}</p>
                      </div>
                    </div>
                    
                    {request.reason && (
                      <div className="mt-3">
                        <span className="text-gray-500 text-sm">Reason:</span>
                        <p className="text-gray-700 mt-1 bg-gray-50 p-3 rounded">{request.reason}</p>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-400 mt-2">
                      Submitted: {new Date(request.created_at).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={actionLoading === request.id}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {actionLoading === request.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          ✅ Approve
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      disabled={actionLoading === request.id}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {actionLoading === request.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          ❌ Reject
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processed Requests Section */}
      {processedRequests.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-blue-800 mb-4">Processed Requests</h2>
          
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left text-sm font-medium text-gray-500">Student</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500">Subject</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500">Date</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500">Reason</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500">Processed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {processedRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{request.student_name}</div>
                      <div className="text-sm text-gray-500">{request.enrollment_no}</div>
                    </td>
                    <td className="p-3 text-sm">{request.subject}</td>
                    <td className="p-3 text-sm">{new Date(request.request_date).toLocaleDateString()}</td>
                    <td className="p-3 text-sm text-gray-600">{request.reason || 'No reason provided'}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        request.status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {request.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-500">
                      {request.responded_at ? new Date(request.responded_at).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {requests.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Attendance Requests</h3>
          <p className="text-gray-500 mb-6">Students haven't submitted any attendance requests yet.</p>
        </div>
      )}
    </div>
  );
}

export default AttendanceRequests;
// AttendanceRequests.js (updated - pending only)
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

  // Get teacher profile ID (teacher)
  useEffect(() => {
    const getTeacherProfileId = async () => {
      if (user?.role === 'teacher' && user?.id) {
        try {
          const response = await fetch(`http://127.0.0.1:5000/api/teachers/profile-by-user/${user.id}`);
          if (response.ok) {
            const profileData = await response.json();
            setTeacherProfileId(profileData.teacher_profile_id);
          } else throw new Error('Could not get teacher profile');
        } catch (error) {
          console.error('Error fetching teacher profile:', error);
          showToast('Failed to load teacher profile', 'error');
        }
      }
    };
    getTeacherProfileId();
  }, [user, showToast]);

  // Fetch pending requests (teacher or admin)
  useEffect(() => {
    const fetchPending = async () => {
      if (!user) return;
      setLoading(true);
      try {
        let url = '';

        if (user.role === 'teacher') {
          if (!teacherProfileId) { setLoading(false); return; }
          url = `http://127.0.0.1:5000/api/attendance-requests/requests?teacher_id=${teacherProfileId}`;
        } else if (user.role === 'admin') {
          url = `http://127.0.0.1:5000/api/attendance-requests/requests/admin/pending`;
        } else {
          // students shouldn't use this page
          setRequests([]);
          setLoading(false);
          return;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        // teacher endpoint returns array, admin endpoint also returns array
        setRequests(Array.isArray(data) ? data : (data.requests || []));
      } catch (error) {
        console.error('Error fetching pending requests:', error);
        showToast('Failed to load pending requests', 'error');
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPending();
  }, [user, teacherProfileId, showToast]);

  const handleApprove = async (requestId) => {
    setActionLoading(requestId);
    try {
      let url = '';
      let body = null;
      if (user.role === 'teacher') {
        url = `http://127.0.0.1:5000/api/attendance-requests/requests/${requestId}/approve`;
      } else { // admin
        url = `http://127.0.0.1:5000/api/attendance-requests/requests/admin/${requestId}/approve`;
        body = JSON.stringify({ admin_user_id: user.id });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to approve');
      }

      // remove request from pending list (since processed moved to history)
      setRequests(prev => prev.filter(r => r.id !== requestId));
      showToast('Request approved', 'success');
    } catch (e) {
      console.error(e);
      showToast(e.message || 'Error', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId) => {
    setActionLoading(requestId);
    try {
      let url = '';
      let body = null;
      if (user.role === 'teacher') {
        url = `http://127.0.0.1:5000/api/attendance-requests/requests/${requestId}/reject`;
      } else {
        url = `http://127.0.0.1:5000/api/attendance-requests/requests/admin/${requestId}/reject`;
        body = JSON.stringify({ admin_user_id: user.id });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to reject');
      }

      setRequests(prev => prev.filter(r => r.id !== requestId));
      showToast('Request rejected', 'success');
    } catch (e) {
      console.error(e);
      showToast(e.message || 'Error', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pending requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{user.role === 'admin' ? 'Pending Attendance Requests' : 'Student Attendance Requests'}</h1>
          <p className="text-gray-600 mt-2">{requests.length} pending</p>
        </div>
        <button onClick={() => navigate(-1)} className="bg-gray-700 text-white px-4 py-2 rounded">← Back</button>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 bg-white p-6 rounded shadow">
          <div className="text-4xl mb-2">📝</div>
          <p className="text-gray-500">No pending attendance requests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req.id} className="bg-white rounded-xl shadow p-6 border-l-4 border-yellow-400 flex justify-between">
              <div>
                <h3 className="text-lg font-semibold">{req.student_name}</h3>
                <div className="text-sm text-gray-500">Enrollment: {req.enrollment_no}</div>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                  <div><div className="text-gray-500">Subject</div><div className="font-medium">{req.subject}</div></div>
                  <div><div className="text-gray-500">Date</div><div className="font-medium">{new Date(req.request_date).toLocaleDateString()}</div></div>
                </div>
                {req.reason && <div className="mt-3 bg-gray-50 p-3 rounded">{req.reason}</div>}
                <div className="text-xs text-gray-400 mt-2">Submitted: {new Date(req.created_at).toLocaleString()}</div>
                {user.role === 'admin' && <div className="text-sm text-gray-600 mt-1">Teacher: <b>{req.teacher_name}</b></div>}
              </div>

              <div className="flex flex-col gap-2">
                <button onClick={() => handleApprove(req.id)} disabled={actionLoading === req.id} className="bg-green-600 text-white px-4 py-2 rounded">
                  {actionLoading === req.id ? 'Processing...' : 'Approve'}
                </button>
                <button onClick={() => handleReject(req.id)} disabled={actionLoading === req.id} className="bg-red-600 text-white px-4 py-2 rounded">
                  {actionLoading === req.id ? 'Processing...' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AttendanceRequests;

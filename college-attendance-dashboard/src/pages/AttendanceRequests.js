// AttendanceRequests (final)
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from "../context/UserContext";
import ToastContext from "../context/ToastContext";
import { exportSheetsToExcel } from '../utils/exportUtils';

function AttendanceHistoryInline({ userProp }) {
  const userState = userProp || JSON.parse(localStorage.getItem("user")) || {};

  const [dept, setDept] = useState('');
  const [subject, setSubject] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [approvedByFilter, setApprovedByFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const fetchProcessedRequests = async () => {
      setLoadingHistory(true);
      try {
        const role = userState.role || 'student';
        let url = `http://127.0.0.1:5000/api/attendance-requests/requests/processed?role=${encodeURIComponent(role)}`;
        if (role === 'student') url += `&student_id=${encodeURIComponent(userState.student_id || userState.id)}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Failed to fetch');
        const data = await resp.json();
        setItems(data || []);
      } catch (e) {
        console.error(e);
        setItems([]);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchProcessedRequests();
  }, [userState.role, userState.id, userState.student_id]);

  const depts = Array.from(new Set((items || []).map(r => r.department).filter(Boolean)));

  useEffect(() => {
    let list = (items || []).slice();
    if (dept) list = list.filter(r => (r.department || '').toLowerCase() === dept.toLowerCase());
    if (subject) list = list.filter(r => (r.subject || '').toLowerCase().includes(subject.toLowerCase()));
    if (statusFilter === 'approved') list = list.filter(r => r.status === 'approved');
    if (statusFilter === 'rejected') list = list.filter(r => r.status === 'rejected');
    if (approvedByFilter === 'faculty') list = list.filter(r => (r.processed_by_role || '').toLowerCase() === 'teacher' || (r.processed_by_role || '').toLowerCase() === 'faculty');
    if (approvedByFilter === 'admin') list = list.filter(r => (r.processed_by_role || '').toLowerCase() === 'admin');
    if (classFilter) list = list.filter(r => ((r.section || r.class || '') === classFilter));
    setFiltered(list);
  }, [items, dept, subject, statusFilter, approvedByFilter, classFilter]);

  const handleExport = () => {
    if (!filtered.length) return alert('No records to export for the selected filters.');
    const rows = filtered.map(r => ({
      Student: r.student_name,
      Enrollment: r.enrollment_no,
      Subject: r.subject,
      Department: r.department,
      Date: r.request_date,
      Reason: r.reason,
      Status: r.status,
      'Processed At': r.responded_at,
      'Processed By': r.processed_by_name ? `${r.processed_by_name} (${r.processed_by_role || ''})` : (r.processed_by_role || '')
    }));
    exportSheetsToExcel(`processed-requests-${new Date().toISOString().slice(0,10)}`, [{ name: 'Requests', data: rows }]);
  };

  if (loadingHistory) return <div className="mt-8 p-6 bg-white rounded-xl shadow text-gray-600">Loading attendance history...</div>;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Attendance History</h2>
        <div className="text-sm text-gray-500">Showing {filtered.length} records</div>
      </div>

      <div className="bg-white p-4 rounded-2xl mb-6 shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm mb-1 text-gray-600">Course / Dept</label>
            <select value={dept} onChange={e => setDept(e.target.value)} className="border p-2 rounded w-full focus:ring-1 focus:ring-blue-500">
              <option value="">All</option>
              {depts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-600">Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject (optional)" className="border p-2 rounded w-full focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-600">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border p-2 rounded w-full focus:ring-1 focus:ring-blue-500">
              <option value="all">All</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-600">Processed By</label>
            <select value={approvedByFilter} onChange={e => setApprovedByFilter(e.target.value)} className="border p-2 rounded w-full focus:ring-1 focus:ring-blue-500">
              <option value="">All</option>
              <option value="faculty">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={() => { setDept(''); setSubject(''); setStatusFilter('all'); setApprovedByFilter(''); setClassFilter(''); }} className="px-3 py-2 bg-gray-100 rounded">Clear</button>
            <button onClick={handleExport} className="px-3 py-2 bg-blue-700 text-white rounded">Export</button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-600">No processed requests found for the current filters.</div>
        ) : (
          filtered.map(r => (
            <div key={r.id} className="bg-white rounded-2xl shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-start gap-4">
                  <div>
                    <div className="font-semibold text-gray-800">{r.student_name}</div>
                    <div className="text-sm text-gray-500">{r.enrollment_no}</div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm text-gray-600">{r.subject} • {r.department}</div>
                    <div className="text-xs text-gray-400">Requested: {r.request_date}</div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-700">{r.reason || 'No reason provided'}</div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-2">
                <div>
                  <span className={`px-3 py-1 text-sm rounded-full ${r.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {r.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-gray-500">Processed: {r.responded_at || '—'}</div>
                <div className="text-sm text-gray-600">By: {r.processed_by_name ? `${r.processed_by_name} (${r.processed_by_role || ''})` : (r.processed_by_role || '—')}</div>
                <div className="text-sm text-gray-600">Teacher: {r.teacher_name || '—'}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AttendanceRequests() {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { showToast } = useContext(ToastContext);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Fetch pending requests (teacher or admin)
  useEffect(() => {
    const fetchPending = async () => {
      if (!user) return;
      setLoading(true);

      try {
        let url = '';

        if (user.role === 'teacher') {
          // Send user.id directly — backend resolves teacher_profile
          url = `http://127.0.0.1:5000/api/attendance-requests/requests?teacher_id=${user.id}`;
        } else if (user.role === 'admin') {
          url = `http://127.0.0.1:5000/api/attendance-requests/requests/admin/pending`;
        } else {
          setRequests([]);
          setLoading(false);
          return;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        setRequests(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching pending requests:', error);
        showToast('Failed to load pending requests', 'error');
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPending();
  }, [user, showToast]);

  const handleApprove = async (requestId) => {
    setActionLoading(requestId);
    try {
      let url = '';
      let body = null;

      if (user.role === 'teacher') {
        url = `http://127.0.0.1:5000/api/attendance-requests/requests/${requestId}/approve`;
      } else {
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
          <h1 className="text-3xl font-bold">
            {user.role === 'admin' ? 'Pending Attendance Requests' : 'Student Attendance Requests'}
          </h1>
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
                  <div>
                    <div className="text-gray-500">Subject</div>
                    <div className="font-medium">{req.subject}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Date</div>
                    <div className="font-medium">{new Date(req.request_date).toLocaleDateString()}</div>
                  </div>
                </div>

                {req.reason && <div className="mt-3 bg-gray-50 p-3 rounded">{req.reason}</div>}
                <div className="text-xs text-gray-400 mt-2">
                  Submitted: {new Date(req.created_at).toLocaleString()}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleApprove(req.id)}
                  disabled={actionLoading === req.id}
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  {actionLoading === req.id ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleReject(req.id)}
                  disabled={actionLoading === req.id}
                  className="bg-red-600 text-white px-4 py-2 rounded"
                >
                  {actionLoading === req.id ? 'Processing...' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AttendanceHistoryInline userProp={user} />
    </div>
  );
}


export default AttendanceRequests;

import React, { useState, useEffect } from 'react';
import { exportSheetsToExcel } from '../utils/exportUtils';

export default function AttendanceHistory() {
  const [user] = useState(
    () => JSON.parse(localStorage.getItem("user")) || {}
  );

  const [dept, setDept] = useState('');
  const [subject, setSubject] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [approvedByFilter, setApprovedByFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [requests, setRequests] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProcessedRequests = async () => {
      setLoading(true);
      
      try {
        const role = user.role || 'student';
        let url = `http://127.0.0.1:5000/api/attendance-requests/requests/processed?role=${encodeURIComponent(role)}`;

        if (role === 'student') {
          url += `&student_id=${encodeURIComponent(user.student_id || user.id)}`;
        }
        
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Failed to fetch');
        
        const data = await resp.json();
        setRequests(data || []);

      } catch (e) {
        console.error(e);
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProcessedRequests();
  }, [user.role, user.id, user.student_id]);

  // build dept list for filter
  const depts = Array.from(new Set(requests.map(r => r.department).filter(Boolean)));

  // apply filters client-side
  useEffect(() => {
    let list = (requests || []).slice();
    if (dept) list = list.filter(r => (r.department || '').toLowerCase() === dept.toLowerCase());
    if (subject) list = list.filter(r => (r.subject || '').toLowerCase().includes(subject.toLowerCase()));
    if (statusFilter === 'approved') list = list.filter(r => r.status === 'approved');
    if (statusFilter === 'rejected') list = list.filter(r => r.status === 'rejected');
    if (approvedByFilter === 'faculty') list = list.filter(r => (r.processed_by_role || '').toLowerCase() === 'teacher' || (r.processed_by_role || '').toLowerCase() === 'faculty');
    if (approvedByFilter === 'admin') list = list.filter(r => (r.processed_by_role || '').toLowerCase() === 'admin');
    if (classFilter) list = list.filter(r => ((r.section || r.class || '') === classFilter));
    setFiltered(list);
  }, [requests, dept, subject, statusFilter, approvedByFilter, classFilter]);

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

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Attendance History</h2>
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

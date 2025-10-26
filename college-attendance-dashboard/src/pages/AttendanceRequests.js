import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DataContext from "../context/DataContext";

// This page supports two views:
// - teacher/student: existing attendance leave-requests list (unchanged)
// - admin: Attendance Requests admin UI with filters (date range, course, subject) and an editor

function AttendanceRequests() {
  const navigate = useNavigate();
  const { leaveRequests, getAssignmentsForTeacher, attendances, updateAttendance, departments } = React.useContext(DataContext);
  const { updateLeaveRequest } = React.useContext(DataContext);
  const user = JSON.parse(localStorage.getItem('user')) || {};

  // If admin, show admin UI for editing attendances approved by faculty
  if (user.role === 'admin') {
    return <AdminAttendanceRequests attendances={attendances} updateAttendance={updateAttendance} departments={departments} navigate={navigate} />;
  }

  // Non-admin behaviour (teacher/student): existing leaveRequests UI
  let list = leaveRequests || [];
  if (user.role === 'teacher'){
    const assigns = (getAssignmentsForTeacher(user.email) || []).map(a => `${a.dept}||${a.subject}`);
    list = list.filter(r => assigns.includes(`${r.dept}||${r.subject}`));
  }

  const handleAction = (id, action) => {
    updateLeaveRequest(id, action === 'Approved' ? 'accepted' : 'rejected');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-900">Attendance Requests</h1>
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
        >
          ← Back
        </button>
      </div>

      <div className="bg-white shadow-md rounded-xl p-6">
        {list.length === 0 ? (
          <p className="text-gray-600">No pending requests 🎉</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-blue-800 text-white">
                <th className="p-2">Student</th>
                <th className="p-2">Subject</th>
                <th className="p-2">From</th>
                <th className="p-2">To</th>
                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-100 transition">
                  <td className="p-2">{r.student}</td>
                  <td className="p-2">{(r.dept ? `${r.dept} / ` : '') + (r.subject || '—')}</td>
                  <td className="p-2">{r.fromDate}</td>
                  <td className="p-2">{r.toDate}</td>
                  <td className="p-2 text-center space-x-3">
                    <button
                      onClick={() => handleAction(r.id, "Approved")}
                      className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-500"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(r.id, "Rejected")}
                      className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-500"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AdminAttendanceRequests({ attendances = [], updateAttendance, departments = [], navigate }){
  // local filter state
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [dept, setDept] = useState('');
  const [subject, setSubject] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [editing, setEditing] = useState(null); // attendance record being edited

  const location = useLocation();

  // initialize filters from query params if provided
  useEffect(() => {
    const qp = new URLSearchParams(location.search);
    const qFrom = qp.get('from') || '';
    const qTo = qp.get('to') || '';
    const qDept = qp.get('dept') || '';
    const qSubject = qp.get('subject') || '';
    if (qFrom) setFrom(qFrom);
    if (qTo) setTo(qTo);
    if (qDept) setDept(qDept);
    if (qSubject) setSubject(qSubject);
  }, [location.search]);

  useEffect(() => {
    // Build combined list: include aggregated records (records with students[])
    // and also group per-student records (one entry per student) by dept+subject+date so admin can review them.
    const all = attendances || [];
    const aggregated = all.filter(a => Array.isArray(a.students));

    // group single student records
    const singles = all.filter(a => !Array.isArray(a.students));
    const groups = {};
    singles.forEach((s) => {
      try {
        const d = s.dept || s.department || '';
        const su = s.subject || s.course || '';
        const dateKey = new Date(s.date || s.createdAt || s.timestamp || Date.now()).toISOString().slice(0,10);
        const key = `${d}___${su}___${dateKey}`;
        if(!groups[key]) groups[key] = { dept: d, subject: su, date: dateKey, submittedBy: s.submittedBy || s.teacher || s.faculty || '', students: [], _composed: true };
        groups[key].students.push({ id: s.id, student: s.student || s.email || s.name || '', name: s.name || '', status: s.status || (s.present ? 'Present' : 'Present') });
      } catch (err) {
        // ignore
      }
    });

    const groupedRecords = Object.keys(groups).map(k => ({ id: `group-${k}`, ...groups[k] }));

    let list = aggregated.concat(groupedRecords || []);

    if(from) list = list.filter(a => new Date(a.date) >= new Date(from));
    if(to) list = list.filter(a => new Date(a.date) <= new Date(to));
    if(dept) list = list.filter(a => (a.dept || '').toLowerCase() === dept.toLowerCase());
    if(subject) list = list.filter(a => (a.subject || '').toLowerCase() === subject.toLowerCase());

    // show newest first
    list.sort((a,b) => new Date(b.date) - new Date(a.date));
    setFiltered(list.slice());
  }, [attendances, from, to, dept, subject]);

  const { removeAttendance } = React.useContext(DataContext);

  const openEditor = (record) => {
    // clone to avoid direct mutation
    setEditing(JSON.parse(JSON.stringify(record)));
  };

  const saveEdit = () => {
    if(!editing) return;
    // if this is a composed/grouped record, update individual attendance entries
    if(editing._composed) {
      if(Array.isArray(editing.students)){
        editing.students.forEach(st => {
          if(st.id) updateAttendance(st.id, { status: st.status });
        });
      }
      alert('Grouped attendance entries updated');
    } else {
      updateAttendance(editing.id, editing);
      alert('Attendance updated by admin');
    }
    setEditing(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-900">Attendance Requests — Admin Review</h1>
        <div>
          <button onClick={() => navigate('/admin-dashboard')} className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600">← Back</button>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm mb-1">From</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border p-2 rounded w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">To</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border p-2 rounded w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Course/Dept</label>
            <select value={dept} onChange={e=>setDept(e.target.value)} className="border p-2 rounded w-full">
              <option value="">All</option>
              {departments.map(d=> <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Subject</label>
            <select value={subject} onChange={e=>setSubject(e.target.value)} className="border p-2 rounded w-full">
              <option value="">All</option>
              {(departments.find(d=>d.name===dept)?.subjects || []).map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-xl p-6">
        {filtered.length === 0 ? (
          <p className="text-gray-600">No faculty-approved attendance records for the selected filters.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">Course</th>
                <th className="p-2">Date</th>
                <th className="p-2">Submitted By</th>
                <th className="p-2">Students</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{r.course || `${r.dept || ''} ${r.subject || ''}`}</td>
                  <td className="p-2">{new Date(r.date).toLocaleString()}</td>
                  <td className="p-2">{r.submittedBy}</td>
                  <td className="p-2">{r.students?.length || 0}</td>
                  <td className="p-2 flex gap-2">
                    <button onClick={() => openEditor(r)} className="px-2 py-1 bg-blue-800 text-white rounded">Edit</button>
                    <button onClick={() => {
                      if(window.confirm('Remove this attendance record? This cannot be undone.')){
                        if(r._composed && Array.isArray(r.students)){
                          // remove all underlying student attendance entries
                          r.students.forEach(s => { if(s.id) removeAttendance(s.id); });
                        } else {
                          removeAttendance(r.id);
                        }
                        // update filtered immediately for responsiveness
                        setFiltered(f => f.filter(x => x.id !== r.id));
                        alert('Attendance record removed');
                      }
                    }} className="px-2 py-1 bg-red-600 text-white rounded">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Editor Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Edit Attendance — {editing.course || `${editing.dept || ''} ${editing.subject || ''}`}</h3>
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="px-3 py-1 bg-gray-300 rounded">Close</button>
                <button onClick={saveEdit} className="px-3 py-1 bg-green-600 text-white rounded">Save</button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Notes</label>
                <textarea value={editing.notes || ''} onChange={e=>setEditing(s=>({...s, notes: e.target.value}))} className="w-full border p-2 rounded" rows={3} />
              </div>

              <div>
                <h4 className="font-medium mb-2">Students</h4>
                <div className="max-h-64 overflow-y-auto border rounded p-2">
                  {editing.students?.map((st, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4 p-2 rounded hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="font-medium">{st.name || st.student || `Student ${st.id || idx+1}`}</div>
                        <div className="text-sm text-gray-500">{st.id ? `ID: ${st.id}` : ''}</div>
                      </div>
                      <div>
                        <select value={st.status || 'Present'} onChange={e=>{
                          const next = { ...editing };
                          next.students[idx] = { ...next.students[idx], status: e.target.value };
                          setEditing(next);
                        }} className="border p-1 rounded">
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Late">Late</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendanceRequests;

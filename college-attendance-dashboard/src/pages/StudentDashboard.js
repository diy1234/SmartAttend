import React, { useState, useContext, useEffect } from 'react';

import DataContext from '../context/DataContext';
import ToastContext from '../context/ToastContext';
import UserContext from '../context/UserContext';

export default function StudentDashboard(){
  const [reason, setReason] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { addLeaveRequest, departments, getEnrollmentsForStudent, attendances } = useContext(DataContext);
  const { showToast } = useContext(ToastContext);
  const { user } = useContext(UserContext);

  const [dept, setDept] = useState(departments?.[0]?.name || '');
  const [subject, setSubject] = useState(departments?.[0]?.subjects?.[0] || '');

  useEffect(()=>{
    if(!dept && departments?.length) setDept(departments[0].name);
    const currentEmail = user?.email || JSON.parse(localStorage.getItem('user'))?.email;
    const enrolls = getEnrollmentsForStudent(currentEmail) || [];
    if(enrolls.length){
      // if enrolled, restrict to enrolled subject for selected dept
      const forDept = enrolls.filter(e=>e.dept === dept).map(e=>e.subject);
      if(forDept.length) setSubject(prev=> forDept.includes(prev) ? prev : forDept[0]);
      else {
        const d = departments.find(d=>d.name === dept);
        if(d && (!subject || !d.subjects.includes(subject))) setSubject(d?.subjects?.[0] || '');
      }
    } else {
      const d = departments.find(d=>d.name === dept);
      if(d && (!subject || !d.subjects.includes(subject))) setSubject(d?.subjects?.[0] || '');
    }
  }, [departments, dept, subject, getEnrollmentsForStudent, user]);

  // derive enrollments and attendance summary for current student
  const currentEmail = user?.email || JSON.parse(localStorage.getItem('user'))?.email;
  const myEnrolls = getEnrollmentsForStudent(currentEmail) || [];

  // attendance summary: { 'Dept / Subject': { present: n, total: m } }
  const attendanceSummary = (attendances || []).filter(a => a.student === currentEmail).reduce((acc, r) => {
    const key = (r.dept ? `${r.dept} / ` : '') + (r.subject || '—');
    acc[key] = acc[key] || { present: 0, total: 0 };
    acc[key].total += 1;
    if (r.status === 'present' || r.status === 'checked-in' || r.status === 'on-time') acc[key].present += 1;
    return acc;
  }, {});

  const submitRequest = () => {
    if (!fromDate || !toDate || !reason) return showToast('Please fill all fields', 'error', 3000);
    const user = JSON.parse(localStorage.getItem('user')) || { email: 'student@local' };
    const req = {
      id: Date.now(),
      student: user.email,
      dept,
      subject,
      fromDate,
      toDate,
      reason,
      status: 'pending',
      role: 'student',
      requestType: 'attendance',
    };
    addLeaveRequest(req);
    showToast('Attendance request submitted', 'info', 2500);
    setReason(''); setFromDate(''); setToDate('');
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-[#132E6B] mb-6">Student Dashboard</h2>

      <div className="bg-white p-6 rounded-xl shadow-md mb-6 flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-shrink-0">
          <img src={user?.photo || JSON.parse(localStorage.getItem('user'))?.photo || '/avatar-placeholder.png'} alt="avatar" className="w-28 h-28 rounded-full object-cover border" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold">{user?.name || JSON.parse(localStorage.getItem('user'))?.name || 'Student'}</h3>
          <p className="text-gray-600">{user?.email || JSON.parse(localStorage.getItem('user'))?.email}</p>
          {user?.joinedAt || JSON.parse(localStorage.getItem('user'))?.joinedAt ? (
            <p className="text-sm text-gray-500 mt-2">Joined: {new Date(user?.joinedAt || JSON.parse(localStorage.getItem('user'))?.joinedAt).toLocaleDateString()}</p>
          ) : null}
          <div className="mt-4">
            <h4 className="font-medium">Enrolled Subjects</h4>
            {myEnrolls.length ? (
              <ul className="list-disc ml-5 mt-2 text-sm text-gray-700">
                {myEnrolls.map((e, idx) => <li key={idx}>{e.dept} — {e.subject}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 mt-2">You are not enrolled in any subjects yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <h3 className="text-xl font-semibold mb-3">Attendance Summary</h3>
        {Object.keys(attendanceSummary || {}).length === 0 ? (
          <p className="text-gray-600">No attendance records yet.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Subject</th>
                <th className="p-2">Present</th>
                <th className="p-2">Total</th>
                <th className="p-2">%</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(attendanceSummary).map(([k, v]) => (
                <tr key={k} className="border-b">
                  <td className="p-2">{k}</td>
                  <td className="p-2 text-center">{v.present}</td>
                  <td className="p-2 text-center">{v.total}</td>
                  <td className="p-2 text-center">{Math.round((v.present / v.total) * 100) || 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <h3 className="text-xl font-semibold mb-3">Attendance Request</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={dept} onChange={(e)=>setDept(e.target.value)} className="border p-2 rounded">
            {(departments || []).map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
          <select value={subject} onChange={(e)=>setSubject(e.target.value)} className="border p-2 rounded">
            {
              (() => {
                const enrolls = getEnrollmentsForStudent(JSON.parse(localStorage.getItem('user'))?.email) || [];
                const forDept = enrolls.filter(e => e.dept === dept).map(e=>e.subject);
                if(forDept.length) return forDept.map(s => <option key={s} value={s}>{s}</option>);
                return (departments.find(d=>d.name===dept)?.subjects || []).map(s => <option key={s} value={s}>{s}</option>);
              })()
            }
          </select>
          <input type="date" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} className="border p-2 rounded" />
          <input type="date" value={toDate} onChange={(e)=>setToDate(e.target.value)} className="border p-2 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <select className="border p-2 rounded" onChange={(e)=>setReason(e.target.value)} value={reason}>
            <option value="">Select reason</option>
            <option value="sick">Sick</option>
            <option value="personal">Personal</option>
            <option value="other">Other</option>
          </select>
          <div className="flex justify-end items-center">
            <button onClick={submitRequest} className="px-4 py-2 bg-blue-800 text-white rounded">Submit Request</button>
          </div>
        </div>
        {/* Student-side face marking removed: teachers will manage face-based attendance */}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-semibold mb-3">My Requests</h3>
        <RequestsList forStudent={true} currentStudent={currentEmail} />
      </div>
    </div>
  );
}

function RequestsList({ forStudent, currentStudent }){
  const { leaveRequests } = useContext(DataContext);
  const list = (leaveRequests || []).filter(r => !forStudent || (currentStudent ? r.student === currentStudent : true));
  if(list.length === 0) return <p className="text-gray-600">No requests yet.</p>;
  return (
    <div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Subject</th>
            <th className="p-2">From</th>
            <th className="p-2">To</th>
            <th className="p-2">Reason</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {list.map(r => (
            <tr key={r.id} className="border-b">
              <td className="p-2">{(r.dept ? `${r.dept} / ` : '') + (r.subject || '—')}</td>
              <td className="p-2">{r.fromDate}</td>
              <td className="p-2">{r.toDate}</td>
              <td className="p-2">{r.reason}</td>
              <td className="p-2">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


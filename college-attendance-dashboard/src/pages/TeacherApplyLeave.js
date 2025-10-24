import React, { useState, useContext, useMemo } from 'react';
import DataContext from '../context/DataContext';
import UserContext from '../context/UserContext';
import ToastContext from '../context/ToastContext';

function countWorkingDays(from, to) {
  const a = new Date(from);
  const b = new Date(to);
  if (isNaN(a) || isNaN(b) || b < a) return 0;
  let count = 0;
  const cur = new Date(a);
  while (cur <= b) {
    const day = cur.getDay(); // 0 Sun, 6 Sat
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export default function TeacherApplyLeave(){
  const { addLeaveRequest, leaveRequests } = useContext(DataContext);
  const { user } = useContext(UserContext);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

  const { showToast } = useContext(ToastContext);

  const submit = () => {
    if (!fromDate || !toDate || !reason) return showToast('Please fill all fields', 'error', 3000);
    const days = countWorkingDays(fromDate, toDate);
    const req = {
      id: Date.now(),
      student: user?.email || 'teacher@local',
      fromDate,
      toDate,
      reason,
      status: 'pending',
      role: 'teacher',
      daysRequested: days,
    };
    addLeaveRequest(req);
    showToast('Leave request submitted', 'info', 2500);
    setFromDate(''); setToDate(''); setReason('');
  };

  const totalApproved = useMemo(()=>{
    const my = (leaveRequests || []).filter(r => r.role === 'teacher' && r.student === (user?.email) && r.status === 'accepted');
    return my.reduce((sum, r)=> sum + (r.daysRequested || countWorkingDays(r.fromDate, r.toDate)), 0);
  }, [leaveRequests, user]);

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-[#132E6B] mb-6">Apply for Leave</h2>
      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <h3 className="text-xl font-semibold mb-3">Request Leave</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="date" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} className="border p-2 rounded" />
          <input type="date" value={toDate} onChange={(e)=>setToDate(e.target.value)} className="border p-2 rounded" />
          <select className="border p-2 rounded" onChange={(e)=>setReason(e.target.value)} value={reason}>
            <option value="">Select reason</option>
            <option value="sick">Sick</option>
            <option value="personal">Personal</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={submit} className="px-4 py-2 bg-blue-800 text-white rounded">Submit Request</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-semibold mb-3">My Holiday Summary</h3>
        <p className="mb-2">Total approved holiday days: <strong>{totalApproved}</strong></p>
        <p className="text-sm text-gray-600">Note: Saturdays and Sundays are treated as holidays and excluded from requested days count.</p>
      </div>
    </div>
  );
}

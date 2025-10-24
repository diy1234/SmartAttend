import React, { useState, useContext } from 'react';
import DataContext from '../context/DataContext';
import ToastContext from '../context/ToastContext';

export default function StudentDashboard(){
  const [reason, setReason] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { addLeaveRequest } = useContext(DataContext);
  const { showToast } = useContext(ToastContext);

  const submitRequest = () => {
    if (!fromDate || !toDate || !reason) return showToast('Please fill all fields', 'error', 3000);
    const user = JSON.parse(localStorage.getItem('user')) || { email: 'student@local' };
    const req = {
      id: Date.now(),
      student: user.email,
      fromDate,
      toDate,
      reason,
      status: 'pending',
    };
    addLeaveRequest(req);
    showToast('Leave request submitted', 'info', 2500);
    setReason(''); setFromDate(''); setToDate('');
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-[#132E6B] mb-6">Student Dashboard</h2>
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
          <button onClick={submitRequest} className="px-4 py-2 bg-blue-800 text-white rounded">Submit Request</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-semibold mb-3">My Requests</h3>
        <RequestsList forStudent={true} />
      </div>
    </div>
  );
}

function RequestsList({ forStudent }){
  const { leaveRequests } = useContext(DataContext);
  const list = leaveRequests || [];
  if(list.length === 0) return <p className="text-gray-600">No requests yet.</p>;
  return (
    <div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Student</th>
            <th className="p-2">From</th>
            <th className="p-2">To</th>
            <th className="p-2">Reason</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {list.map(r => (
            <tr key={r.id} className="border-b">
              <td className="p-2">{r.student}</td>
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


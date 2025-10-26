import React, { useContext } from 'react';
import DataContext from '../context/DataContext';

export default function AttendanceHistory(){
  const { attendances } = useContext(DataContext);
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const myRecords = (attendances || []).filter(a => a.student === user.email || (a.students && a.students.some(s => s.email === user.email)));

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-[#132E6B] mb-6">My Attendance History</h2>

      <div className="bg-white p-6 rounded-xl shadow-md">
        {myRecords.length === 0 ? (
          <p className="text-gray-600">No attendance records yet.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">Date</th>
                <th className="p-2">Department / Subject</th>
                <th className="p-2">Method</th>
                <th className="p-2 text-center">Status</th>
                <th className="p-2">Photo</th>
                <th className="p-2">Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {myRecords.map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{new Date(r.date).toLocaleString()}</td>
                  <td className="p-2">{(r.dept ? `${r.dept} / ` : '') + (r.subject || '—')}</td>
                  <td className="p-2">{r.method || '—'}</td>
                  <td className="p-2 text-center">{r.status || (r.students ? 'Mixed' : '—')}</td>
                  <td className="p-2">{r.photo ? <img src={r.photo} alt="capture" className="w-28 rounded" /> : '—'}</td>
                  <td className="p-2">{r.submittedBy || r.student || 'system'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

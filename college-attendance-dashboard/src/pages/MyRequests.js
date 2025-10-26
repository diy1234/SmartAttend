import React from 'react';
import DataContext from '../context/DataContext';

export default function MyRequests(){
  const { leaveRequests } = React.useContext(DataContext);
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const myList = (leaveRequests || []).filter(r => r.student === user.email);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-900">My Attendance Requests</h1>
      </div>

      <div className="bg-white shadow-md rounded-xl p-6">
        {myList.length === 0 ? (
          <p className="text-gray-600">You have no requests.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-blue-800 text-white">
                <th className="p-2">Type</th>
                <th className="p-2">From</th>
                <th className="p-2">To</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {myList.map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-100 transition">
                  <td className="p-2">{r.requestType || 'leave'}</td>
                  <td className="p-2">{r.fromDate}</td>
                  <td className="p-2">{r.toDate}</td>
                  <td className="p-2">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

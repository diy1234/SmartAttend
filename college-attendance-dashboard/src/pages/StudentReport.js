import React from 'react';
import { useNavigate } from 'react-router-dom';
import DataContext from '../context/DataContext';

export default function StudentReport(){
  const navigate = useNavigate();
  const { attendances } = React.useContext(DataContext);
  const user = JSON.parse(localStorage.getItem('user')) || {};

  // aggregate attendance per subject for current student
  const my = (attendances || []).filter(a => a.student === user.email);
  const map = {};
  my.forEach(r => {
    const key = `${r.dept || 'General'}||${r.subject || 'General'}`;
    map[key] = map[key] || { dept: r.dept, subject: r.subject, total: 0, present: 0 };
    map[key].total += 1;
    if(r.status === 'Present' || (r.students && r.students.some(s=>s.status==='Present'))) map[key].present += 1;
  });
  const rows = Object.values(map);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">My Subject-wise Attendance</h1>
          <p className="text-gray-700 mt-1">Showing attendance only for: <strong>{user.email}</strong></p>
        </div>
        <button onClick={()=>navigate(-1)} className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600">← Back</button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        {rows.length === 0 ? (
          <p className="text-gray-600">No attendance recorded yet for you.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-800 text-white">
                <th className="p-2">Department</th>
                <th className="p-2">Subject</th>
                <th className="p-2 text-center">Present</th>
                <th className="p-2 text-center">Total</th>
                <th className="p-2 text-center">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const percent = r.total === 0 ? 0 : Math.round((r.present / r.total) * 100);
                return (
                  <tr key={idx} className="border-b hover:bg-gray-100">
                    <td className="p-2">{r.dept || 'General'}</td>
                    <td className="p-2">{r.subject || 'General'}</td>
                    <td className="p-2 text-center">{r.present}</td>
                    <td className="p-2 text-center">{r.total}</td>
                    <td className={`p-2 text-center font-semibold ${percent < 75 ? 'text-red-600' : 'text-green-600'}`}>{percent}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

import React, { useContext, useState } from "react";
import { Link } from "react-router-dom";
import DataContext from '../context/DataContext';
import slugify from '../utils/slugify';

const departments = [
  {
    name: "MCA",
    subjects: [
      { name: "Artificial Intelligence", total: 60, present: 55 },
      { name: "Database Systems", total: 60, present: 52 },
      { name: "Web Technologies", total: 60, present: 58 },
      { name: "Operating Systems", total: 60, present: 54 },
    ],
  },
  {
    name: "BCA",
    subjects: [
      { name: "Programming in C", total: 50, present: 47 },
      { name: "Computer Networks", total: 50, present: 45 },
      { name: "Java Development", total: 50, present: 48 },
      { name: "Software Engineering", total: 50, present: 44 },
    ],
  },
  {
    name: "MBA",
    subjects: [
      { name: "Marketing Management", total: 40, present: 38 },
      { name: "Financial Analysis", total: 40, present: 35 },
      { name: "Human Resource", total: 40, present: 39 },
      { name: "Strategic Management", total: 40, present: 36 },
    ],
  },
  {
    name: "BBA",
    subjects: [
      { name: "Business Ethics", total: 45, present: 40 },
      { name: "Accounting Basics", total: 45, present: 41 },
      { name: "Economics", total: 45, present: 43 },
      { name: "Entrepreneurship", total: 45, present: 42 },
    ],
  },
];

export default function AdminDashboard() {
  const { leaveRequests: requests, updateLeaveRequest, departments, addDepartment, removeDepartment, addSubject, removeSubject } = useContext(DataContext);
  const [newDept, setNewDept] = useState('');
  const [newSubject, setNewSubject] = useState({ dept: '', subject: ''});
  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-[#132E6B] mb-6">
        Admin Dashboard
      </h2>

      {/* Leave Requests Overview */}
      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <h3 className="text-xl font-semibold mb-4">Leave Requests</h3>
        {requests.length === 0 ? (
          <p className="text-gray-600">No leave requests.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">Name</th>
                <th className="p-2">Role</th>
                <th className="p-2">From</th>
                <th className="p-2">To</th>
                <th className="p-2">Reason</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.student}</td>
                  <td className="p-2">{r.role || 'student'}</td>
                  <td className="p-2">{r.fromDate}</td>
                  <td className="p-2">{r.toDate}</td>
                  <td className="p-2">{r.reason}</td>
                  <td className="p-2">
                    {r.status}
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => updateLeaveRequest(r.id, 'accepted')} className="px-2 py-1 bg-green-600 text-white rounded">Accept</button>
                      <button onClick={() => updateLeaveRequest(r.id, 'rejected')} className="px-2 py-1 bg-red-600 text-white rounded">Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Attendances */}
      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <h3 className="text-xl font-semibold mb-4">Recent Attendance Records</h3>
        <RecentAttendances />
      </div>

      {/* Departments Section */}
      <div className="space-y-10">
        {departments.map((dept) => (
          <div key={dept.name}>
            <h3 className="text-2xl font-semibold text-[#132E6B] mb-4">
              {dept.name} Department
            </h3>

            {/* Subject Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {dept.subjects.map((subj) => (
                <div key={subj} className="bg-white rounded-xl shadow-md p-5 border border-gray-200 transition">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">{subj}</h4>
                  <div className="flex gap-2 mt-2">
                    <Link to={`/departments/${slugify(dept.name)}/${slugify(subj)}`} className="text-blue-700 underline">View</Link>
                    <button onClick={() => removeSubject(dept.name, subj)} className="text-red-600">Remove</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add subject UI */}
            <div className="mt-4 flex gap-2">
              <input value={newSubject.subject} onChange={(e)=>setNewSubject(s=>({...s, subject: e.target.value}))} placeholder="New subject name" className="border p-2 rounded" />
              <button onClick={()=>{ if(newSubject.subject) { addSubject(dept.name, newSubject.subject); setNewSubject(s=>({...s, subject: ''})); } }} className="px-3 py-1 bg-green-600 text-white rounded">Add Subject</button>
            </div>
            <div className="mt-3">
              <button onClick={()=>removeDepartment(dept.name)} className="px-3 py-1 bg-red-600 text-white rounded">Remove Department</button>
            </div>
          </div>
        ))}

        {/* Add Department UI */}
        <div className="bg-white p-4 rounded shadow-md">
          <h4 className="font-semibold mb-2">Add Department</h4>
          <div className="flex gap-2">
            <input value={newDept} onChange={(e)=>setNewDept(e.target.value)} placeholder="Department name" className="border p-2 rounded" />
            <button onClick={()=>{ if(newDept) { addDepartment(newDept); setNewDept(''); } }} className="px-3 py-1 bg-blue-800 text-white rounded">Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentAttendances(){
  const { attendances } = React.useContext(DataContext);
  if(!attendances || attendances.length === 0) return <p className="text-gray-600">No attendance records yet.</p>;
  const recent = attendances.slice(-5).reverse();
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-gray-100">
          <th className="p-2">Course</th>
          <th className="p-2">Date</th>
          <th className="p-2">Submitted By</th>
          <th className="p-2">Students</th>
        </tr>
      </thead>
      <tbody>
        {recent.map(r => (
          <tr key={r.id} className="border-b">
            <td className="p-2">{r.course}</td>
            <td className="p-2">{new Date(r.date).toLocaleString()}</td>
            <td className="p-2">{r.submittedBy}</td>
            <td className="p-2">{r.students?.length || 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

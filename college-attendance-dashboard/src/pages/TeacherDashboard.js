import React from "react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import DataContext from '../context/DataContext';
import slugify from '../utils/slugify';

function TeacherDashboard() {
  const navigate = useNavigate();
  const { leaveRequests, updateLeaveRequest } = useContext(DataContext);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    setRequests(leaveRequests.filter(r => r.status === 'pending'));
  }, [leaveRequests]);

  const { departments } = useContext(DataContext);

  const [selectedDept, setSelectedDept] = useState(() => localStorage.getItem('selectedDept') || (departments[0]?.name || ''));
  const subjects = departments.find(d => d.name === selectedDept)?.subjects || [];
  const [selectedSubject, setSelectedSubject] = useState(() => localStorage.getItem('selectedSubject') || (subjects[0] || ''));

  useEffect(()=>{
    localStorage.setItem('selectedDept', selectedDept);
  }, [selectedDept]);
  useEffect(()=>{
    localStorage.setItem('selectedSubject', selectedSubject);
  }, [selectedSubject]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <h1 className="text-3xl font-bold text-blue-900 mb-6 flex items-center gap-2">
        👩‍🏫 Teacher Dashboard
      </h1>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white shadow-md rounded-xl p-5">
          <h2 className="font-semibold text-gray-700">Next Class Scheduled</h2>
          <p className="mt-1 text-blue-900 font-medium">{selectedDept} — {selectedSubject}</p>
          <p className="text-sm text-gray-500">10:00 AM - 11:00 AM | Room 204</p>
          <div className="mt-3 flex gap-3 items-center">
            <select value={selectedDept} onChange={(e)=>{ setSelectedDept(e.target.value); setSelectedSubject(''); }} className="border p-2 rounded">
              {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
            <select value={selectedSubject} onChange={(e)=>setSelectedSubject(e.target.value)} className="border p-2 rounded">
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={() => navigate(`/take-attendance`, { state: { course: `${selectedDept} - ${selectedSubject}`, dept: slugify(selectedDept), subject: slugify(selectedSubject) } })}
              disabled={!selectedDept || !selectedSubject}
              className="bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Mark Attendance
            </button>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-xl p-5 text-center">
          <h2 className="font-semibold text-gray-700">My Average Attendance</h2>
          <p className="text-3xl text-blue-900 font-bold mt-2">88%</p>
        </div>

        <div className="bg-white shadow-md rounded-xl p-5 text-center">
          <h2 className="font-semibold text-gray-700">Pending Attendance Requests</h2>
          <p className="text-3xl text-red-600 font-bold mt-2">3</p>
          <p className="text-gray-500 text-sm">Awaiting approval</p>
          <button
            onClick={() => navigate("/attendance-requests")}
            className="mt-3 bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Review Requests
          </button>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="bg-white shadow-md rounded-xl p-5 mb-6">
        <h2 className="text-lg font-bold text-blue-900 mb-3">📅 Weekly Schedule</h2>
        <ul className="space-y-2 text-gray-700">
          <li>Monday: CS301 - Data Structures - 10 AM</li>
          <li>Tuesday: CS405 - Algorithms - 9 AM</li>
          <li>Wednesday: CS501 - OS - 11 AM</li>
          <li>Thursday: CS301 - Data Structures - 10 AM</li>
          <li>Friday: CS405 - Algorithms - 9 AM</li>
        </ul>
      </div>

      {/* My Courses */}
        <div className="bg-white shadow-md rounded-xl p-5">
        <h2 className="text-lg font-bold text-blue-900 mb-3">📘 My Courses</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-800 text-white text-left">
              <th className="p-2 rounded-l-lg">Subject</th>
              <th className="p-2 text-center">Department</th>
              <th className="p-2 text-center rounded-r-lg">Action</th>
            </tr>
          </thead>
          <tbody>
            {departments.flatMap(d => (d.subjects || []).map(s => ({ dept: d.name, subject: s }))).map((item, idx) => (
              <tr key={`${item.dept}-${item.subject}-${idx}`} className={`border-b transition ${item.dept === selectedDept && item.subject === selectedSubject ? 'bg-blue-50' : 'hover:bg-gray-100'}`}>
                <td className="p-2">{item.subject}</td>
                <td className="p-2 text-center">{item.dept}</td>
                <td className="p-2 text-center">
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => { setSelectedDept(item.dept); setSelectedSubject(item.subject); }} className="px-3 py-1 bg-gray-200 rounded">Select</button>
                    <button
                      onClick={() => navigate(`/departments/${slugify(item.dept)}/${slugify(item.subject)}`, { state: { course: `${item.dept} - ${item.subject}` } })}
                      className="bg-blue-800 text-white px-4 py-1 rounded-lg hover:bg-blue-700"
                    >
                      View Students
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending Requests */}
      <div className="bg-white shadow-md rounded-xl p-5 mt-6">
        <h2 className="text-lg font-bold text-blue-900 mb-3">Pending Leave Requests</h2>
        {requests.length === 0 ? (
          <p className="text-gray-600">No pending requests</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">Student</th>
                <th className="p-2">From</th>
                <th className="p-2">To</th>
                <th className="p-2">Reason</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.student}</td>
                  <td className="p-2">{r.fromDate}</td>
                  <td className="p-2">{r.toDate}</td>
                  <td className="p-2">{r.reason}</td>
                  <td className="p-2">
                    <button onClick={() => updateLeaveRequest(r.id, 'accepted')} className="px-3 py-1 bg-green-600 text-white rounded mr-2">Accept</button>
                    <button onClick={() => updateLeaveRequest(r.id, 'rejected')} className="px-3 py-1 bg-red-600 text-white rounded">Reject</button>
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

export default TeacherDashboard;

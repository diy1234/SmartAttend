import React from "react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import DataContext from '../context/DataContext';
import UserContext from '../context/UserContext';
import slugify from '../utils/slugify';

// (profile helper removed - profile managed in `TeacherAboutMe` / My Profile)
function TeacherDashboard(){
  const navigate = useNavigate();
  const { departments, leaveRequests, updateLeaveRequest, getAssignmentsForTeacher, getWeeklyScheduleForTeacher } = useContext(DataContext);
  const { user } = useContext(UserContext);

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
          <h2 className="font-semibold text-gray-700">Pending Attendance Requests</h2>
          {(() => {
            // filter leaveRequests for student-submitted requests relevant to this teacher
            let list = (leaveRequests || []).filter(r => r.role !== 'teacher');
            if(user?.role === 'teacher'){
              const assigns = (getAssignmentsForTeacher(user.email) || []).map(a => `${a.dept}||${a.subject}`);
              list = list.filter(r => assigns.includes(`${r.dept}||${r.subject}`));
            }
            const pending = list.filter(r => r.status === 'pending');
            return (
              <>
                <p className="text-3xl text-red-600 font-bold mt-2">{pending.length || 0}</p>
                <p className="text-gray-500 text-sm">Awaiting approval</p>
                <div className="mt-3 space-y-2">
                  {pending.slice(0,3).map(r => (
                    <div key={r.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="text-left text-sm">
                        <div className="font-medium">{r.student}</div>
                        <div className="text-xs text-gray-500">{r.dept} / {r.subject}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => updateLeaveRequest(r.id, 'accepted')} className="px-2 py-1 bg-green-600 text-white rounded text-sm">Approve</button>
                        <button onClick={() => updateLeaveRequest(r.id, 'rejected')} className="px-2 py-1 bg-red-600 text-white rounded text-sm">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate("/attendance-requests")}
                  className="mt-3 bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Review Requests
                </button>
              </>
            );
          })()}
        </div>
        <div className="bg-white shadow-md rounded-xl p-5 text-center">
          <h2 className="font-semibold text-gray-700">Attendance Overview</h2>
          <p className="text-gray-500 text-sm mt-2">Quick access to attendance summaries and percentages</p>
          <button onClick={() => navigate('/attendance-overview')} className="mt-3 bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Open Overview</button>
        </div>
      </div>

      {/* Weekly Schedule (driven by admin-managed schedule) */}
      <div className="bg-white shadow-md rounded-xl p-5 mb-6">
        <h2 className="text-lg font-bold text-blue-900 mb-3">📅 Weekly Schedule</h2>
        {(() => {
          const teacherEmail = user?.email;
          const schedule = teacherEmail ? (getWeeklyScheduleForTeacher(teacherEmail) || []) : [];
          if(!schedule || schedule.length === 0) return <p className="text-gray-600">No weekly schedule assigned. Contact admin.</p>;
          return (
            <ul className="space-y-2 text-gray-700">
              {schedule.map((s) => (<li key={s.id}>{s.day}: {s.dept} - {s.subject} — {s.time}</li>))}
            </ul>
          );
        })()}
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2 bg-white shadow-md rounded-xl p-5">
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

        {/* Right column: quick facial attendance */}
        <aside className="bg-white shadow-md rounded-xl p-5">
          <h2 className="text-lg font-bold text-blue-900 mb-3">� Facial Attendance</h2>
          <p className="text-sm text-gray-600 mb-3">Open the camera to capture student face snapshots and record attendance.</p>
          <div className="flex flex-col gap-2">
            <button onClick={() => navigate('/teacher-face', { state: { dept: selectedDept, subject: selectedSubject } })} className="bg-green-600 text-white px-4 py-2 rounded">Open Camera</button>
            <button onClick={() => navigate('/take-attendance', { state: { course: `${selectedDept} - ${selectedSubject}`, dept: slugify(selectedDept), subject: slugify(selectedSubject) } })} className="bg-blue-800 text-white px-4 py-2 rounded">Mark Attendance (Manual)</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default TeacherDashboard;


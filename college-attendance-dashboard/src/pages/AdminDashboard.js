import React, { useContext, useState } from "react";
import { Link } from "react-router-dom";
import DataContext from '../context/DataContext';
import slugify from '../utils/slugify';
import ConfirmModal from '../components/ConfirmModal';
import AttendanceOverview from './AttendanceOverviewClean';

export default function AdminDashboard() {
  const { leaveRequests: requests, updateLeaveRequest, departments, addDepartment, removeDepartment, addSubject, removeSubject, addTeacherAssignment, addEnrollment, weeklySchedule, addWeeklyEntry, removeWeeklyEntry } = useContext(DataContext);
  const [newDept, setNewDept] = useState('');
  const [newSubject, setNewSubject] = useState({ dept: '', subject: ''});
  const [newAssignment, setNewAssignment] = useState({ teacher: '', dept: '', subject: ''});
  const [newEnrollment, setNewEnrollment] = useState({ student: '', dept: '', subject: ''});
  const [newScheduleDay, setNewScheduleDay] = useState('');
  const [newScheduleTime, setNewScheduleTime] = useState('');

  // confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState(null);

  const openConfirm = (type, meta) => {
    setConfirmPayload({ type, meta });
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if(!confirmPayload) return setConfirmOpen(false);
    const { type, meta } = confirmPayload;
    if(type === 'remove-subject'){
      removeSubject(meta.dept, meta.subject);
    } else if(type === 'remove-department'){
      removeDepartment(meta.dept);
    }
    setConfirmPayload(null);
    setConfirmOpen(false);
  };

  const handleCancel = () => { setConfirmPayload(null); setConfirmOpen(false); };
  return (
    <div className="p-6">
      <ConfirmModal
        open={confirmOpen}
        title={confirmPayload?.type === 'remove-department' ? 'Remove Department' : 'Remove Subject'}
        message={confirmPayload?.type === 'remove-department' ? `Remove department "${confirmPayload?.meta?.dept}" and all its subjects?` : `Remove subject "${confirmPayload?.meta?.subject}" from ${confirmPayload?.meta?.dept}?`}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      {/* Show Attendance Overview as the admin dashboard main view */}
    <AttendanceOverview />

      {/* Manage Departments moved to separate page */}
      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <h3 className="text-xl font-semibold mb-4">Manage Departments & Subjects</h3>
        <p className="text-gray-700">Weekly schedule, subject management and teacher assignments were moved to the dedicated management page.</p>
        <div className="mt-4">
          <Link to="/manage-departments" className="px-3 py-2 bg-blue-800 text-white rounded">Open Manage Departments</Link>
        </div>
      </div>
    </div>
  );
}

// Render the ConfirmModal at module-level via a wrapper - add it inside the component return

// RecentAttendances removed — admin dashboard no longer shows recent attendance summary per request

function AssignmentsList(){
  const { teacherAssignments, removeTeacherAssignment } = React.useContext(DataContext);
  if(!teacherAssignments || teacherAssignments.length === 0) return <p className="text-gray-600">No assignments yet.</p>;
  return (
    <ul className="mt-2 space-y-1 text-sm">
      {teacherAssignments.map((a, idx) => (
        <li key={idx} className="flex justify-between items-center">
          <div>{a.teacher} — {a.dept} / {a.subject}</div>
          <button onClick={()=>{ if(window.confirm('Remove this assignment?')) removeTeacherAssignment(a.teacher, a.dept, a.subject); }} className="text-red-600">Remove</button>
        </li>
      ))}
    </ul>
  );
}

function EnrollmentsList(){
  const { enrollments, removeEnrollment } = React.useContext(DataContext);
  if(!enrollments || enrollments.length === 0) return <p className="text-gray-600">No enrollments yet.</p>;
  return (
    <ul className="mt-2 space-y-1 text-sm">
      {enrollments.map((e, idx) => (
        <li key={idx} className="flex justify-between items-center">
          <div>{e.student} — {e.dept} / {e.subject}</div>
          <button onClick={()=>{ if(window.confirm('Remove this enrollment?')) removeEnrollment(e.student, e.dept, e.subject); }} className="text-red-600">Remove</button>
        </li>
      ))}
    </ul>
  );
}

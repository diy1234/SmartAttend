import React, { useContext, useState } from "react";
import { Link } from 'react-router-dom';
import DataContext from '../context/DataContext';
import slugify from '../utils/slugify';
import ConfirmModal from '../components/ConfirmModal';

export default function ManageDepartments(){
  const { departments, addDepartment, removeDepartment, addSubject, removeSubject, addTeacherAssignment, addEnrollment, weeklySchedule, addWeeklyEntry, removeWeeklyEntry, teacherAssignments, enrollments, setWeeklyScheduleForTeacher } = useContext(DataContext);

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

  // Fallback native confirm handlers (reliable across environments)
  const handleRemoveSubjectClick = (deptName, subj) => {
    if (window.confirm(`Remove subject "${subj}" from ${deptName}?`)) {
      removeSubject(deptName, subj);
    }
  };

  const handleRemoveDepartmentClick = (deptName) => {
    if (window.confirm(`Remove department "${deptName}" and all its subjects?`)) {
      removeDepartment(deptName);
    }
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

  // Predefined time slots (5 slots, 40 minutes each, 20 minute lunch after slot 3)
  const TIME_SLOTS = [
    { start: '08:30', end: '09:10' },
    { start: '09:15', end: '09:55' },
    { start: '10:00', end: '10:40' },
    // 20 min lunch break here
    { start: '11:00', end: '11:40' },
    { start: '11:45', end: '12:25' },
  ];

  // Assign schedule using the first available time slot for the teacher on that day
  const handleAddSchedule = () => {
    if(!newAssignment.teacher || !newAssignment.dept || !newAssignment.subject || !newScheduleDay) return alert('Please fill all schedule fields');
    const entriesForTeacherDay = (weeklySchedule || []).filter(s => s.teacher === newAssignment.teacher && s.day === newScheduleDay);
    if(entriesForTeacherDay.length >= TIME_SLOTS.length){
      return alert('This teacher already has the maximum number of subjects for ' + newScheduleDay + '. Remove one before adding.');
    }
    // pick chosen slot if provided, otherwise first available
    const usedTimes = new Set(entriesForTeacherDay.map(e => e.time));
    let timeStr = '';
    if(newScheduleTime){
      // admin picked a slot: verify it's a valid TIME_SLOTS entry and not already used
      if(usedTimes.has(newScheduleTime)) return alert('Selected time slot is already used for this teacher on this day');
      const valid = TIME_SLOTS.find(ts => `${ts.start} - ${ts.end}` === newScheduleTime);
      if(!valid) return alert('Selected time slot is invalid');
      timeStr = newScheduleTime;
    } else {
      const slotIdx = TIME_SLOTS.findIndex(ts => !usedTimes.has(`${ts.start} - ${ts.end}`));
      if(slotIdx === -1) return alert('No available time slot');
      timeStr = `${TIME_SLOTS[slotIdx].start} - ${TIME_SLOTS[slotIdx].end}`;
    }
    addWeeklyEntry({ teacher: newAssignment.teacher, dept: newAssignment.dept, subject: newAssignment.subject, day: newScheduleDay, time: timeStr });
    setNewScheduleDay(''); setNewAssignment({ teacher: '', dept: '', subject: '' }); setNewScheduleTime('');
  };

  return (
    <div className="p-6">
      <ConfirmModal
        open={confirmOpen}
        title={confirmPayload?.type === 'remove-department' ? 'Remove Department' : 'Remove Subject'}
        message={confirmPayload?.type === 'remove-department' ? `Remove department "${confirmPayload?.meta?.dept}" and all its subjects?` : `Remove subject "${confirmPayload?.meta?.subject}" from ${confirmPayload?.meta?.dept}?`}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <h2 className="text-3xl font-bold text-[#132E6B] mb-6">Manage Departments & Subjects</h2>

      {/* Weekly Schedule Management */}
      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <h3 className="text-xl font-semibold mb-4">Weekly Schedule Management (max 5 subjects/day per teacher)</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3">
          <input placeholder="Teacher email" value={newAssignment.teacher} onChange={(e)=>setNewAssignment(s=>({...s, teacher: e.target.value}))} className="border p-2 rounded" />
          <select value={newAssignment.dept} onChange={(e)=>setNewAssignment(s=>({...s, dept: e.target.value}))} className="border p-2 rounded">
            <option value="">Select dept</option>
            {departments.map(d=> <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
          <select value={newAssignment.subject} onChange={(e)=>setNewAssignment(s=>({...s, subject: e.target.value}))} className="border p-2 rounded">
            <option value="">Select subject</option>
            {(departments.find(d=>d.name===newAssignment.dept)?.subjects || []).map(s=> <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={newScheduleDay} onChange={(e)=>setNewScheduleDay(e.target.value)} className="border p-2 rounded">
            <option value="">Day</option>
            {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d=> <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={newScheduleTime} onChange={(e)=>setNewScheduleTime(e.target.value)} className="border p-2 rounded">
            <option value="">Auto (first available)</option>
            {TIME_SLOTS.map(ts => {
              const label = `${ts.start} - ${ts.end}`;
              return <option key={label} value={label}>{label}</option>;
            })}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAddSchedule} className="px-3 py-1 bg-green-600 text-white rounded">Add Schedule</button>
        </div>

        <div className="mt-4">
          <h4 className="font-medium mb-2">Current Weekly Schedule</h4>
          {(!weeklySchedule || weeklySchedule.length === 0) ? <p className="text-gray-600">No schedule entries.</p> : (
            <div className="space-y-2">
              {weeklySchedule.map((s) => (
                <div key={s.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <div className="text-sm">{s.teacher} — {s.day}: {s.dept} / {s.subject} — {s.time}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>{ if(window.confirm('Remove this schedule entry?')) removeWeeklyEntry(s.id); }} className="text-red-600">Remove</button>
                  </div>
                </div>
              ))}

              {/* Publish per-teacher: list unique teachers and allow publishing their schedule to their dashboard */}
              <div className="mt-4">
                <h5 className="font-medium mb-2">Publish Schedule to Teacher Dashboards</h5>
                {Array.from(new Set((weeklySchedule || []).map(s => s.teacher))).map((teacherEmail) => (
                  <div key={teacherEmail} className="flex items-center justify-between bg-white p-2 rounded mb-2">
                    <div className="text-sm">{teacherEmail}</div>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        const entries = (weeklySchedule || []).filter(s => s.teacher === teacherEmail).map(s => ({ day: s.day, dept: s.dept, subject: s.subject, time: s.time }));
                        if(entries.length === 0) return alert('No schedule entries for this teacher');
                        if(window.confirm(`Publish ${entries.length} schedule entries to ${teacherEmail}'s dashboard?`)){
                          setWeeklyScheduleForTeacher(teacherEmail, entries);
                          alert('Schedule published to teacher dashboard');
                        }
                      }} className="px-3 py-1 bg-green-600 text-white rounded">Push to Teacher</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
                    <button onClick={() => handleRemoveSubjectClick(dept.name, subj)} className="text-red-600">Remove</button>
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
              <button onClick={() => handleRemoveDepartmentClick(dept.name)} className="px-3 py-1 bg-red-600 text-white rounded">Remove Department</button>
            </div>
          </div>
        ))}

        {/* Assignments & Enrollments UI */}
        <div className="bg-white p-4 rounded shadow-md">
          <h4 className="font-semibold mb-2">Assign Teacher to Subject</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input placeholder="Teacher email" value={newAssignment.teacher} onChange={(e)=>setNewAssignment(s=>({...s, teacher: e.target.value}))} className="border p-2 rounded" />
            <select value={newAssignment.dept} onChange={(e)=>setNewAssignment(s=>({...s, dept: e.target.value}))} className="border p-2 rounded">
              <option value="">Select dept</option>
              {departments.map(d=> <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
            <select value={newAssignment.subject} onChange={(e)=>setNewAssignment(s=>({...s, subject: e.target.value}))} className="border p-2 rounded">
              <option value="">Select subject</option>
              {(departments.find(d=>d.name===newAssignment.dept)?.subjects || []).map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={()=>{ if(newAssignment.teacher && newAssignment.dept && newAssignment.subject){ addTeacherAssignment(newAssignment.teacher, newAssignment.dept, newAssignment.subject); setNewAssignment({teacher:'',dept:'',subject:''}); } }} className="px-3 py-1 bg-green-600 text-white rounded">Assign</button>
          </div>

          {/* Enroll Student UI and assignments/enrollments list removed per request */}
        </div>

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

function AssignmentsList({ teacherAssignments }){
  const { removeTeacherAssignment } = useContext(DataContext);
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

function EnrollmentsList({ enrollments }){
  const { removeEnrollment } = useContext(DataContext);
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

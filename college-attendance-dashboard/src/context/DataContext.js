import React, { createContext, useState, useEffect } from 'react';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [leaveRequests, setLeaveRequests] = useState(() => JSON.parse(localStorage.getItem('leaveRequests') || '[]'));
  const [attendances, setAttendances] = useState(() => JSON.parse(localStorage.getItem('attendances') || '[]'));

  // departments persisted in localStorage with a default fallback
  const defaultDepts = [
    { name: 'MCA', subjects: ['Artificial Intelligence','Database Systems','Web Technologies','Operating Systems'] },
    { name: 'BCA', subjects: ['Programming in C','Computer Networks','Java Development','Software Engineering'] },
    { name: 'MBA', subjects: ['Marketing Management','Financial Analysis','Human Resource','Strategic Management'] },
    { name: 'BBA', subjects: ['Business Ethics','Accounting Basics','Economics','Entrepreneurship'] },
  ];
  const [departments, setDepartments] = useState(() => JSON.parse(localStorage.getItem('departments') || JSON.stringify(defaultDepts)));
  const [enrollments, setEnrollments] = useState(() => JSON.parse(localStorage.getItem('enrollments') || '[]'));
  const [teacherAssignments, setTeacherAssignments] = useState(() => JSON.parse(localStorage.getItem('teacherAssignments') || '[]'));
  const [weeklySchedule, setWeeklySchedule] = useState(() => JSON.parse(localStorage.getItem('weeklySchedule') || '[]'));

  useEffect(() => {
    localStorage.setItem('departments', JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem('enrollments', JSON.stringify(enrollments));
  }, [enrollments]);

  useEffect(() => {
    localStorage.setItem('teacherAssignments', JSON.stringify(teacherAssignments));
  }, [teacherAssignments]);

  useEffect(() => {
    localStorage.setItem('weeklySchedule', JSON.stringify(weeklySchedule));
  }, [weeklySchedule]);

  const addDepartment = (name) => setDepartments((p) => [...p, { name, subjects: [] }]);
  const removeDepartment = (name) => setDepartments((p) => p.filter(d => d.name !== name));
  const addSubject = (deptName, subject) => setDepartments((p) => p.map(d => d.name === deptName ? { ...d, subjects: [...d.subjects, subject] } : d));
  const removeSubject = (deptName, subject) => setDepartments((p) => p.map(d => d.name === deptName ? { ...d, subjects: d.subjects.filter(s => s !== subject) } : d));

  // Enrollment helpers: track which students are enrolled in which dept/subject
  const addEnrollment = (studentEmail, deptName, subject) => setEnrollments(p => [...p, { student: studentEmail, dept: deptName, subject }]);
  const removeEnrollment = (studentEmail, deptName, subject) => setEnrollments(p => p.filter(e => !(e.student === studentEmail && e.dept === deptName && e.subject === subject)));
  const getEnrollmentsForStudent = (studentEmail) => (enrollments || []).filter(e => e.student === studentEmail);

  // Teacher assignment helpers: track which teachers teach which dept/subject
  const addTeacherAssignment = (teacherEmail, deptName, subject) => setTeacherAssignments(p => [...p, { teacher: teacherEmail, dept: deptName, subject }]);
  const removeTeacherAssignment = (teacherEmail, deptName, subject) => setTeacherAssignments(p => p.filter(a => !(a.teacher === teacherEmail && a.dept === deptName && a.subject === subject)));
  const getAssignmentsForTeacher = (teacherEmail) => (teacherAssignments || []).filter(a => a.teacher === teacherEmail);

  // Weekly schedule helpers: entries are { id, teacher, day, time, dept, subject }
  const addWeeklyEntry = (entry) => setWeeklySchedule(p => [...p, { id: Date.now(), ...entry }]);
  const removeWeeklyEntry = (id) => setWeeklySchedule(p => p.filter(e => e.id !== id));
  const getWeeklyScheduleForTeacher = (teacherEmail) => (weeklySchedule || []).filter(e => e.teacher === teacherEmail);
  const setWeeklyScheduleForTeacher = (teacherEmail, entries) => {
    // remove existing for teacher and append provided entries (entries expected without id)
    setWeeklySchedule(p => [...p.filter(e => e.teacher !== teacherEmail), ...entries.map(en => ({ id: Date.now() + Math.random(), teacher: teacherEmail, ...en }))]);
  };

  // persist to localStorage when changed
  useEffect(() => {
    localStorage.setItem('leaveRequests', JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  useEffect(() => {
    try{
      localStorage.setItem('attendances', JSON.stringify(attendances));
    }catch(err){
      // Handle quota exceeded: try to trim old attendance records and retry
      console.error('Failed to persist attendances to localStorage:', err);
      const isQuota = err && (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014);
      if(isQuota){
        // Keep only the most recent N records to free space
        const keep = 200;
        if(attendances.length > keep){
          const trimmed = attendances.slice(-keep);
          try{
            localStorage.setItem('attendances', JSON.stringify(trimmed));
            // reflect trimmed state in-memory
            setAttendances(trimmed);
            console.warn(`attendances truncated to last ${keep} records due to storage quota`);
          }catch(e2){
            console.error('Retry to persist trimmed attendances failed', e2);
          }
        }else{
          console.warn('Quota exceeded but not enough records to trim');
        }
      }
    }
  }, [attendances]);

  // sync when other tabs change storage
  useEffect(() => {
    const onStorage = () => {
      setLeaveRequests(JSON.parse(localStorage.getItem('leaveRequests') || '[]'));
      setAttendances(JSON.parse(localStorage.getItem('attendances') || '[]'));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addLeaveRequest = (req) => setLeaveRequests((p) => [...p, req]);
  const updateLeaveRequest = (id, status) => setLeaveRequests((p) => p.map(r => r.id === id ? { ...r, status } : r));
  const addAttendance = (record) => setAttendances((p) => [...p, record]);
  const updateAttendance = (id, updated) => setAttendances((p) => p.map(a => a.id === id ? { ...a, ...updated } : a));
  const removeAttendance = (id) => setAttendances((p) => p.filter(a => a.id !== id));

  return (
    <DataContext.Provider value={{
      leaveRequests,
      attendances,
      enrollments,
      teacherAssignments,
      addLeaveRequest,
      updateLeaveRequest,
  addAttendance,
  updateAttendance,
  removeAttendance,
      departments,
    weeklySchedule,
    addWeeklyEntry,
    removeWeeklyEntry,
    getWeeklyScheduleForTeacher,
    setWeeklyScheduleForTeacher,
      addDepartment,
      removeDepartment,
      addSubject,
      removeSubject,
      addEnrollment,
      removeEnrollment,
      getEnrollmentsForStudent,
      addTeacherAssignment,
      removeTeacherAssignment,
      getAssignmentsForTeacher
    }}>
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;

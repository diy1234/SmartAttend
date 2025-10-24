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

  useEffect(() => {
    localStorage.setItem('departments', JSON.stringify(departments));
  }, [departments]);

  const addDepartment = (name) => setDepartments((p) => [...p, { name, subjects: [] }]);
  const removeDepartment = (name) => setDepartments((p) => p.filter(d => d.name !== name));
  const addSubject = (deptName, subject) => setDepartments((p) => p.map(d => d.name === deptName ? { ...d, subjects: [...d.subjects, subject] } : d));
  const removeSubject = (deptName, subject) => setDepartments((p) => p.map(d => d.name === deptName ? { ...d, subjects: d.subjects.filter(s => s !== subject) } : d));

  // persist to localStorage when changed
  useEffect(() => {
    localStorage.setItem('leaveRequests', JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  useEffect(() => {
    localStorage.setItem('attendances', JSON.stringify(attendances));
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

  return (
    <DataContext.Provider value={{ leaveRequests, attendances, addLeaveRequest, updateLeaveRequest, addAttendance, departments, addDepartment, removeDepartment, addSubject, removeSubject }}>
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;

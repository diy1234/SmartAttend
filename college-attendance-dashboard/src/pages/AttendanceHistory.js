import React, { useContext, useState, useEffect } from 'react';
import DataContext from '../context/DataContext';
import { exportSheetsToExcel } from '../utils/exportUtils';

export default function AttendanceHistory(){
  const { attendances, leaveRequests } = useContext(DataContext);
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const [dept, setDept] = useState('');
  const [subject, setSubject] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | approved | rejected
  const [approvedByFilter, setApprovedByFilter] = useState(''); // '' = not selected, 'faculty' | 'admin'
  const [classFilter, setClassFilter] = useState(''); // '' | 'A' | 'B'
  const [grouped, setGrouped] = useState([]);

  useEffect(() => {
    if(user.role === 'admin'){
      // For admin view, show student leave requests grouped by dept+subject
      // Only compute list when admin has selected the "approved by" filter (per UX request)
      if(!approvedByFilter) {
        setGrouped([]);
        return;
      }

      let list = (leaveRequests || []).slice();
      if(dept) list = list.filter(r => (r.dept || '').toLowerCase() === dept.toLowerCase());
      if(subject) list = list.filter(r => (r.subject || '').toLowerCase() === subject.toLowerCase());
      if(statusFilter === 'pending') list = list.filter(r => r.status === 'pending');
      if(statusFilter === 'approved') list = list.filter(r => r.status === 'accepted');
      if(statusFilter === 'rejected') list = list.filter(r => r.status === 'rejected');

      // filter by who approved the request
      if(approvedByFilter === 'faculty') list = list.filter(r => (r.approvedBy || '') === 'faculty');
      if(approvedByFilter === 'admin') list = list.filter(r => (r.approvedBy || '') === 'admin');

      // filter by class/section if provided — support both `section` and `class` fields
      if(classFilter) {
        list = list.filter(r => ((r.section || r.class || '') === classFilter));
      }

      // group by dept+subject
      const groups = {};
      list.forEach(r => {
        const key = `${r.dept || 'Unknown'}__${r.subject || 'General'}`;
        if(!groups[key]) groups[key] = { dept: r.dept || 'Unknown', subject: r.subject || 'General', requests: [] };
        groups[key].requests.push(r);
      });
      setGrouped(Object.values(groups));
    }
  }, [leaveRequests, dept, subject, statusFilter, approvedByFilter, classFilter, user.role]);

  // build the currently filtered list (same filters as grouping) for export
  const buildFilteredList = () => {
    if(user.role !== 'admin') return [];
    if(!approvedByFilter) return [];
    let list = (leaveRequests || []).slice();
    if(dept) list = list.filter(r => (r.dept || '').toLowerCase() === dept.toLowerCase());
    if(subject) list = list.filter(r => (r.subject || '').toLowerCase() === subject.toLowerCase());
    if(statusFilter === 'pending') list = list.filter(r => r.status === 'pending');
    if(statusFilter === 'approved') list = list.filter(r => r.status === 'accepted');
    if(statusFilter === 'rejected') list = list.filter(r => r.status === 'rejected');
    if(approvedByFilter === 'faculty') list = list.filter(r => (r.approvedBy || '') === 'faculty');
    if(approvedByFilter === 'admin') list = list.filter(r => (r.approvedBy || '') === 'admin');
    if(classFilter) list = list.filter(r => ((r.section || r.class || '') === classFilter));
    return list;
  };

  const handleExport = () => {
    const list = buildFilteredList();
    if(!list.length) return alert('No records to export for the selected filters.');

    // group by section (A/B). If classFilter selected, only that section will be exported as single sheet.
    const sections = {};
    list.forEach(r => {
      const section = r.section || r.class || '';
      const key = section || 'Unknown';
      if(!sections[key]) sections[key] = [];
      sections[key].push(r);
    });

    const sheets = Object.keys(sections).map(sec => {
      const rows = sections[sec].map(r => {
        // build Approved By display: prefer approvedByName + role, then approvedByRole, then approvedBy, else status fallback
        let approvedByDisplay = '';
        if (r.approvedByName) {
          const role = r.approvedByRole || r.approvedBy || '';
          const roleLabel = ('' + role).toLowerCase() === 'admin' ? 'Admin' : ((('' + role).toLowerCase() === 'faculty' || ('' + role).toLowerCase() === 'teacher') ? 'Teacher' : role);
          approvedByDisplay = r.approvedByName + (roleLabel ? ` (${roleLabel})` : '');
        } else if (r.approvedByRole) {
          const roleLabel = ('' + r.approvedByRole).toLowerCase() === 'admin' ? 'Admin' : ((('' + r.approvedByRole).toLowerCase() === 'faculty' || ('' + r.approvedByRole).toLowerCase() === 'teacher') ? 'Teacher' : r.approvedByRole);
          approvedByDisplay = roleLabel;
        } else if (r.approvedBy) {
          const v = ('' + r.approvedBy).toLowerCase();
          if (v === 'faculty' || v === 'teacher') approvedByDisplay = 'Teacher';
          else if (v === 'admin') approvedByDisplay = 'Admin';
          else approvedByDisplay = r.approvedBy;
        } else {
          approvedByDisplay = r.status === 'accepted' ? 'Approved (by unknown)' : (r.status === 'rejected' ? 'Rejected' : 'Pending');
        }

        return {
          'Roll No': r.roll || r.id || r.student || '',
          Name: r.name || r.student || '',
          Attendance: r.status === 'accepted' ? 'Absent' : r.status === 'rejected' ? 'Present' : 'Pending',
          'Approved By': approvedByDisplay
        };
      });
      return { name: `${sec}`.slice(0,31), data: rows };
    });

    const fileName = `${dept || 'All'}-${subject || 'All'}-${approvedByFilter || 'All'}-${new Date().toISOString().slice(0,10)}`;
    exportSheetsToExcel(fileName, sheets);
  };

  const handleExportForGroup = (deptParam, subjectParam) => {
    if(!approvedByFilter) return alert('Please select "Approved By" before exporting.');
    let list = (leaveRequests || []).slice();
    list = list.filter(r => (r.dept || '').toLowerCase() === (deptParam || '').toLowerCase());
    list = list.filter(r => (r.subject || '').toLowerCase() === (subjectParam || '').toLowerCase());
    if(statusFilter === 'pending') list = list.filter(r => r.status === 'pending');
    if(statusFilter === 'approved') list = list.filter(r => r.status === 'accepted');
    if(statusFilter === 'rejected') list = list.filter(r => r.status === 'rejected');
    if(approvedByFilter === 'faculty') list = list.filter(r => (r.approvedBy || '') === 'faculty');
    if(approvedByFilter === 'admin') list = list.filter(r => (r.approvedBy || '') === 'admin');
    if(classFilter) list = list.filter(r => ((r.section || r.class || '') === classFilter));

    if(!list.length) return alert('No records to export for this subject/filters.');

    const sections = {};
    list.forEach(r => {
      const section = r.section || r.class || '';
      const key = section || 'Unknown';
      if(!sections[key]) sections[key] = [];
      sections[key].push(r);
    });

    const sheets = Object.keys(sections).map(sec => {
      const rows = sections[sec].map(r => {
        let approvedByDisplay = '';
        if (r.approvedByName) {
          const role = r.approvedByRole || r.approvedBy || '';
          const roleLabel = ('' + role).toLowerCase() === 'admin' ? 'Admin' : ((('' + role).toLowerCase() === 'faculty' || ('' + role).toLowerCase() === 'teacher') ? 'Teacher' : role);
          approvedByDisplay = r.approvedByName + (roleLabel ? ` (${roleLabel})` : '');
        } else if (r.approvedByRole) {
          const roleLabel = ('' + r.approvedByRole).toLowerCase() === 'admin' ? 'Admin' : ((('' + r.approvedByRole).toLowerCase() === 'faculty' || ('' + r.approvedByRole).toLowerCase() === 'teacher') ? 'Teacher' : r.approvedByRole);
          approvedByDisplay = roleLabel;
        } else if (r.approvedBy) {
          const v = ('' + r.approvedBy).toLowerCase();
          if (v === 'faculty' || v === 'teacher') approvedByDisplay = 'Teacher';
          else if (v === 'admin') approvedByDisplay = 'Admin';
          else approvedByDisplay = r.approvedBy;
        } else {
          approvedByDisplay = r.status === 'accepted' ? 'Approved (by unknown)' : (r.status === 'rejected' ? 'Rejected' : 'Pending');
        }

        return {
          'Roll No': r.roll || r.id || r.student || '',
          Name: r.name || r.student || '',
          Attendance: r.status === 'accepted' ? 'Absent' : r.status === 'rejected' ? 'Present' : 'Pending',
          'Approved By': approvedByDisplay
        };
      });
      return { name: `${sec}`.slice(0,31), data: rows };
    });

    const fileName = `${deptParam || 'Dept'}-${subjectParam || 'Subject'}-${approvedByFilter || 'All'}-${new Date().toISOString().slice(0,10)}`;
    exportSheetsToExcel(fileName, sheets);
  };

  if(user.role === 'admin'){
    const depts = Array.from(new Set((leaveRequests || []).map(r => r.dept).filter(Boolean)));
    return (
      <div className="p-6">
        <h2 className="text-3xl font-bold text-[#132E6B] mb-6">Attendance History — Admin</h2>

        <div className="bg-white p-4 rounded-xl shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm mb-1">Course / Dept</label>
              <select value={dept} onChange={e=>setDept(e.target.value)} className="border p-2 rounded w-full">
                <option value="">All</option>
                {depts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Subject</label>
              <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject (optional)" className="border p-2 rounded w-full" />
            </div>
            <div>
              <label className="block text-sm mb-1">Status</label>
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border p-2 rounded w-full">
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Approved By</label>
              <select value={approvedByFilter} onChange={e=>setApprovedByFilter(e.target.value)} className="border p-2 rounded w-full">
                <option value="">-- Select approver --</option>
                <option value="faculty">Approved by Faculty</option>
                <option value="admin">Approved by Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Class / Section</label>
              <select value={classFilter} onChange={e=>setClassFilter(e.target.value)} className="border p-2 rounded w-full">
                <option value="">All</option>
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={() => { setDept(''); setSubject(''); setStatusFilter('all'); setApprovedByFilter(''); setClassFilter(''); }} className="px-3 py-2 bg-gray-200 rounded">Clear</button>
              <button
                onClick={() => handleExport()}
                className={`px-3 py-2 bg-blue-800 text-white rounded ${!approvedByFilter ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!approvedByFilter}
              >Export</button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {!approvedByFilter ? (
            <div className="bg-white p-6 rounded shadow">Please select "Approved By" to view the list.</div>
          ) : grouped.length === 0 ? (
            <div className="bg-white p-6 rounded shadow">No requests match the selected filters.</div>
          ) : grouped.map(g => (
            <div key={`${g.dept}-${g.subject}`} className="bg-white p-4 rounded shadow">
              <div className="flex justify-between items-center mb-3">
                <div>
                    <div className="font-semibold">{g.dept} — {g.subject}</div>
                    <div className="text-sm text-gray-500">{g.requests.length} request(s)</div>
                </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleExportForGroup(g.dept, g.subject)} className="text-blue-700 underline text-sm">View</button>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {g.requests.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">{r.student}</div>
                      <div className="text-sm text-gray-500">{r.fromDate} — {r.toDate}</div>
                      <div className="text-sm text-gray-600 mt-1">{(() => {
                        // show approver name/role if available
                        if (r.approvedByName) {
                          const role = r.approvedByRole || r.approvedBy || '';
                          const roleLabel = ('' + role).toLowerCase() === 'admin' ? 'Admin' : ((('' + role).toLowerCase() === 'faculty' || ('' + role).toLowerCase() === 'teacher') ? 'Teacher' : role);
                          return `Approved By: ${r.approvedByName}${roleLabel ? ` (${roleLabel})` : ''}`;
                        }
                        if (r.approvedByRole) {
                          const roleLabel = ('' + r.approvedByRole).toLowerCase() === 'admin' ? 'Admin' : ((('' + r.approvedByRole).toLowerCase() === 'faculty' || ('' + r.approvedByRole).toLowerCase() === 'teacher') ? 'Teacher' : r.approvedByRole);
                          return `Approved By: ${roleLabel}`;
                        }
                        if (r.approvedBy) {
                          const v = ('' + r.approvedBy).toLowerCase();
                          if (v === 'faculty' || v === 'teacher') return 'Approved By: Teacher';
                          if (v === 'admin') return 'Approved By: Admin';
                          return `Approved By: ${r.approvedBy}`;
                        }
                        return r.status === 'accepted' ? 'Approved' : (r.status === 'rejected' ? 'Rejected' : 'Pending');
                      })()}</div>
                    </div>
                    <div>
                      <span className={`px-2 py-1 rounded text-white ${r.status === 'accepted' ? 'bg-green-600' : r.status === 'rejected' ? 'bg-red-600' : 'bg-yellow-500'}`}>
                        {r.status === 'accepted' ? 'Approved' : r.status === 'rejected' ? 'Rejected' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Teacher view: show detailed attendance statistics
  if (user.role === 'teacher') {
    // Get records where the teacher is the submitter
    const teacherRecords = (attendances || []).filter(a => a.submittedBy === user.email);
    
    // Calculate overall statistics
    const totalStudents = teacherRecords.length;
    const presentCount = teacherRecords.filter(a => a.status === 'present').length;
    const absentCount = teacherRecords.filter(a => a.status === 'absent').length;
    const attendanceRate = totalStudents ? (presentCount / totalStudents * 100).toFixed(1) : 0;

    // Group by subject for subject-wise statistics
    const subjectStats = {};
    teacherRecords.forEach(record => {
      const key = `${record.dept || 'Unknown'} / ${record.subject || 'Unknown'}`;
      if (!subjectStats[key]) {
        subjectStats[key] = { total: 0, present: 0, absent: 0 };
      }
      subjectStats[key].total++;
      if (record.status === 'present') subjectStats[key].present++;
      if (record.status === 'absent') subjectStats[key].absent++;
    });

    // Group by date for timeline data
    const dateStats = {};
    teacherRecords.forEach(record => {
      const date = new Date(record.date).toLocaleDateString();
      if (!dateStats[date]) {
        dateStats[date] = { total: 0, present: 0 };
      }
      dateStats[date].total++;
      if (record.status === 'present') dateStats[date].present++;
    });

    return (
      <div className="p-6">
        <h2 className="text-3xl font-bold text-[#132E6B] mb-6">Attendance Dashboard</h2>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-gray-500 text-sm">Total Records</h3>
            <p className="text-3xl font-bold text-[#132E6B]">{totalStudents}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-gray-500 text-sm">Present</h3>
            <p className="text-3xl font-bold text-green-600">{presentCount}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-gray-500 text-sm">Absent</h3>
            <p className="text-3xl font-bold text-red-600">{absentCount}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-gray-500 text-sm">Attendance Rate</h3>
            <p className="text-3xl font-bold text-blue-600">{attendanceRate}%</p>
          </div>
        </div>

        {/* Subject-wise Statistics */}
        <div className="bg-white p-6 rounded-xl shadow-md mb-6">
          <h3 className="text-lg font-bold text-[#132E6B] mb-4">Subject-wise Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(subjectStats).map(([subject, stats]) => (
              <div key={subject} className="border p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">{subject}</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="font-bold text-[#132E6B]">{stats.total}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Present</p>
                    <p className="font-bold text-green-600">{stats.present}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Absent</p>
                    <p className="font-bold text-red-600">{stats.absent}</p>
                  </div>
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-600" 
                    style={{ width: `${(stats.present / stats.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance Timeline */}
        <div className="bg-white p-6 rounded-xl shadow-md mb-6">
          <h3 className="text-lg font-bold text-[#132E6B] mb-4">Daily Attendance Trends</h3>
          <div className="w-full h-48">
            <div className="flex items-end h-full space-x-2">
              {Object.entries(dateStats).sort().map(([date, stats]) => {
                const percentage = (stats.present / stats.total) * 100;
                return (
                  <div key={date} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-blue-500" 
                      style={{ height: `${percentage}%` }}
                    />
                    <p className="text-xs mt-1 transform -rotate-45 origin-top-left">{date}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Records Table */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-bold text-[#132E6B] mb-4">Recent Records</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3">Date</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Student</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {teacherRecords.slice(0, 10).map(record => (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{new Date(record.date).toLocaleDateString()}</td>
                    <td className="p-3">{(record.dept ? `${record.dept} / ` : '') + (record.subject || '—')}</td>
                    <td className="p-3">{record.student || '—'}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                        record.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Student view: show personal attendance records
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

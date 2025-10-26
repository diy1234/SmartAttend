import React, { useEffect, useMemo, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import DataContext from "../context/DataContext";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const AttendanceOverview = () => {
  const { attendances = [], addAttendance } = useContext(DataContext) || {};
  const [records, setRecords] = useState([]);
  const [showSample, setShowSample] = useState(true); // show sample by default when empty
  const navigate = useNavigate();

  // parse incoming DataContext attendances or legacy localStorage keys
  useEffect(() => {
    // prefer DataContext attendances when present
    if (attendances && attendances.length > 0) {
      const mapped = attendances.map((a) => {
        const dept = a.dept || a.department || "Unknown";
        const subject = a.subject || a.course || "";
        const date = a.date || a.createdAt || a.timestamp || "";
        const students = Array.isArray(a.students) ? a.students : a.records || a.entries || [];
        const totalStudents = students.length;
        const presentCount = students.filter((s) => s && (s.status === 'Present' || s.present === true)).length;
        const percentage = totalStudents ? ((presentCount / totalStudents) * 100).toFixed(1) : "0.0";
        return { dept, subject, date, totalStudents, presentCount, percentage };
      });
      mapped.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecords(mapped);
      return;
    }

    // legacy localStorage parsing: keys like dept_subject_date
    const keys = Object.keys(localStorage || {});
    const legacy = [];
    keys.forEach((k) => {
      if (!k) return;
      if (k.includes("_") && !["departments", "attendances", "enrollments", "teacherAssignments", "weeklySchedule", "leaveRequests"].includes(k)) {
        const parts = k.split("_");
        if (parts.length >= 3) {
          const [dept, subject, date] = parts;
          try {
            const data = JSON.parse(localStorage.getItem(k));
            const students = Array.isArray(data) ? data.flatMap((c) => c.students || []) : [];
            const total = students.length;
            const present = students.filter(s => s && s.present).length;
            const percentage = total ? ((present / total) * 100).toFixed(1) : "0.0";
            legacy.push({ dept, subject, date, totalStudents: total, presentCount: present, percentage });
          } catch (e) {
            // ignore
          }
        }
      }
    });
    legacy.sort((a, b) => new Date(b.date) - new Date(a.date));
    setRecords(legacy);
  }, [attendances]);

  // sample dataset used when no real attendance exists (demo)
  const sampleRecords = [
    { dept: 'MCA', subject: 'Artificial Intelligence', date: '2025-10-20', totalStudents: 40, presentCount: 36, percentage: '90.0' },
    { dept: 'MCA', subject: 'Database Systems', date: '2025-10-19', totalStudents: 38, presentCount: 30, percentage: '78.9' },
    { dept: 'BCA', subject: 'Programming in C', date: '2025-10-18', totalStudents: 42, presentCount: 28, percentage: '66.7' },
    { dept: 'MBA', subject: 'Marketing Management', date: '2025-10-17', totalStudents: 30, presentCount: 25, percentage: '83.3' },
    { dept: 'BBA', subject: 'Accounting Basics', date: '2025-10-16', totalStudents: 35, presentCount: 20, percentage: '57.1' },
  ];

  const displayRecords = useMemo(() => (records.length === 0 && showSample) ? sampleRecords : records, [records, showSample]);

  // derived for charts
  const deptAverages = useMemo(() => {
    const map = {};
    displayRecords.forEach(r => {
      const n = parseFloat(r.percentage) || 0;
      if (!map[r.dept]) map[r.dept] = { sum: 0, count: 0 };
      map[r.dept].sum += n; map[r.dept].count += 1;
    });
    return Object.keys(map).map(d => ({ dept: d, average: Number((map[d].sum / map[d].count).toFixed(1)) }));
  }, [displayRecords]);

  const pieData = useMemo(() => {
    let above = 0, below = 0;
    displayRecords.forEach(r => { const n = parseFloat(r.percentage) || 0; if (n >= 75) above++; else below++; });
    return [{ name: '>=75%', value: above }, { name: 'Below 75%', value: below }];
  }, [displayRecords]);

  // colors
  const PALETTE = ['#3b82f6','#06b6d4','#7c3aed','#ef4444','#f97316','#84cc16','#0ea5a4','#f43f5e'];
  const deptColor = (dept, idx) => {
    if (!dept) return PALETTE[idx % PALETTE.length];
    // stable mapping via index of dept in deptAverages
    const i = deptAverages.findIndex(x => x.dept === dept);
    return PALETTE[(i >= 0 ? i : idx) % PALETTE.length];
  };

  const PIE_COLORS = ['#10B981', '#EF4444'];

  const seedSampleData = () => {
    // write aggregated records into DataContext if available, otherwise into localStorage 'attendances'
    if (typeof addAttendance === 'function') {
      sampleRecords.forEach(r => {
        const students = Array.from({ length: r.totalStudents }).map((_,i) => ({ id: `s-${i+1}`, student: `s${i+1}@example.com`, name: `Student ${i+1}`, status: i < r.presentCount ? 'Present' : 'Absent' }));
        addAttendance({ id: Date.now()+Math.random(), dept: r.dept, subject: r.subject, date: r.date, students, submittedBy: 'sample-teacher@example.com', facultyApproved: true });
      });
    } else {
      // fallback: append to localStorage.attendances array
      try {
        const existing = JSON.parse(localStorage.getItem('attendances') || '[]');
        sampleRecords.forEach(r => {
          const students = Array.from({ length: r.totalStudents }).map((_,i) => ({ id: `s-${i+1}`, student: `s${i+1}@example.com`, name: `Student ${i+1}`, present: i < r.presentCount }));
          existing.push({ id: Date.now()+Math.random(), dept: r.dept, subject: r.subject, date: r.date, students, submittedBy: 'sample-teacher@example.com', facultyApproved: true });
        });
        localStorage.setItem('attendances', JSON.stringify(existing));
      } catch (e) { /* ignore */ }
    }
    setShowSample(true);
  };

  const pctBadge = (num) => {
    if (num >= 75) return 'inline-block px-2 py-1 rounded-full text-sm bg-green-100 text-green-800';
    if (num >= 50) return 'inline-block px-2 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800';
    return 'inline-block px-2 py-1 rounded-full text-sm bg-red-100 text-red-800';
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#132E6B] mb-6">Attendance Overview</h1>

      {displayRecords.length === 0 ? (
        <div className="space-y-4">
          <p className="text-gray-500">No attendance data found.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowSample(true)} className="px-3 py-1 bg-blue-800 text-white rounded">Show sample charts</button>
            <button onClick={seedSampleData} className="px-3 py-1 bg-green-600 text-white rounded">Seed sample data (persist)</button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-lg font-medium mb-2">Department Attendance</h3>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={deptAverages} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <XAxis dataKey="dept" />
                    <YAxis domain={[0,100]} />
                    <Tooltip />
                    <Bar dataKey="average">
                      {deptAverages.map((d,i) => <Cell key={d.dept} fill={deptColor(d.dept, i)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                {deptAverages.map((d,i) => (
                  <div key={`leg-${i}`} className="flex items-center gap-2 text-sm">
                    <span style={{ width: 12, height: 12, background: deptColor(d.dept, i), display: 'inline-block', borderRadius: 3 }} />
                    <span className="font-medium">{d.dept}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-lg font-medium mb-2">Attendance Distribution</h3>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {pieData.map((entry, idx) => <Cell key={`p-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Department</th>
                  <th className="p-2 text-left">Subject</th>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-center">Total</th>
                  <th className="p-2 text-center">Present</th>
                  <th className="p-2 text-center">%</th>
                  <th className="p-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayRecords.map((r, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="p-2">{r.dept}</td>
                    <td className="p-2">{r.subject}</td>
                    <td className="p-2">{r.date}</td>
                    <td className="p-2 text-center">{r.totalStudents}</td>
                    <td className="p-2 text-center">{r.presentCount}</td>
                    <td className="p-2 text-center"><span className={pctBadge(Number(r.percentage))}>{r.percentage}%</span></td>
                    <td className="p-2 text-center">
                      <button onClick={() => navigate(`/departments/${encodeURIComponent(r.dept)}/${encodeURIComponent(r.subject)}`)} className="px-2 py-1 bg-[#132E6B] text-white rounded text-xs">Open</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceOverview;
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AttendanceOverview = () => {
  const [records, setRecords] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const allKeys = Object.keys(localStorage);
    const attendanceData = [];

    allKeys.forEach((key) => {
      // Expected key format: dept_subject_date
      if (key.includes("_")) {
        const [dept, subject, date] = key.split("_");
        try {
          const data = JSON.parse(localStorage.getItem(key));
          const totalStudents = data.flatMap((cls) => cls.students).length;
          const presentCount = data
            .flatMap((cls) => cls.students)
            .filter((s) => s.present).length;
          const percentage = ((presentCount / totalStudents) * 100).toFixed(1);

          attendanceData.push({
            dept,
            subject,
            date,
            totalStudents,
            presentCount,
            percentage,
          });
        } catch (error) {
          console.error("Error parsing data for key:", key);
        }
      }
    });

    // Sort by date (newest first)
    attendanceData.sort((a, b) => new Date(b.date) - new Date(a.date));

    setRecords(attendanceData);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#132E6B] mb-6">
        Attendance Overview
      </h1>

      {records.length === 0 ? (
        <p className="text-gray-500">No attendance data found.</p>
      ) : (
        <table className="w-full border-collapse bg-white shadow-md rounded-xl overflow-hidden">
          <thead className="bg-[#132E6B] text-white text-sm">
            <tr>
              <th className="px-4 py-2 text-left">Department</th>
              <th className="px-4 py-2 text-left">Subject</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-center">Total</th>
              <th className="px-4 py-2 text-center">Present</th>
              <th className="px-4 py-2 text-center">%</th>
              <th className="px-4 py-2 text-center">View</th>
            </tr>
          </thead>
          <tbody>
            {records.map((rec, index) => (
              <tr
                key={index}
                className="border-b hover:bg-gray-50 transition text-sm"
              >
                <td className="px-4 py-2">{rec.dept}</td>
                <td className="px-4 py-2">{rec.subject}</td>
                <td className="px-4 py-2">{rec.date}</td>
                <td className="px-4 py-2 text-center">{rec.totalStudents}</td>
                <td className="px-4 py-2 text-center">{rec.presentCount}</td>
                <td
                  className={`px-4 py-2 text-center font-semibold ${
                    rec.percentage >= 75 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {rec.percentage}%
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() =>
                      navigate(`/departments/${rec.dept}/${rec.subject}`)
                    }
                    className="bg-[#132E6B] text-white text-xs px-3 py-1 rounded-md hover:bg-blue-800"
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AttendanceOverview;

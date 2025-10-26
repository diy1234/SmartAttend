import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#4F46E5", "#F59E0B"];

const AttendanceOverviewClean = () => {
  const [records, setRecords] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const allKeys = Object.keys(localStorage || {});
    const attendanceData = [];

    for (const key of allKeys) {
      if (!key.includes("_")) continue;
      const parts = key.split("_");
      if (parts.length < 3) continue;
      const [dept, subject, date] = parts;
      try {
        const raw = localStorage.getItem(key);
        const data = raw ? JSON.parse(raw) : null;
        const students = Array.isArray(data)
          ? data.flatMap((cls) => cls.students || [])
          : (data?.flatMap ? data.flatMap((cls) => cls.students || []) : []);
        const totalStudents = students.length;
        const presentCount = students.filter((s) => s && s.present).length;
        const percentage = totalStudents ? ((presentCount / totalStudents) * 100).toFixed(1) : "0.0";
        attendanceData.push({ dept, subject, date, totalStudents, presentCount, percentage });
      } catch {
        // ignore malformed entries
      }
    }

    attendanceData.sort((a, b) => new Date(b.date) - new Date(a.date));
    setRecords(attendanceData);
  }, []);

  // derive department-level averages and distribution for charts
  const { deptAverages, pieData } = useMemo(() => {
    const byDept = {};
    let above = 0,
      below = 0;
    for (const r of records) {
      const pct = parseFloat(r.percentage) || 0;
      if (!byDept[r.dept]) byDept[r.dept] = { sum: 0, count: 0 };
      byDept[r.dept].sum += pct;
      byDept[r.dept].count += 1;
      if (pct >= 75) above += 1; else below += 1;
    }

    const deptAverages = Object.keys(byDept).map((d) => ({ name: d, attendance: Math.round((byDept[d].sum / byDept[d].count) * 10) / 10 }));
    const pieData = [
      { name: "Above 75%", value: above },
      { name: "Below 75%", value: below },
    ];
    return { deptAverages, pieData };
  }, [records]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#132E6B] mb-6">Attendance Overview</h1>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-semibold mb-4">Department Attendance</h3>
          <div style={{ width: "100%", height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={deptAverages}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="attendance" fill="#4F46E5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-semibold mb-4">Attendance Distribution</h3>
          <div style={{ width: "100%", height: 250 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table */}
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
            {records.map((rec, i) => (
              <tr key={i} className="border-b hover:bg-gray-50 transition text-sm">
                <td className="px-4 py-2">{rec.dept}</td>
                <td className="px-4 py-2">{rec.subject}</td>
                <td className="px-4 py-2">{rec.date}</td>
                <td className="px-4 py-2 text-center">{rec.totalStudents}</td>
                <td className="px-4 py-2 text-center">{rec.presentCount}</td>
                <td className={`px-4 py-2 text-center font-semibold ${rec.percentage >= 75 ? "text-green-600" : "text-red-600"}`}>
                  {rec.percentage}%
                </td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => navigate(`/departments/${rec.dept}/${rec.subject}`)} className="bg-[#132E6B] text-white text-xs px-3 py-1 rounded-md hover:bg-blue-800">Open</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AttendanceOverviewClean;

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function StudentReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const course = location.state?.course || "CS301 - Data Structures";

  const [filter, setFilter] = useState("All");

  const attendanceData = [
    { id: 1, name: "Aditi Sharma", totalClasses: 20, attended: 18 },
    { id: 2, name: "Rohan Mehta", totalClasses: 20, attended: 14 },
    { id: 3, name: "Simran Kaur", totalClasses: 20, attended: 19 },
    { id: 4, name: "Vikram Singh", totalClasses: 20, attended: 13 },
    { id: 5, name: "Neha Patel", totalClasses: 20, attended: 20 },
    { id: 6, name: "Arjun Verma", totalClasses: 20, attended: 16 },
  ];

  const filtered = attendanceData.filter((s) => {
    const percent = (s.attended / s.totalClasses) * 100;
    if (filter === "All") return true;
    if (filter === "Below 75%" && percent < 75) return true;
    if (filter === "Above 75%" && percent >= 75) return true;
    return false;
  });

  const getOverall = () => {
    const total = attendanceData.reduce((sum, s) => sum + s.totalClasses, 0);
    const attended = attendanceData.reduce((sum, s) => sum + s.attended, 0);
    return ((attended / total) * 100).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">Student Report</h1>
          <p className="text-gray-700 mt-1">
            <strong>Course:</strong> {course}
          </p>
          <p className="text-gray-600 text-sm">
            Overall Class Attendance: <strong>{getOverall()}%</strong>
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
        >
          ← Back
        </button>
      </div>

      {/* Filter */}
      <div className="mb-6 flex items-center gap-3">
        <label className="text-gray-700 font-semibold">Filter:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 rounded-lg p-2 text-gray-700"
        >
          <option>All</option>
          <option>Above 75%</option>
          <option>Below 75%</option>
        </select>
      </div>

      {/* Student Table */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-blue-800 text-white">
              <th className="p-2 rounded-l-lg">ID</th>
              <th className="p-2">Name</th>
              <th className="p-2 text-center">Classes Attended</th>
              <th className="p-2 text-center">Total Classes</th>
              <th className="p-2 text-center rounded-r-lg">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((student) => {
              const percent = ((student.attended / student.totalClasses) * 100).toFixed(1);
              return (
                <tr
                  key={student.id}
                  className={`border-b hover:bg-gray-100 transition ${
                    percent < 75 ? "bg-red-50" : ""
                  }`}
                >
                  <td className="p-2">{student.id}</td>
                  <td className="p-2">{student.name}</td>
                  <td className="p-2 text-center">{student.attended}</td>
                  <td className="p-2 text-center">{student.totalClasses}</td>
                  <td
                    className={`p-2 text-center font-semibold ${
                      percent < 75 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {percent}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StudentReport;

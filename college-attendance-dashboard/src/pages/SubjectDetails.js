import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";

export default function SubjectDetails() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [classes, setClasses] = useState([]);

  // ✅ Generate 2 classes with 10 students each
  const generateClasses = () => {
    return ["Class A", "Class B"].map((className, cIndex) => ({
      className,
      students: Array.from({ length: 10 }, (_, i) => ({
        rollNo: `${className.replace(" ", "")}-${i + 1}`,
        name: `Student ${i + 1 + cIndex * 10}`,
        present: Math.random() > 0.3,
      })),
    }));
  };

  // ✅ Load attendance for selected date (or generate new)
  useEffect(() => {
    const savedData = JSON.parse(localStorage.getItem("attendanceRecords")) || {};
    if (savedData[date]) {
      setClasses(savedData[date]);
    } else {
      const newClasses = generateClasses();
      setClasses(newClasses);
    }
  }, [date]);

  // ✅ Save attendance to localStorage
  const saveAttendance = () => {
    const savedData = JSON.parse(localStorage.getItem("attendanceRecords")) || {};
    savedData[date] = classes;
    localStorage.setItem("attendanceRecords", JSON.stringify(savedData));
    alert(`Attendance saved for ${date}`);
  };

  // ✅ Toggle attendance
  const handleAttendanceChange = (classIndex, studentIndex) => {
    const updated = [...classes];
    updated[classIndex].students[studentIndex].present =
      !updated[classIndex].students[studentIndex].present;
    setClasses(updated);
  };

  // ✅ Export Excel for that date/class
  const exportToExcel = (cls) => {
    const data = cls.students.map((s) => ({
      "Roll No": s.rollNo,
      Name: s.name,
      Attendance: s.present ? "Present" : "Absent",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, cls.className);
    XLSX.writeFile(wb, `${cls.className}_${date}_Attendance.xlsx`);
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-[#132E6B]">
          📅 Daily Attendance
        </h2>

        {/* ✅ Date Picker */}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-[#132E6B] outline-none"
        />
      </div>

      {/* Classes */}
      {classes.map((cls, classIndex) => (
        <div
          key={classIndex}
          className="bg-white rounded-xl shadow p-4 mb-6 border border-gray-200"
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">{cls.className}</h3>

            <div className="flex gap-3">
              <button
                onClick={() => exportToExcel(cls)}
                className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              >
                Export Excel
              </button>

              <button
                onClick={saveAttendance}
                className="bg-[#132E6B] text-white px-3 py-1 rounded hover:bg-blue-900"
              >
                Save Attendance
              </button>
            </div>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border text-left">Roll No</th>
                <th className="p-2 border text-left">Name</th>
                <th className="p-2 border text-center">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {cls.students.map((s, studentIndex) => (
                <tr key={studentIndex} className="hover:bg-gray-50">
                  <td className="p-2 border">{s.rollNo}</td>
                  <td className="p-2 border">{s.name}</td>
                  <td className="p-2 border text-center">
                    <input
                      type="checkbox"
                      checked={s.present}
                      onChange={() =>
                        handleAttendanceChange(classIndex, studentIndex)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

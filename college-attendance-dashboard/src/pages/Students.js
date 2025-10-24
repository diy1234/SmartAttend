import React from "react";

export default function Students() {
  const students = [
    { id: "STU201", name: "Amit Sharma", year: "1st Year", attendance: "91%" },
    { id: "STU202", name: "Neha Verma", year: "1st Year", attendance: "86%" },
    { id: "STU203", name: "Ravi Kumar", year: "2nd Year", attendance: "79%" },
    { id: "STU204", name: "Simran Kaur", year: "2nd Year", attendance: "88%" },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-blue-800 mb-3">Students Overview</h2>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-blue-100">
            <th className="p-3">Student ID</th>
            <th className="p-3">Name</th>
            <th className="p-3">Year</th>
            <th className="p-3">Attendance</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-b hover:bg-gray-50">
              <td className="p-3 font-semibold">{s.id}</td>
              <td className="p-3">{s.name}</td>
              <td className="p-3">{s.year}</td>
              <td className="p-3">{s.attendance}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import React from "react";

export default function Users() {
  const students = [
    { id: "STU101", name: "Amit Sharma", course: "MCA 1st Year", attendance: "91%" },
    { id: "STU102", name: "Neha Verma", course: "MCA 1st Year", attendance: "86%" },
    { id: "STU103", name: "Ravi Kumar", course: "MCA 2nd Year", attendance: "79%" },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Students Management</h2>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-blue-100">
            <th className="p-3">ID</th>
            <th className="p-3">Name</th>
            <th className="p-3">Course</th>
            <th className="p-3">Attendance</th>
          </tr>
        </thead>
        <tbody>
          {students.map((stu) => (
            <tr key={stu.id} className="border-b hover:bg-gray-50">
              <td className="p-3 font-semibold">{stu.id}</td>
              <td className="p-3">{stu.name}</td>
              <td className="p-3">{stu.course}</td>
              <td className="p-3">{stu.attendance}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

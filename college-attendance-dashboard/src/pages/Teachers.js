import React from "react";

export default function Teachers() {
  const teachers = [
    { id: "T101", name: "Dr. Meena", subject: "Data Structures" },
    { id: "T102", name: "Prof. Gupta", subject: "Database Management" },
    { id: "T103", name: "Dr. Arora", subject: "Operating Systems" },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-blue-800 mb-3">Teachers Information</h2>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-blue-100">
            <th className="p-3">Teacher ID</th>
            <th className="p-3">Name</th>
            <th className="p-3">Subject</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((t) => (
            <tr key={t.id} className="border-b hover:bg-gray-50">
              <td className="p-3 font-semibold">{t.id}</td>
              <td className="p-3">{t.name}</td>
              <td className="p-3">{t.subject}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

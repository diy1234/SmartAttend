import React from "react";

export default function Admins() {
  const admins = [
    { id: "ADM01", name: "Priya Singh", role: "Super Admin" },
    { id: "ADM02", name: "Rahul Mehta", role: "Department Admin" },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-blue-800 mb-3">Admins Panel</h2>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-blue-100">
            <th className="p-3">Admin ID</th>
            <th className="p-3">Name</th>
            <th className="p-3">Role</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((a) => (
            <tr key={a.id} className="border-b hover:bg-gray-50">
              <td className="p-3 font-semibold">{a.id}</td>
              <td className="p-3">{a.name}</td>
              <td className="p-3">{a.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

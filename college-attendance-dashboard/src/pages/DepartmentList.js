import React, { useEffect, useState } from "react";

export default function DepartmentList() {
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/admin/departments")
      .then((res) => res.json())
      .then((data) => setDepartments(data))
      .catch((err) => console.error("Error loading departments:", err));
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-[#132E6B] mb-6">All Departments</h2>

      <div className="overflow-x-auto bg-white shadow rounded-xl">
        <table className="min-w-full">
          <thead className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-amber-700">Department</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-amber-700">Subjects</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-amber-700">Created</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-amber-700">Actions</th>
            </tr>
          </thead>

          <tbody>
            {departments.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-6 text-center text-gray-500">No departments found in database</td>
              </tr>
            ) : (
              departments.map((d, idx) => (
                <tr key={d.id} className={`transition-shadow hover:shadow-sm ${idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/5'}`}>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">{d.name}</td>
                  <td className="px-4 py-4 text-sm text-center text-gray-600">{d.total_subjects !== undefined ? d.total_subjects : '—'}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-4 text-right text-sm">
                    <button className="inline-flex items-center px-3 py-1 border border-amber-200 text-amber-700 rounded-md mr-2 hover:bg-amber-50">Edit</button>
                    <button className="inline-flex items-center px-3 py-1 border border-red-200 text-red-700 rounded-md hover:bg-red-50">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

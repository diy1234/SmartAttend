import React, { useEffect, useState } from "react";

export default function StudentList() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/admin/students")
      .then((res) => res.json())
      .then((data) => setStudents(data))
      .catch((err) => console.error("Error loading students:", err));
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-[#132E6B] mb-6">All Students</h2>

      <div className="overflow-x-auto bg-white shadow rounded-xl">
        <table className="min-w-full">
          <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Student</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Enrollment</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Course</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Semester</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Phone</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Created</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-indigo-700">Actions</th>
            </tr>
          </thead>

          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-6 text-center text-gray-500">No students found in database</td>
              </tr>
            ) : (
              students.map((s, idx) => (
                <tr key={s.id} className={`transition-shadow hover:shadow-sm ${idx % 2 === 0 ? 'bg-white' : 'bg-indigo-50/5'}`}>
                  <td className="px-4 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold">{s.name ? s.name.charAt(0).toUpperCase() : '?'}</div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{s.name}</div>
                      <div className="text-xs text-gray-500">{s.enrollment_no || ''}</div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-sm text-gray-600">{s.email}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{s.enrollment_no}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    <span className="inline-block bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded">{s.course || '-'}</span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">{s.semester}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{s.phone || '-'}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{s.created_at ? new Date(s.created_at).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-4 text-right text-sm">
                    <button className="inline-flex items-center px-3 py-1 border border-indigo-200 text-indigo-700 rounded-md mr-2 hover:bg-indigo-50">Edit</button>
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

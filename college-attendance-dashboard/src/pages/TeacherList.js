import React, { useEffect, useState } from "react";

export default function TeacherList() {
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/admin/teachers")
      .then((res) => res.json())
      .then((data) => setTeachers(data))
      .catch((err) => console.error("Error loading teachers:", err));
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-[#132E6B] mb-6">All Teachers</h2>

      <div className="overflow-x-auto bg-white shadow rounded-xl">
        <table className="min-w-full">
          <thead className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">Faculty</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">Department</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">Designation</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">Contact</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">Created</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-emerald-700">Actions</th>
            </tr>
          </thead>

          <tbody>
            {teachers.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-6 text-center text-gray-500">No teachers found in database</td>
              </tr>
            ) : (
              teachers.map((t, idx) => (
                <tr key={t.id} className={`transition-shadow hover:shadow-sm ${idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/5'}`}>
                  <td className="px-4 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold">{t.full_name ? t.full_name.charAt(0).toUpperCase() : 'T'}</div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{t.full_name}</div>
                      <div className="text-xs text-gray-500">{t.faculty_id || ''}</div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-sm text-gray-600">{t.email}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{t.department || '-'}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{t.designation || '-'}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{t.contact || '-'}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-4 text-right text-sm">
                    <a href={t.linkedin || '#'} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1 border border-emerald-200 text-emerald-700 rounded-md mr-2 hover:bg-emerald-50">Profile</a>
                    <button className="inline-flex items-center px-3 py-1 border border-emerald-200 text-emerald-700 rounded-md mr-2 hover:bg-emerald-50">Edit</button>
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

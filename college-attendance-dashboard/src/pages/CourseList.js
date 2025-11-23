import React, { useEffect, useState } from "react";

export default function CourseList() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/admin/courses")
      .then((res) => res.json())
      .then((data) => setCourses(data))
      .catch((err) => console.error("Error loading courses:", err));
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-[#132E6B] mb-6">All Courses</h2>

      <div className="overflow-x-auto bg-white shadow rounded-xl">
        <table className="min-w-full">
          <thead className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-pink-700">Course</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-pink-700">Department</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-pink-700">Created</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-pink-700">Actions</th>
            </tr>
          </thead>

          <tbody>
            {courses.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-6 text-center text-gray-500">No courses found in database</td>
              </tr>
            ) : (
              courses.map((c, idx) => (
                <tr key={c.id} className={`transition-shadow hover:shadow-sm ${idx % 2 === 0 ? 'bg-white' : 'bg-pink-50/5'}`}>
                  <td className="px-4 py-4 text-sm text-gray-800">{c.name || '—'}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{c.department || '—'}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-4 text-right text-sm">
                    <button className="inline-flex items-center px-3 py-1 border border-pink-200 text-pink-700 rounded-md mr-2 hover:bg-pink-50">Edit</button>
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

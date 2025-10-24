import React, { useState } from 'react';

const CourseList = () => {
  const [courses] = useState([
    { id: 1, name: 'CS301 - Data Structures', students: 45, avg: 90 },
    { id: 2, name: 'CS405 - Algorithms', students: 42, avg: 85 },
    { id: 3, name: 'CS501 - Operating Systems', students: 40, avg: 88 },
  ]);

  const handleViewDetails = (course) => {
    alert('Viewing students for ' + course.name);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-xl font-semibold text-[#132E6B] mb-4">My Courses</h2>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#132E6B] text-white text-left">
            <th className="p-3 rounded-tl-lg">Course</th>
            <th className="p-3">Students</th>
            <th className="p-3">Avg Attendance</th>
            <th className="p-3 rounded-tr-lg">Action</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => (
            <tr key={course.id} className="border-b hover:bg-blue-50 transition text-gray-700">
              <td className="p-3">{course.name}</td>
              <td className="p-3">{course.students}</td>
              <td className="p-3">{course.avg}%</td>
              <td className="p-3">
                <button
                  onClick={() => handleViewDetails(course)}
                  className="text-sm bg-[#132E6B] text-white px-3 py-1 rounded-md hover:bg-blue-900 transition"
                >
                  View Students
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CourseList;

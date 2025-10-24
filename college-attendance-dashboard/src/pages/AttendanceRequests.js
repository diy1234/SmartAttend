import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function AttendanceRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([
    { id: 1, name: "Aditi Sharma", course: "CS301 - Data Structures", date: "2025-10-18" },
    { id: 2, name: "Rohan Mehta", course: "CS405 - Algorithms", date: "2025-10-19" },
    { id: 3, name: "Neha Patel", course: "CS501 - Operating Systems", date: "2025-10-19" },
  ]);

  const handleAction = (id, action) => {
    alert(`✅ Request ${action} for student ID ${id}`);
    setRequests(requests.filter((r) => r.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-900">Attendance Requests</h1>
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
        >
          ← Back
        </button>
      </div>

      <div className="bg-white shadow-md rounded-xl p-6">
        {requests.length === 0 ? (
          <p className="text-gray-600">No pending requests 🎉</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-blue-800 text-white">
                <th className="p-2">Student</th>
                <th className="p-2">Course</th>
                <th className="p-2">Date</th>
                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-100 transition">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.course}</td>
                  <td className="p-2">{r.date}</td>
                  <td className="p-2 text-center space-x-3">
                    <button
                      onClick={() => handleAction(r.id, "Approved")}
                      className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-500"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(r.id, "Rejected")}
                      className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-500"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AttendanceRequests;

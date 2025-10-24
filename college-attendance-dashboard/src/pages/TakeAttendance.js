import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DataContext from '../context/DataContext';
import ToastContext from '../context/ToastContext';

function TakeAttendance() {
  const navigate = useNavigate();
  const location = useLocation();
  const course = location.state?.course || 'CS301 - Data Structures';

  const [students, setStudents] = useState([
    { id: 1, name: 'Aditi Sharma', status: 'Present' },
    { id: 2, name: 'Rohan Mehta', status: 'Present' },
    { id: 3, name: 'Simran Kaur', status: 'Present' },
    { id: 4, name: 'Vikram Singh', status: 'Present' },
    { id: 5, name: 'Neha Patel', status: 'Present' },
    { id: 6, name: 'Arjun Verma', status: 'Present' },
  ]);

  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [locked, setLocked] = useState(false);

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = (id) => {
    if (locked) return;
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: s.status === 'Present' ? 'Absent' : 'Present' } : s
      )
    );
  };

  const { addAttendance } = useContext(DataContext);
  const { showToast } = useContext(ToastContext);

  const handleSubmit = () => {
    setLocked(true);
    const record = {
      id: Date.now(),
      course,
      date: new Date().toISOString(),
      notes,
      students,
      submittedBy: JSON.parse(localStorage.getItem('user'))?.email || 'unknown',
    };
    addAttendance(record);
    showToast('✅ Attendance submitted successfully!', 'info', 3000);
    navigate('/admin-dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">Mark Attendance</h1>
          <p className="text-gray-700 mt-1">
            <strong>Course:</strong> {course}
          </p>
          <p className="text-gray-600 text-sm">Date: {new Date().toDateString()}</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
        >
          ← Back
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search student..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg p-2 text-gray-700"
        />
        <span className="text-sm text-gray-500">{filteredStudents.length} students</span>
      </div>

      {/* Student List */}
      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-blue-800 text-white">
              <th className="p-2 rounded-l-lg">ID</th>
              <th className="p-2">Name</th>
              <th className="p-2 text-center rounded-r-lg">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr
                key={student.id}
                className={`border-b hover:bg-gray-100 transition ${
                  student.status === 'Absent' ? 'bg-red-50' : ''
                }`}
              >
                <td className="p-2">{student.id}</td>
                <td className="p-2">{student.name}</td>
                <td className="p-2 text-center">
                  <button
                    onClick={() => toggleStatus(student.id)}
                    disabled={locked}
                    className={`px-4 py-1 rounded-lg font-medium ${
                      student.status === 'Present'
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    } ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {student.status}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes & Submit */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">Session Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add remarks for this session (optional)..."
          className="w-full border border-gray-300 rounded-lg p-3 text-gray-700 mb-4"
          rows="3"
          disabled={locked}
        />
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={locked}
            className={`px-6 py-2 rounded-lg text-white font-semibold ${
              locked ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-800 hover:bg-blue-700'
            }`}
          >
            {locked ? 'Attendance Locked' : 'Submit & Lock'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TakeAttendance;

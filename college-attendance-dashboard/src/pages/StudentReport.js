import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function StudentReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState([]);
  const [error, setError] = useState(null);
  const user = JSON.parse(localStorage.getItem('user')) || {};

  // Fetch attendance data from backend
  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = user.id || user.user_id;
      
      if (!userId) {
        setError('No user ID found. Please login again.');
        setLoading(false);
        return;
      }

      console.log("📊 Fetching attendance report for user:", userId);

      // First, fetch dashboard to get the actual student_id (not user_id)
      const dashRes = await api.get(`/student/dashboard/${userId}`);
      const studentId = dashRes.data?.profile?.student_id;
      
      if (!studentId) {
        setError('Could not determine student ID. Please try again.');
        setLoading(false);
        return;
      }

      console.log("📋 Using student_id:", studentId);

      // Now fetch attendance records using the correct student_id
      const response = await api.get(`/attendance/student/${studentId}`);

      if (!response || !response.data) {
        setError('Could not load attendance data from server');
        setLoading(false);
        return;
      }

      console.log("📈 API Response:", response.data);

      // Handle different response formats
      let attendances = [];
      if (response.data.attendances) {
        attendances = response.data.attendances;
      } else if (response.data.records) {
        attendances = response.data.records;
      } else if (Array.isArray(response.data)) {
        attendances = response.data;
      }

      console.log("✅ Processed attendance records:", attendances.length);
      
      // Debug log to check what subjects are in the data
      const subjectsInData = [...new Set(attendances.map(a => a.subject).filter(Boolean))];
      console.log("📚 Subjects found in attendance data:", subjectsInData);
      
      setAttendanceData(attendances);

    } catch (error) {
      console.error('❌ Error fetching attendance data:', error);
      setError(`Failed to load attendance report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchAttendanceData();
  }, []);

  // Calculate attendance summary per subject
  const calculateAttendanceSummary = () => {
    const summary = {};
    
    attendanceData.forEach(record => {
      // Use subject from the attendance record (do NOT fall back to class_name)
      const subject = record.subject || 'Unknown Subject';
      const department = record.department || 'General';
      const key = `${department}||${subject}`;
      
      if (!summary[key]) {
        summary[key] = {
          department: department,
          subject: subject,
          present: 0,
          total: 0,
          records: []
        };
      }
      
      summary[key].total += 1;
      summary[key].records.push(record);
      
      if (record.status === 'present' || record.status === 'Present') {
        summary[key].present += 1;
      }
    });

    // Convert to array and calculate percentages
    const rows = Object.values(summary).map(item => ({
      ...item,
      percentage: item.total > 0 ? Math.round((item.present / item.total) * 100) : 0
    }));

    // Sort by department and subject
    return rows.sort((a, b) => {
      if (a.department !== b.department) {
        return a.department.localeCompare(b.department);
      }
      return a.subject.localeCompare(b.subject);
    });
  };

  const attendanceSummary = calculateAttendanceSummary();

  // Calculate overall statistics
  const overallStats = attendanceSummary.reduce((stats, subject) => {
    stats.totalClasses += subject.total;
    stats.totalPresent += subject.present;
    stats.subjectsCount += 1;
    return stats;
  }, { totalClasses: 0, totalPresent: 0, subjectsCount: 0 });

  const overallPercentage = overallStats.totalClasses > 0 
    ? Math.round((overallStats.totalPresent / overallStats.totalClasses) * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendance report...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching data from database</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">My Subject-wise Attendance Report</h1>
          <p className="text-gray-700 mt-1">
            Showing attendance for: <strong>{user.name || user.email}</strong>
          </p>
          {user.enrollment_no && (
            <p className="text-gray-600 text-sm">Enrollment: {user.enrollment_no}</p>
          )}
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchAttendanceData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200 flex items-center gap-2"
          >
            🔄 Refresh
          </button>
          <button 
            onClick={() => navigate('/student-dashboard')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200"
          >
            ← Dashboard
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-800">
            <span className="text-lg">⚠️</span>
            <div>
              <strong>Error Loading Report:</strong> {error}
            </div>
          </div>
          <button 
            onClick={fetchAttendanceData}
            className="mt-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Overall Statistics */}
      {attendanceSummary.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
            <div className="text-2xl font-bold text-blue-800">{overallStats.subjectsCount}</div>
            <div className="text-blue-600 text-sm">Subjects</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
            <div className="text-2xl font-bold text-green-800">{overallStats.totalPresent}</div>
            <div className="text-green-600 text-sm">Present Days</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
            <div className="text-2xl font-bold text-gray-800">{overallStats.totalClasses}</div>
            <div className="text-gray-600 text-sm">Total Classes</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
            <div className={`text-2xl font-bold ${
              overallPercentage >= 75 ? 'text-green-800' : 
              overallPercentage >= 60 ? 'text-yellow-800' : 'text-red-800'
            }`}>
              {overallPercentage}%
            </div>
            <div className="text-gray-600 text-sm">Overall Attendance</div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-md">
        {attendanceSummary.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Attendance Records Found</h3>
            <p className="text-gray-500 mb-6">
              {error 
                ? "Could not load attendance data. Please check the error message above."
                : "No attendance records found for your account. Attendance will appear here once your teachers mark it."
              }
            </p>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => navigate('/student-dashboard')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
              >
                Go to Dashboard
              </button>
              <button 
                onClick={fetchAttendanceData}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex justify-between items-center">
              <p className="text-gray-600">
                Showing attendance for <strong>{attendanceSummary.length}</strong> subject{attendanceSummary.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>≥75% (Good)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>60-74% (Average)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>&lt;60% (Poor)</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-blue-800 text-white">
                    <th className="p-4 font-semibold">Department</th>
                    <th className="p-4 font-semibold">Subject</th>
                    <th className="p-4 font-semibold text-center">Present</th>
                    <th className="p-4 font-semibold text-center">Total</th>
                    <th className="p-4 font-semibold text-center">Percentage</th>
                    <th className="p-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceSummary.map((subject, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium text-gray-800">
                        {subject.department}
                      </td>
                      <td className="p-4 font-medium text-gray-800">
                        {subject.subject}
                      </td>
                      <td className="p-4 text-center text-green-600 font-semibold">
                        {subject.present}
                      </td>
                      <td className="p-4 text-center text-gray-700">
                        {subject.total}
                      </td>
                      <td className="p-4 text-center font-semibold">
                        <span className={`px-3 py-2 rounded-full text-sm ${
                          subject.percentage >= 75 ? 'bg-green-100 text-green-800' :
                          subject.percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {subject.percentage}%
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-sm font-semibold ${
                          subject.percentage >= 75 ? 'text-green-600' :
                          subject.percentage >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {subject.percentage >= 75 ? 'Good' :
                           subject.percentage >= 60 ? 'Average' : 'Poor'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Notes */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Attendance Policy</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Minimum 75% attendance required in each subject</li>
                <li>• Below 60% attendance may require special permission</li>
                <li>• Regular attendance is crucial for academic success</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function StudentDashboard() {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [studentProfile, setStudentProfile] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  
  // Form states for attendance request
  const [requestForm, setRequestForm] = useState({
    dept: '',
    subject: '',
    section: '',
    fromDate: '',
    toDate: '',
    reason: ''
  });

  // Fetch live data from backend
  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        setLoading(true);
        const currentUser = JSON.parse(localStorage.getItem('user')) || {};
        const userId = currentUser.id || currentUser.user_id;

        if (!userId) {
          console.error('No user ID found');
          return;
        }

        // Fetch student profile
        try {
          const profileResponse = await api.get(`/users/profile?user_id=${userId}`);
          setStudentProfile(profileResponse.data.profile);
        } catch (profileError) {
          console.error('Profile fetch error:', profileError);
        }

        // Fetch attendance data
        try {
          const attendanceResponse = await api.get(`/attendance?student_id=${userId}`);
          setAttendanceData(attendanceResponse.data.attendances || []);
        } catch (attendanceError) {
          console.error('Attendance fetch error:', attendanceError);
        }

        // Fetch leave requests
        try {
          const leaveResponse = await api.get(`/attendance-requests?student_id=${userId}`);
          setLeaveRequests(leaveResponse.data.requests || []);
        } catch (leaveError) {
          console.error('Leave requests fetch error:', leaveError);
        }

      } catch (error) {
        console.error('Error fetching live data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveData();
  }, []);

  // Calculate attendance summary
  const attendanceSummary = attendanceData.reduce((acc, record) => {
    const subjectName = record.subject || 'Unknown';
    if (!acc[subjectName]) {
      acc[subjectName] = { present: 0, total: 0 };
    }
    acc[subjectName].total += 1;
    if (record.status === 'present' || record.status === 'Present') {
      acc[subjectName].present += 1;
    }
    return acc;
  }, {});

  const handleInputChange = (field, value) => {
    setRequestForm(prev => ({ ...prev, [field]: value }));
  };

  const submitAttendanceRequest = async () => {
    if (!requestForm.fromDate || !requestForm.toDate || !requestForm.reason) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const currentUser = JSON.parse(localStorage.getItem('user')) || {};
      const newRequest = {
        student_id: currentUser.id || currentUser.user_id,
        dept: requestForm.dept,
        subject: requestForm.subject,
        section: requestForm.section,
        from_date: requestForm.fromDate,
        to_date: requestForm.toDate,
        reason: requestForm.reason,
        status: 'pending'
      };

      const response = await api.post('/attendance-requests', newRequest);
      
      if (response.data.success) {
        alert('Attendance request submitted successfully!');
        // Refresh leave requests
        const leaveResponse = await api.get(`/attendance-requests?student_id=${currentUser.id || currentUser.user_id}`);
        setLeaveRequests(leaveResponse.data.requests || []);
        
        // Reset form
        setRequestForm({
          dept: '',
          subject: '',
          section: '',
          fromDate: '',
          toDate: '',
          reason: ''
        });
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Error submitting request. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#132E6B] mb-2">Student Dashboard</h1>
        <div className="w-20 h-1 bg-blue-600 rounded"></div>
      </div>

      {/* Student Profile Card with Register Face Button */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {(studentProfile?.name || 'S').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">
                {studentProfile?.name || 'Student Name'}
              </h2>
              <p className="text-gray-600">{studentProfile?.email || 'No email'}</p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                {studentProfile?.enrollment_no && (
                  <span><strong>Enrollment:</strong> {studentProfile.enrollment_no}</span>
                )}
                {studentProfile?.course && (
                  <span><strong>Course:</strong> {studentProfile.course}</span>
                )}
                {studentProfile?.department && (
                  <span><strong>Department:</strong> {studentProfile.department}</span>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={() => navigate('/face-registration')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200 w-full md:w-auto"
          >
            Register Face
          </button>
        </div>
      </div>

      {/* Attendance Summary */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-6">Attendance Summary</h3>
        
        {Object.keys(attendanceSummary).length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <p className="text-gray-500 text-lg">No attendance records yet.</p>
            <p className="text-gray-400 text-sm mt-2">Attendance records will appear here once marked.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-4 text-left font-semibold text-gray-700">Subject</th>
                  <th className="p-4 text-center font-semibold text-gray-700">Present</th>
                  <th className="p-4 text-center font-semibold text-gray-700">Total</th>
                  <th className="p-4 text-center font-semibold text-gray-700">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(attendanceSummary).map(([subject, data]) => {
                  const percentage = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
                  return (
                    <tr key={subject} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-medium text-gray-800">{subject}</td>
                      <td className="p-4 text-center text-green-600 font-semibold">
                        {data.present}
                      </td>
                      <td className="p-4 text-center text-gray-700">{data.total}</td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-2 rounded-full text-sm font-semibold ${
                          percentage >= 75 ? 'bg-green-100 text-green-800' :
                          percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {percentage}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attendance Request */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-6">Attendance Request</h3>
        
        <div className="space-y-6">
          {/* Department, Subject, Section Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <select 
                value={requestForm.dept}
                onChange={(e) => handleInputChange('dept', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Department</option>
                <option value="MCA">MCA</option>
                <option value="MBA">MBA</option>
                <option value="B.Tech">B.Tech</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select 
                value={requestForm.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Subject</option>
                <option value="Artificial Intelligence">Artificial Intelligence</option>
                <option value="Data Structures">Data Structures</option>
                <option value="Web Development">Web Development</option>
                <option value="Database Management">Database Management</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
              <select 
                value={requestForm.section}
                onChange={(e) => handleInputChange('section', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Section (optional)</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
            </div>
          </div>

          {/* Date Range Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input 
                type="date" 
                value={requestForm.fromDate}
                onChange={(e) => handleInputChange('fromDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input 
                type="date" 
                value={requestForm.toDate}
                onChange={(e) => handleInputChange('toDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Reason and Submit Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
              <select 
                value={requestForm.reason}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select reason</option>
                <option value="sick">Sick</option>
                <option value="personal">Personal</option>
                <option value="medical">Medical</option>
                <option value="family">Family Emergency</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button 
                onClick={submitAttendanceRequest}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors duration-200"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* My Leave Requests */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-6">My Leave Requests</h3>
        
        {leaveRequests.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <p className="text-gray-500 text-lg">No leave requests yet.</p>
            <p className="text-gray-400 text-sm mt-2">Submit a request above to see it here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-4 text-left font-semibold text-gray-700">Subject</th>
                  <th className="p-4 text-left font-semibold text-gray-700">From</th>
                  <th className="p-4 text-left font-semibold text-gray-700">To</th>
                  <th className="p-4 text-left font-semibold text-gray-700">Reason</th>
                  <th className="p-4 text-left font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map(request => (
                  <tr key={request.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 text-gray-800">{request.subject}</td>
                    <td className="p-4 text-gray-700">{request.from_date}</td>
                    <td className="p-4 text-gray-700">{request.to_date}</td>
                    <td className="p-4 text-gray-700">{request.reason}</td>
                    <td className="p-4">
                      <span className={`px-3 py-2 rounded-full text-sm font-semibold ${
                        request.status === 'approved' ? 'bg-green-100 text-green-800' :
                        request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {request.status?.charAt(0).toUpperCase() + request.status?.slice(1) || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
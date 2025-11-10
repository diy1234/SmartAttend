import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function StudentDashboard() {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [studentProfile, setStudentProfile] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  
  // Form states for attendance request
  const [requestForm, setRequestForm] = useState({
    department: '',
    subject: '',
    request_date: '',
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

        // Fetch student profile with detailed information
        try {
          const profileResponse = await api.get(`/users/profile?user_id=${userId}`);
          const profileData = profileResponse.data.profile;
          
          // If we have student profile, fetch additional student details
          if (profileData && profileData.id) {
            try {
              const studentDetailResponse = await api.get(`/api/student/profile/${profileData.id}`);
              setStudentProfile({
                ...profileData,
                ...studentDetailResponse.data.profile
              });
            } catch (detailError) {
              console.error('Student detail fetch error:', detailError);
              setStudentProfile(profileData);
            }
          } else {
            setStudentProfile(profileData);
          }
        } catch (profileError) {
          console.error('Profile fetch error:', profileError);
          setStudentProfile(currentUser);
        }

        // Fetch attendance data for student
        try {
          const attendanceResponse = await api.get(`/api/attendance/student/${userId}`);
          setAttendanceData(attendanceResponse.data.attendances || []);
        } catch (attendanceError) {
          console.error('Attendance fetch error:', attendanceError);
          // Fallback to general endpoint
          try {
            const fallbackResponse = await api.get(`/attendance?student_id=${userId}`);
            setAttendanceData(fallbackResponse.data.attendances || []);
          } catch (fallbackError) {
            console.error('Fallback attendance fetch error:', fallbackError);
          }
        }

        // Fetch leave requests for student
        try {
          const leaveResponse = await api.get(`/api/attendance-requests/student/${userId}`);
          setLeaveRequests(leaveResponse.data.requests || []);
        } catch (leaveError) {
          console.error('Leave requests fetch error:', leaveError);
        }

        // Fetch enrolled classes to populate dropdowns
        try {
          const classesResponse = await api.get(`/api/student/enrolled-classes/${userId}`);
          setEnrolledClasses(classesResponse.data.classes || []);
          
          // Pre-populate form with available subjects if any
          if (classesResponse.data.classes && classesResponse.data.classes.length > 0) {
            const firstClass = classesResponse.data.classes[0];
            setRequestForm(prev => ({
              ...prev,
              department: firstClass.department || '',
              subject: firstClass.subject || ''
            }));
          }
        } catch (classesError) {
          console.error('Classes fetch error:', classesError);
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
  console.log("🔄 Submitting attendance request...");
  console.log("📋 Form data:", requestForm);

  if (!requestForm.request_date) {
    alert('Please select a date for the attendance request');
    return;
  }

  if (!requestForm.department || !requestForm.subject) {
    alert('Please select department and subject');
    return;
  }

  try {
    const currentUser = JSON.parse(localStorage.getItem('user')) || {};
    const userId = currentUser.id || currentUser.user_id;

    console.log("👤 Current user ID:", userId);

    // First, test with debug endpoint
    const testData = {
      student_id: userId,
      teacher_id: 1, // Fallback teacher ID
      department: requestForm.department,
      subject: requestForm.subject,
      request_date: requestForm.request_date,
      reason: requestForm.reason || '',
      status: 'pending'
    };

    console.log("🧪 Testing with data:", testData);

    // Test with debug endpoint first
    try {
      const debugResponse = await api.post('/debug/attendance-request', testData);
      console.log("✅ Debug endpoint response:", debugResponse.data);
    } catch (debugError) {
      console.error("❌ Debug endpoint error:", debugError);
    }

    // Then try the real endpoint
    const response = await api.post('/attendance-requests', testData);
    console.log("✅ Real endpoint response:", response.data);
    
    if (response.data.success) {
      alert('Attendance request submitted successfully!');
      
      // Refresh leave requests
      const leaveResponse = await api.get(`/attendance-requests/student/${userId}`);
      setLeaveRequests(leaveResponse.data.requests || []);
      
      // Reset form
      setRequestForm({
        department: '',
        subject: '',
        request_date: '',
        reason: ''
      });
    } else {
      alert('Failed to submit request: ' + (response.data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('❌ Error submitting request:', error);
    console.error('❌ Error details:', error.response?.data);
    alert('Error submitting request. Check console for details.');
  }
};

  // Get unique departments and subjects from enrolled classes
  const availableDepartments = [...new Set(enrolledClasses.map(cls => cls.department).filter(Boolean))];
  const availableSubjects = [...new Set(enrolledClasses.map(cls => cls.subject).filter(Boolean))];

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
            <div
              role="button"
              onClick={() => navigate('/student-profile')}
              className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold cursor-pointer"
              title="View Profile"
            >
              {((studentProfile?.name || JSON.parse(localStorage.getItem('user')|| '{}').name) || 'S').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 cursor-pointer" onClick={() => navigate('/student-profile')}>
                {studentProfile?.name || JSON.parse(localStorage.getItem('user')|| '{}').name || 'Student Name'}
              </h2>
              <p className="text-gray-600">{studentProfile?.email || JSON.parse(localStorage.getItem('user')|| '{}').email || 'No email'}</p>
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
                {studentProfile?.semester && (
                  <span><strong>Semester:</strong> {studentProfile.semester}</span>
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
          {/* Department, Subject Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <select 
                value={requestForm.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Department</option>
                {availableDepartments.length > 0 ? (
                  availableDepartments.map((dept, index) => (
                    <option key={index} value={dept}>
                      {dept}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                  </>
                )}
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
                {availableSubjects.length > 0 ? (
                  availableSubjects.map((subject, index) => (
                    <option key={index} value={subject}>
                      {subject}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Data Structures">Data Structures</option>
                    <option value="Web Development">Web Development</option>
                    <option value="Database Systems">Database Systems</option>
                    <option value="Artificial Intelligence">Artificial Intelligence</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Single Date Row */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input 
                type="date" 
                value={requestForm.request_date}
                onChange={(e) => handleInputChange('request_date', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Reason and Submit Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason (optional)</label>
              <select 
                value={requestForm.reason}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select reason (optional)</option>
                <option value="face_not_recognised">Face not recognised</option>
                <option value="portal_not_working">Portal not working</option>
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
    </div>
  );
}
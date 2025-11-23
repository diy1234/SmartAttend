import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function StudentDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [studentProfile, setStudentProfile] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [faceRegistered, setFaceRegistered] = useState(false);

  // Attendance Request Form
  const [requestForm, setRequestForm] = useState({
    department: "",
    subject: "",
    request_date: "",
    reason: "",
    teacher_id: null
  });

  // -------------------------------------------------
  // LOAD DASHBOARD DATA
  // -------------------------------------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const currentUser = JSON.parse(localStorage.getItem("user")) || {};
        const userId = currentUser.id || currentUser.user_id;

        if (!userId) {
          console.error("No user ID found");
          return;
        }

        // ---- FETCH DASHBOARD DATA ----
        const dash = await api.get(`/student/dashboard/${userId}`);
        const data = dash.data;

        setStudentProfile(data.profile);
        setAttendanceSummary(data.attendance_summary || []);
        setLeaveRequests(data.leave_requests || []);

        // ---- FETCH ENROLLED CLASSES (for dropdown) ----
        const classesRes = await api.get(`/student/enrolled-classes/${userId}`);
        const classes = classesRes.data.classes || [];
        setEnrolledClasses(classes);

        // ---- FETCH ALL DEPARTMENTS & SUBJECTS ----
        const deptSubjRes = await api.get(`/student/departments-subjects`);
        const departments = deptSubjRes.data.departments || [];
        setAllDepartments(departments);
        
        // Flatten all subjects from all departments
        const allSubj = [];
        departments.forEach(dept => {
          if (dept.subjects && Array.isArray(dept.subjects)) {
            allSubj.push(...dept.subjects);
          }
        });
        setAllSubjects([...new Set(allSubj)]); // Remove duplicates

        // ENHANCED FACE REGISTRATION STATUS CHECK
        try {
          console.log("🔍 Checking face registration status for user:", userId);
          
          // First, get the actual student ID from the profile data
          const studentId = data.profile?.student_id || data.profile?.id || userId;
          console.log("📋 Using student ID for face check:", studentId);
          
          const faceStatusResponse = await fetch(`http://127.0.0.1:5000/api/face-registration-status/${studentId}`);
          
          if (faceStatusResponse.ok) {
            const faceStatus = await faceStatusResponse.json();
            console.log("📊 Face registration status response:", faceStatus);
            
            if (faceStatus.success) {
              setFaceRegistered(faceStatus.face_registered);
              console.log("✅ Face registered status:", faceStatus.face_registered);
              if (faceStatus.face_registered) {
                console.log("🎉 Face is registered for:", faceStatus.student_name);
              }
            } else {
              console.error("❌ Face status check failed:", faceStatus.error);
              setFaceRegistered(false);
            }
          } else {
            console.error("❌ Face status response not OK:", faceStatusResponse.status);
            setFaceRegistered(false);
          }
        } catch (faceError) {
          console.error("❌ Error checking face registration status:", faceError);
          setFaceRegistered(false);
        }

        // Auto fill default subject/department/teacher_id from first class
        if (classes.length > 0) {
          setRequestForm(prev => ({
            ...prev,
            department: classes[0].department || "",
            subject: classes[0].subject || "",
            teacher_id: classes[0].teacher_id || null,
            class_id: classes[0].class_id || null
          }));
        }

      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // -------------------------------------------------
  // HANDLE FORM FIELD CHANGE
  // -------------------------------------------------
  const handleInputChange = (field, value) => {
    setRequestForm(prev => ({ ...prev, [field]: value }));
    
    // When subject or department changes, update teacher_id from enrolled classes
    if (field === 'subject' || field === 'department') {
      const selectedClass = enrolledClasses.find(
        c => c.subject === (field === 'subject' ? value : requestForm.subject) &&
             c.department === (field === 'department' ? value : requestForm.department)
      );
      if (selectedClass) {
        setRequestForm(prev => ({
          ...prev,
          teacher_id: selectedClass.teacher_id || null,
          class_id: selectedClass.class_id || null
        }));
      }
    }
  };

  // -------------------------------------------------
  // SUBMIT ATTENDANCE REQUEST
  // -------------------------------------------------
  const submitAttendanceRequest = async () => {
    const currentUser = JSON.parse(localStorage.getItem("user")) || {};
    const userId = currentUser.id || currentUser.user_id;

    if (!requestForm.request_date) return alert("Please select a date.");
    if (!requestForm.subject || !requestForm.department)
      return alert("Please select subject & department.");
    if (!requestForm.teacher_id)
      return alert("Could not find teacher for this class. Please select a valid subject.");

    const payload = {
      student_id: userId,
      teacher_id: requestForm.teacher_id,
      department: requestForm.department,
      subject: requestForm.subject,
      request_date: requestForm.request_date,
      reason: requestForm.reason || ""
    };

    try {
      const res = await api.post("/attendance-requests/requests", payload);

      alert("Request submitted successfully!");

      // Reload student leave requests
      const r = await api.get(`/attendance-requests/requests/student/${userId}`);
      setLeaveRequests(r.data || []);

      // Reset form but keep first class defaults
      if (enrolledClasses.length > 0) {
        setRequestForm({
          department: enrolledClasses[0].department || "",
          subject: enrolledClasses[0].subject || "",
          request_date: "",
          reason: "",
          teacher_id: enrolledClasses[0].teacher_id || null,
          class_id: enrolledClasses[0].class_id || null
        });
      } else {
        setRequestForm({
          department: "",
          subject: "",
          request_date: "",
          reason: "",
          teacher_id: null,
          class_id: null
        });
      }

    } catch (error) {
      console.error("Request error:", error);
      alert("Error submitting request.");
    }
  };

  // Navigate to face registration
  const navigateToFaceRegistration = () => {
    navigate('/face-registration');
  };

  // Debug function to check current user data
  const debugCurrentUser = async () => {
    const currentUser = JSON.parse(localStorage.getItem("user")) || {};
    console.log('🔍 Current user from localStorage:', currentUser);
    
    if (currentUser.id) {
      try {
        const response = await fetch(`http://127.0.0.1:5000/api/debug/current-student?user_id=${currentUser.id}`);
        const data = await response.json();
        console.log('📊 Student data from backend:', data);
      } catch (error) {
        console.error('❌ Error fetching student data:', error);
      }
    }
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate summary percentages
  const formattedSummary = attendanceSummary.reduce((acc, rec) => {
    acc[rec.subject] = {
      present: rec.present_classes,
      total: rec.total_classes
    };
    return acc;
  }, {});

  const availableDepartments = allDepartments.map(d => d.department);
  const availableSubjects = allSubjects;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">📚 Student Dashboard</h1>
          <div className="w-20 h-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded mt-3"></div>
          {/* Debug button - remove in production */}
          <button 
            onClick={debugCurrentUser}
            className="mt-2 text-xs bg-gray-200 px-2 py-1 rounded"
            title="Check console for debug info"
          >
            🐛 Debug User
          </button>
        </div>

        {/* PROFILE CARD */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-10 border-t-4 border-blue-600">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="flex items-center gap-8">
              <div
                onClick={() => navigate("/student-profile")}
                className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white text-3xl font-bold cursor-pointer hover:shadow-lg transition-shadow"
              >
                {(studentProfile?.name || "S").charAt(0)}
              </div>

              <div className="flex-1">
                <h2 className="text-3xl font-bold text-blue-900">{studentProfile?.name}</h2>
                <p className="text-blue-600 font-medium">{studentProfile?.email}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 font-semibold uppercase">Enrollment</p>
                    <p className="text-lg font-bold text-blue-900">{studentProfile?.enrollment_no || '-'}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 font-semibold uppercase">Course</p>
                    <p className="text-lg font-bold text-blue-900">{studentProfile?.course || '-'}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 font-semibold uppercase">Semester</p>
                    <p className="text-lg font-bold text-blue-900">{studentProfile?.semester || '-'}</p>
                  </div>
                  {/* Face Registration Status */}
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 font-semibold uppercase">Face Registered</p>
                    <p className={`text-lg font-bold ${faceRegistered ? 'text-green-600' : 'text-red-600'}`}>
                      {faceRegistered ? '✅ Yes' : '❌ No'}
                    </p>
                  </div>
                </div>

                {/* Face Registration Prompt */}
                {!faceRegistered && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-700 text-sm">
                      <strong>Action Required:</strong> Register your face for facial recognition attendance.
                    </p>
                    <button
                      onClick={navigateToFaceRegistration}
                      className="mt-2 bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-700"
                    >
                      Register Face Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* ATTENDANCE SUMMARY */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-10">
        <div className="flex items-center gap-3 mb-8">
          <h3 className="text-2xl font-bold text-blue-900">📊 Attendance Summary</h3>
          <span className="text-gray-400 text-sm">({Object.keys(formattedSummary).length} subjects)</span>
        </div>

        {Object.keys(formattedSummary).length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">📉</div>
            <p className="text-lg">No attendance data yet</p>
            <p className="text-sm text-gray-400 mt-2">Your attendance will appear here once classes start</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(formattedSummary).map(([sub, data]) => {
              const pct = data.total === 0 ? 0 : Math.round((data.present / data.total) * 100);
              const isGood = pct >= 75;
              return (
                <div key={sub} className={`p-6 rounded-xl border-2 transition-all ${isGood ? 'bg-green-50 border-green-300' : 'bg-orange-50 border-orange-300'}`}>
                  <h4 className="font-bold text-gray-800 mb-3">{sub}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Attendance</span>
                      <span className="font-semibold text-gray-800">{pct}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all ${isGood ? 'bg-green-500' : 'bg-orange-500'}`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 mt-3 pt-2 border-t">
                      <span>Present: <span className="font-bold">{data.present}</span></span>
                      <span>Total: <span className="font-bold">{data.total}</span></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ATTENDANCE REQUEST FORM */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-8">
          <h3 className="text-2xl font-bold text-blue-900">📝 Submit Attendance Request</h3>
        </div>

        <div className="space-y-6">
          {/* Department + Subject */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-3 font-semibold text-gray-700">🏢 Department</label>
              <select
                value={requestForm.department}
                onChange={e => handleInputChange("department", e.target.value)}
                className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-600 focus:outline-none transition"
              >
                <option value="">Select Department</option>
                {availableDepartments.map((dept, idx) => (
                  <option key={idx} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-3 font-semibold text-gray-700">📚 Subject</label>
              <select
                value={requestForm.subject}
                onChange={e => handleInputChange("subject", e.target.value)}
                className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-600 focus:outline-none transition"
              >
                <option value="">Select Subject</option>
                {requestForm.department && allDepartments.find(d => d.department === requestForm.department)?.subjects?.map((sub, idx) => (
                  <option key={idx} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block mb-3 font-semibold text-gray-700">📅 Date</label>
            <input
              type="date"
              value={requestForm.request_date}
              onChange={e => handleInputChange("request_date", e.target.value)}
              className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-600 focus:outline-none transition"
            />
          </div>

          {/* Reason + Button */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-3 font-semibold text-gray-700">💬 Reason (optional)</label>
              <select
                value={requestForm.reason}
                onChange={e => handleInputChange("reason", e.target.value)}
                className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-600 focus:outline-none transition"
              >
                <option value="">Select reason</option>
                <option value="face_not_recognised">Face not recognised</option>
                <option value="portal_not_working">Portal not working</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={submitAttendanceRequest}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 w-full text-white py-3 rounded-lg font-bold shadow-lg transition-all transform hover:scale-105"
              >
                ✓ Submit Request
              </button>
            </div>
          </div>

        </div>
      </div>

      </div>
    </div>
  );
}
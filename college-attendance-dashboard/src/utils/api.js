// src/utils/api.js

const API_BASE_URL = 'http://127.0.0.1:5000/api';

// Generic API call function
export const apiCall = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Auth API calls
export const authAPI = {
  login: (credentials) => apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  signup: (userData) => apiCall('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  forgotPassword: (email) => apiCall('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  resetPassword: (token, newPassword) => apiCall('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password: newPassword }),
  }),
};

// Face Recognition API calls
export const faceAPI = {
  registerFace: (studentId, imageData) => apiCall('/register-face', {
    method: 'POST',
    body: JSON.stringify({ student_id: studentId, image_data: imageData }),
  }),
  recognizeFaces: (imageData, classId = null) => {
    const body = { image_data: imageData };
    if (classId) body.class_id = classId;
    return apiCall('/recognize-faces', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  getFaceRegistrationStatus: (studentId) => apiCall(`/face-registration-status/${studentId}`),
  getFaceStats: () => apiCall('/face-stats'),
  trainFaceModel: () => apiCall('/train-face-model', { method: 'POST' }),
  getFaceModelStatus: () => apiCall('/face-model-status'),
  forceReloadFaces: () => apiCall('/force-reload-faces', { method: 'POST' }),
};

// Student API calls
export const studentAPI = {
  getProfile: () => apiCall('/student/profile'),
  getAttendance: (studentId) => apiCall(`/attendance/student/${studentId}`),
  getEnrolledClasses: (studentId) => apiCall(`/student/enrolled-classes/${studentId}`),
  getAttendanceRequests: (studentId) => apiCall(`/attendance-requests/student/${studentId}`),
  createAttendanceRequest: (requestData) => apiCall('/attendance-requests', {
    method: 'POST',
    body: JSON.stringify(requestData),
  }),
};

// Teacher API calls
export const teacherAPI = {
  getProfile: () => apiCall('/teachers/profile'),
  getProfileByUser: (userId) => apiCall(`/teachers/profile-by-user/${userId}`),
  getDashboardStats: (teacherId) => apiCall(`/teacher-dashboard/stats?teacher_id=${teacherId}`),
  getMyCourses: (teacherId) => apiCall(`/teacher-dashboard/my-courses?teacher_id=${teacherId}`),
  getWeeklySchedule: (teacherId) => apiCall(`/teacher-dashboard/weekly-schedule?teacher_id=${teacherId}`),
  getPendingRequests: (teacherId) => apiCall(`/teacher-dashboard/pending-requests?teacher_id=${teacherId}`),
  getCourseStudents: (classId) => apiCall(`/teacher-dashboard/course-students/${classId}`),
  getCourseAttendance: (classId) => apiCall(`/teacher-dashboard/course-attendance/${classId}`),
  getAttendanceSummary: (classId) => apiCall(`/teacher-dashboard/attendance-summary/${classId}`),
  markAttendance: (attendanceData) => apiCall('/teacher-dashboard/mark-attendance', {
    method: 'POST',
    body: JSON.stringify(attendanceData),
  }),
  updateRequestStatus: (requestData) => apiCall('/teacher-dashboard/update-request-status', {
    method: 'POST',
    body: JSON.stringify(requestData),
  }),
  getAttendanceRequests: (teacherProfileId) => apiCall(`/attendance-requests/teacher/${teacherProfileId}`),
};

// Admin API calls
export const adminAPI = {
  getUsers: () => apiCall('/admin/users'),
  getStudents: () => apiCall('/admin/students'),
  getTeachers: () => apiCall('/admin/teachers'),
  getClasses: () => apiCall('/admin/classes'),
  getDepartments: () => apiCall('/departments'),
  getAttendanceStats: () => apiCall('/attendance/analytics'),
};

// Classes API calls
export const classesAPI = {
  getAll: () => apiCall('/classes'),
  create: (classData) => apiCall('/classes', {
    method: 'POST',
    body: JSON.stringify(classData),
  }),
};

// Attendance API calls
export const attendanceAPI = {
  mark: (attendanceData) => apiCall('/attendance', {
    method: 'POST',
    body: JSON.stringify(attendanceData),
  }),
  get: (params = '') => apiCall(`/attendance${params}`),
  getStudentCourseAttendance: () => apiCall('/students/course-attendance'),
};

// Schedule API calls
export const scheduleAPI = {
  create: (scheduleData) => apiCall('/schedules', {
    method: 'POST',
    body: JSON.stringify(scheduleData),
  }),
  createBulk: (schedulesData) => apiCall('/schedules/bulk', {
    method: 'POST',
    body: JSON.stringify(schedulesData),
  }),
};

// Debug API calls
export const debugAPI = {
  getFaceData: () => apiCall('/debug/face-data'),
  getFaceServiceStatus: () => apiCall('/debug/face-service-status'),
  getCurrentStudent: (userId) => apiCall(`/debug/current-student?user_id=${userId}`),
  getAttendanceRequests: () => apiCall('/debug/attendance-requests'),
  getNotifications: () => apiCall('/debug/notifications'),
  createSampleRequests: () => apiCall('/test/create-sample-requests', { method: 'POST' }),
  createSampleSchedules: () => apiCall('/test/create-sample-schedules', { method: 'POST' }),
  testFaceRecognition: () => apiCall('/test-face-recognition', { method: 'POST' }),
};

// Test API calls
export const testAPI = {
  getTeacherInfo: () => apiCall('/test/teacher-info'),
  debugAttendanceRequest: (data) => apiCall('/debug/attendance-request', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

export default {
  auth: authAPI,
  face: faceAPI,
  student: studentAPI,
  teacher: teacherAPI,
  admin: adminAPI,
  classes: classesAPI,
  attendance: attendanceAPI,
  schedule: scheduleAPI,
  debug: debugAPI,
  test: testAPI,
};
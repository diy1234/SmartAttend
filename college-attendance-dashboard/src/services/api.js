// =============================================
//  UNIFIED API LAYER (AXIOS VERSION)
//  Used for Admin, Teacher, Student dashboards
// =============================================
import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://127.0.0.1:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ============ AUTH TOKEN HANDLING ============
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;

    console.log(`🔄 API Call: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    console.log(`✅ API ${response.status}: ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error("❌ API Error:", error.response?.data || error.message);

    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

// =====================================================
//  AUTH
// =====================================================
export const login = (data) => api.post("/auth/login", data).then((r) => r.data);
export const signup = (data) => api.post("/auth/signup", data).then((r) => r.data);

export const getUserProfile = (userId) =>
  api.get(`/users/profile?user_id=${userId}`).then((r) => r.data);

// =====================================================
//  ATTENDANCE (Teacher + Student + Admin)
// =====================================================
export const getAttendances = (params) =>
  api.get("/attendance", { params }).then((r) => r.data.attendance || r.data);

export const markAttendanceSingle = (data) =>
  api.post("/attendance", data).then((r) => r.data);

// --- NEW: Get student attendance % for a subject ---
export const getStudentAttendancePercent = (studentId, subject) =>
  api
    .get("/attendance/student-percent", {
      params: { student_id: studentId, subject },
    })
    .then((r) => r.data);

// =====================================================
//  CLASSES
// =====================================================
export const getClasses = () =>
  api.get("/classes").then((r) => r.data.classes || r.data);

// =====================================================
//  ATTENDANCE REQUESTS
// =====================================================
export const getPendingRequests = (teacherId) =>
  api
    .get(`/attendance-requests/requests?teacher_id=${teacherId}`)
    .then((r) => r.data);

export const approveAttendanceRequest = (requestId, processor) =>
  api.post(`/attendance-requests/requests/${requestId}/approve`, processor || {})
    .then((r) => r.data);

export const rejectAttendanceRequest = (requestId, processor) =>
  api.post(`/attendance-requests/requests/${requestId}/reject`, processor || {})
    .then((r) => r.data);

// --- Admin processed history ---
export const getProcessedAttendanceRequests = (params) =>
  api.get(`/attendance-history/processed`, { params }).then((r) => r.data || []);

// =====================================================
//  SUBJECT STUDENTS (used in ManageDepartments → View)
// =====================================================

export const getSubjectStudents = (dept, subject) =>
  api
    .get("/admin/subject-students", {
      params: { dept, subject },
    })
    .then((r) => r.data.students || []);

// =====================================================
//  DEPARTMENTS
// =====================================================
export const getDepartments = () =>
  api.get("/departments/").then((r) => r.data);

export const createDepartment = (data) =>
  api.post("/departments/add", data).then((r) => r.data);

export const updateDepartment = (id, data) =>
  api.put(`/departments/${id}`, data).then((r) => r.data);

export const deleteDepartment = (deptName) =>
  api.post("/departments/remove", { name: deptName }).then((r) => r.data);

// =====================================================
//  SUBJECTS
// =====================================================
export const getSubjects = (departmentId = "") =>
  api
    .get(
      `/subjects/${departmentId ? `?department_id=${departmentId}` : ""}`
    )
    .then((r) => r.data);

export const createSubject = (deptName, subjectName) =>
  api
    .post(`/departments/${deptName}/subjects/add`, { subject: subjectName })
    .then((r) => r.data);

export const updateSubject = (id, data) =>
  api.put(`/subjects/${id}`, data).then((r) => r.data);

export const deleteSubject = (deptName, subjectName) =>
  api
    .post(`/departments/${deptName}/subjects/remove`, { subject: subjectName })
    .then((r) => r.data);

// =====================================================
//  TEACHER–SUBJECT TABLE
// =====================================================
export const assignTeacherToSubject = (teacher_id, subject_id, department_id) =>
  api
    .post("/teacher-subjects", { teacher_id, subject_id, department_id })
    .then((r) => r.data);

export const getTeacherSubjects = (teacher_id) =>
  api.get(`/teacher-subjects/teacher/${teacher_id}`).then((r) => r.data);

export const removeTeacherSubject = (assignment_id) =>
  api.delete(`/teacher-subjects/${assignment_id}`).then((r) => r.data);

// =====================================================
//  TEACHER LIST
// =====================================================
export const getTeacherProfiles = () =>
  api.get("/admin/teachers").then((r) => r.data);

// =====================================================
//  WEEKLY SCHEDULE
// =====================================================
export const listSchedules = (params) =>
  api.get("/schedules", { params }).then((r) => r.data);

export const createSchedule = (data) =>
  api.post("/schedules", data).then((r) => r.data);

export const updateSchedule = (id, data) =>
  api.put(`/schedules/${id}`, data).then((r) => r.data);

export const deleteSchedule = (id) =>
  api.delete(`/schedules/${id}`).then((r) => r.data);

export const getScheduleForClass = (classId) =>
  api.get(`/schedules/class/${classId}`).then((r) => r.data);

// =====================================================
//  DEFAULT EXPORT (old compatibility)
// =====================================================
export default {
  api,

  login,
  signup,
  getUserProfile,

  getAttendances,
  markAttendanceSingle,

  getClasses,

  getPendingRequests,
  approveAttendanceRequest,
  rejectAttendanceRequest,
  getProcessedAttendanceRequests,

  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,

  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,

  assignTeacherToSubject,
  getTeacherSubjects,
  removeTeacherSubject,
  getTeacherProfiles,

  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getScheduleForClass,

  // ➤ NEW ADDITIONS
  getStudentAttendancePercent,
  getSubjectStudents,
};

export { api };
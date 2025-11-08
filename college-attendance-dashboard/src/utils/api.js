const API_BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api';

async function fetchJSON(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const opts = { headers: { 'Content-Type': 'application/json' }, ...options };
  if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status} ${res.statusText}: ${text}`);
  }
  try {
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function getAttendances(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const path = `/attendance${qs ? `?${qs}` : ''}`;
  const json = await fetchJSON(path, { method: 'GET' });
  // backend returns { attendance: [...] }
  return json && json.attendance ? json.attendance : json;
}

export async function markAttendanceSingle({ student_id, class_id, status, marked_by }) {
  return await fetchJSON('/attendance', { method: 'POST', body: { student_id, class_id, status, marked_by } });
}

export async function getClasses() {
  const json = await fetchJSON('/classes', { method: 'GET' });
  return json && json.classes ? json.classes : json;
}

export async function getPendingAttendanceRequests(teacher_id) {
  const path = `/attendance-requests/requests?teacher_id=${encodeURIComponent(teacher_id)}`;
  return await fetchJSON(path, { method: 'GET' });
}

export async function approveAttendanceRequest(requestId) {
  return await fetchJSON(`/attendance-requests/requests/${requestId}/approve`, { method: 'POST' });
}

export async function rejectAttendanceRequest(requestId) {
  return await fetchJSON(`/attendance-requests/requests/${requestId}/reject`, { method: 'POST' });
}

const api = {
  getAttendances,
  markAttendanceSingle,
  getClasses,
  getPendingAttendanceRequests,
  approveAttendanceRequest,
  rejectAttendanceRequest,
};

export default api;

// Auth helpers
export async function login({ email, password, role }) {
  return await fetchJSON('/auth/login', { method: 'POST', body: { email, password, role } });
}

export async function signup({ name, email, password, role }) {
  return await fetchJSON('/auth/signup', { method: 'POST', body: { name, email, password, role } });
}

export async function getUserProfile(user_id) {
  const path = `/users/profile?user_id=${encodeURIComponent(user_id)}`;
  return await fetchJSON(path, { method: 'GET' });
}

export async function publishScheduleToTeacher(teacher_email, entries) {
  // Note: backend currently registers the class_schedules blueprint with url_prefix '/api/schedules'
  // and the route here is defined as '/schedules/publish', resulting in the full path
  // '/api/schedules/schedules/publish'. Match that until backend routes are normalized.
  return await fetchJSON('/schedules/schedules/publish', { method: 'POST', body: { teacher_email, entries } });
}

api.login = login;
api.signup = signup;
api.getUserProfile = getUserProfile;
api.publishScheduleToTeacher = publishScheduleToTeacher;

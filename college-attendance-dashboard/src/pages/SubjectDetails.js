// src/pages/SubjectDetails.js
import React, { useState, useEffect, useContext } from "react";
import { useParams, useLocation } from "react-router-dom";
import DataContext from "../context/DataContext";
import slugify from "../utils/slugify";
import * as XLSX from "xlsx";
import api from "../services/api";

/*
  Final merged SubjectDetails (Subject management + SubjectDetails UI).
  - Uses GET /api/departments to load departments + nested subjects
  - Uses POST /api/subjects to create subject (api.createSubject)
  - Uses DELETE /api/subjects/:id to delete subject (api.deleteSubject)
  - Uses GET /api/admin/teachers via axios instance (api.api.get('/admin/teachers'))
  - Uses POST /api/schedules/schedules to assign a teacher (api.api.post('/schedules/schedules', payload))
  - After deletions/creations/assigns it reloads departments from backend (you chose B)
  - UI layout preserved from your original file
*/

export default function SubjectDetails() {
  const { dept: deptParam, subject: subjectParam } = useParams();
  const location = useLocation();
  const {
    enrollments,
    removeEnrollment,
    attendances = [],
    updateAttendance,
    leaveRequests = [],
  } = useContext(DataContext);

  // Original states for students/attendance UI
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  // Subject-management states
  const [departments, setDepartments] = useState([]); // backend: departments with nested subjects
  const [newSubjectName, setNewSubjectName] = useState("");
  const [selectedDeptForNewSubject, setSelectedDeptForNewSubject] = useState("");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningSubject, setAssigningSubject] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [assignForm, setAssignForm] = useState({
    teacher_id: "",
    day_of_week: "Monday",
    start_time: "09:00",
    end_time: "10:00",
    room_number: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  // ---------------------------
  // Initial loads
  // ---------------------------
  useEffect(() => {
    // load departments and teachers in background (non-blocking for student UI)
    reloadDepartments();
    reloadTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reloadDepartments = async () => {
    try {
      const deps = await api.getDepartments(); // expected nested subjects array
      // Normalize subjects entries to { id, name } shape if backend returns strings
      const normalized = (Array.isArray(deps) ? deps : []).map((d) => ({
        ...d,
        subjects: (d.subjects || []).map((s) =>
          typeof s === "string" ? { id: null, name: s } : { id: s.id ?? null, name: s.name ?? s }
        ),
      }));
      setDepartments(normalized);
    } catch (err) {
      console.error("Failed to load departments:", err);
      setDepartments([]);
    }
  };

  const reloadTeachers = async () => {
    try {
      const resp = await api.api.get("/admin/teachers"); // confirmed endpoint
      const list = Array.isArray(resp.data) ? resp.data : [];
      setTeachers(list);
    } catch (err) {
      console.error("Failed to load teachers:", err);
      setTeachers([]);
    }
  };

  // ---------------------------
  // Students loading (original logic)
  // ---------------------------
  useEffect(() => {
    if (location.state?.students) {
      setStudents(location.state.students);
      setLoading(false);
    } else {
      fetchStudentsFromBackend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, deptParam, subjectParam, enrollments]);

  const fetchStudentsFromBackend = async () => {
    try {
      setLoading(true);
      // Use enrollments context to infer students for this dept/subject
      const matched = (enrollments || []).filter((e) => {
        try {
          return slugify(e.dept) === deptParam && slugify(e.subject) === subjectParam;
        } catch (err) {
          return false;
        }
      });

      const mapped = matched.map((m, idx) => ({
        id: m.student_id || m.id || idx,
        name: m.student_name || m.name || m.student || (m.user && m.user.name) || "Unknown",
        email: m.email || (m.user && m.user.email) || "",
        enrollment_no: m.enrollment_no || m.enroll || `S${idx + 1}`,
        course: m.course || m.subject || subjectParam?.replace(/-/g, " "),
        department: m.dept || m.department || deptParam?.replace(/-/g, " "),
        attendance: m.attendance || {},
      }));

      setStudents(mapped);
    } catch (error) {
      console.error("Error fetching students:", error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // Exports & helpers (original)
  // ---------------------------
  const exportClass = () => {
    if (students.length === 0) {
      alert("No students available to export for this subject.");
      return;
    }
    const data = students.map((student, index) => ({
      "S.No": index + 1,
      "Student Name": student.name || "N/A",
      Email: student.email || "N/A",
      "Enrollment No": student.enrollment_no || "N/A",
      Course: student.course || "N/A",
      Department: student.department || "N/A",
      "Attendance Percentage": student.attendance?.percentage ? `${student.attendance.percentage}%` : "N/A",
      "Classes Attended": student.attendance?.present_count || 0,
      "Total Classes": student.attendance?.total_classes || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    const fileName = `${deptParam || "dept"}_${subjectParam || "subject"}_students_${new Date().toISOString().slice(0, 10)}`;
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const buildSections = () => {
    const sections = {};
    students.forEach((student) => {
      const section = student.department || "General";
      if (!sections[section]) sections[section] = [];
      sections[section].push({
        roll: student.enrollment_no || `S${sections[section].length + 1}`,
        name: student.name || student.student || "Unknown Student",
        attendance: student.attendance?.percentage ? `${student.attendance.percentage}%` : "No Data",
        approvedBy: "Teacher",
      });
    });
    return sections;
  };

  const exportRecord = (rec) => {
    const data = (rec.students || []).map((s, index) => ({
      "S.No": index + 1,
      Student: s.student || s.email || s.name || "Unknown",
      Status: s.status || "Present",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Attendance_${rec.id}`);
    const fileName = `${rec.dept || deptParam}_${rec.subject || subjectParam}_${new Date(rec.date || Date.now()).toISOString().slice(0, 10)}`;
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  // ---------------------------
  // Attendance aggregation (original)
  // ---------------------------
  useEffect(() => {
    const raw = (attendances || []).filter((a) => {
      try {
        return slugify(a.dept || a.department || "") === deptParam && slugify(a.subject || a.course || "") === subjectParam;
      } catch (err) {
        return false;
      }
    });

    const groups = new Map();
    raw.forEach((a) => {
      const dateKey = a.date ? new Date(a.date).toISOString() : "";
      const submittedBy = a.submittedBy || a.teacher || a.faculty || "";
      const key = `${dateKey}||${submittedBy}`;

      if (Array.isArray(a.students) && a.students.length > 0) {
        groups.set(`${key}||agg||${a.id || Math.random()}`, {
          id: a.id || Date.now() + Math.random(),
          date: a.date,
          dept: a.dept || a.department || deptParam,
          subject: a.subject || a.course || subjectParam,
          submittedBy,
          facultyApproved: a.facultyApproved,
          students: a.students.slice(),
        });
      } else {
        const existing = groups.get(key) || {
          id: Date.now() + Math.random(),
          date: a.date,
          dept: a.dept || a.department || deptParam,
          subject: a.subject || a.course || subjectParam,
          submittedBy,
          facultyApproved: a.facultyApproved,
          students: [],
        };
        const stud = a.student
          ? { student: a.student, name: a.name || a.student, status: a.status || (a.present ? "Present" : "Absent") }
          : a.name
          ? { student: a.name, name: a.name, status: a.status || (a.present ? "Present" : "Absent") }
          : null;
        if (stud) existing.students.push(stud);
        groups.set(key, existing);
      }
    });

    const result = Array.from(groups.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
    setRecords(result);
  }, [attendances, deptParam, subjectParam]);

  // ---------------------------
  // Subject management actions (backend)
  // ---------------------------

  // Create subject under selected department
  const handleCreateSubject = async (e) => {
    e?.preventDefault?.();
    if (!newSubjectName.trim()) return alert("Enter subject name");
    setActionLoading(true);
    try {
      // selectedDeptForNewSubject is department id (preferred) or empty
      await api.createSubject({
        name: newSubjectName.trim(),
        department_id: selectedDeptForNewSubject || null,
      });
      setNewSubjectName("");
      setSelectedDeptForNewSubject("");
      await reloadDepartments(); // reload from backend per choice B
      alert("Subject created");
    } catch (err) {
      console.error("Create subject failed", err);
      alert(err.message || "Failed to create subject");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete subject (reload departments after delete)
  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm("Delete subject? This will remove it from the department.")) return;
    setActionLoading(true);
    try {
      await api.deleteSubject(subjectId);
      await reloadDepartments(); // reload backend
      alert("Subject deleted");
    } catch (err) {
      console.error("Delete subject failed", err);
      alert(err.message || "Failed to delete subject");
    } finally {
      setActionLoading(false);
    }
  };

  // Open assign modal
  const openAssignModal = (subject, department) => {
    setAssigningSubject({ ...subject, department });
    setAssignForm({
      teacher_id: "",
      day_of_week: "Monday",
      start_time: "09:00",
      end_time: "10:00",
      room_number: "",
    });
    setAssignModalOpen(true);
  };

  // Submit assign (creates schedule entry which associates teacher+subject)
  const submitAssign = async () => {
    if (!assigningSubject) return;
    if (!assignForm.teacher_id) return alert("Select teacher");
    // validate times
    if (!assignForm.start_time || !assignForm.end_time || assignForm.start_time >= assignForm.end_time) {
      return alert("Invalid time range");
    }

    setActionLoading(true);
    try {
      // Ensure department id
      const departmentId =
        assigningSubject.department?.id ??
        assigningSubject.department_id ??
        (departments.find((d) => d.name === assigningSubject.department || d.id === assigningSubject.department_id) || {}).id ??
        null;

      await api.api.post("/schedules/schedules", {
        teacher_id: assignForm.teacher_id,
        department_id: departmentId,
        subject_id: assigningSubject.id,
        day_of_week: assignForm.day_of_week,
        start_time: assignForm.start_time,
        end_time: assignForm.end_time,
        room_number: assignForm.room_number || null,
        created_by: JSON.parse(localStorage.getItem("user"))?.id || null,
      });

      // reload departments to reflect server-side state & any schedule-derived changes
      await reloadDepartments();
      setAssignModalOpen(false);
      alert("Teacher assigned (schedule created)");
    } catch (err) {
      console.error("Assign failed", err);
      alert(err.message || "Failed to assign teacher");
    } finally {
      setActionLoading(false);
    }
  };

  // ---------------------------
  // Editor save (attendance)
  // ---------------------------
  const openEditor = (rec) => {
    setEditing(JSON.parse(JSON.stringify(rec)));
  };

  const saveEdit = () => {
    if (!editing) return;
    updateAttendance(editing.id, editing);
    setEditing(null);
    alert("Attendance updated successfully!");
  };

  // ---------------------------
  // Render
  // ---------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#132E6B]">
          Students for {subjectParam?.replace(/-/g, " ")} ({deptParam?.replace(/-/g, " ")})
        </h2>
        {location.state?.courseInfo && (
          <div className="text-sm text-gray-600">
            Schedule: {location.state.courseInfo.schedule} • Room: {location.state.courseInfo.room}
          </div>
        )}
      </div>

      {/* Manage Subjects panel removed per request */}

      {/* ORIGINAL STUDENT LIST UI */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Student List ({students.length} students)</h3>
          <div>
            <button onClick={exportClass} className="px-3 py-1 bg-green-600 text-white rounded text-sm">
              Export Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left">Student Name</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Enrollment No</th>
                <th className="p-3 text-left">Course</th>
                <th className="p-3 text-center">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-3">{student.name}</td>
                  <td className="p-3">{student.email}</td>
                  <td className="p-3">{student.enrollment_no}</td>
                  <td className="p-3">{student.course} - {student.department}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      student.attendance?.percentage >= 75 ? 'bg-green-100 text-green-800' :
                      student.attendance?.percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {student.attendance?.percentage ?? 0}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {students.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No students found for this course.</p>
          </div>
        )}
      </div>

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Edit Attendance — {editing.course || `${editing.dept || ""} ${editing.subject || ""}`}</h3>
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="px-3 py-1 bg-gray-300 rounded">Close</button>
                <button onClick={saveEdit} className="px-3 py-1 bg-green-600 text-white rounded">Save</button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Notes</label>
                <textarea value={editing.notes || ""} onChange={(e) => setEditing((s) => ({ ...s, notes: e.target.value }))} className="w-full border p-2 rounded" rows={3} />
              </div>

              <div>
                <h4 className="font-medium mb-2">Students</h4>
                <div className="max-h-64 overflow-y-auto border rounded p-2">
                  {editing.students?.map((st, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4 p-2 rounded hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="font-medium">{st.name || st.student || `Student ${st.id || idx + 1}`}</div>
                        <div className="text-sm text-gray-500">{st.id ? `ID: ${st.id}` : ""}</div>
                      </div>
                      <div>
                        <select value={st.status || "Present"} onChange={(e) => { const next = { ...editing }; next.students[idx] = { ...next.students[idx], status: e.target.value }; setEditing(next); }} className="border p-1 rounded">
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Late">Late</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Teacher Modal */}
      {assignModalOpen && assigningSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Assign Teacher — {assigningSubject.name}</h3>
              <button onClick={() => setAssignModalOpen(false)} className="px-3 py-1 bg-gray-300 rounded">Close</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Teacher</label>
                <select value={assignForm.teacher_id} onChange={(e) => setAssignForm((f) => ({ ...f, teacher_id: e.target.value }))} className="border p-2 rounded w-full">
                  <option value="">Select teacher</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name || t.name || t.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm mb-1">Day</label>
                  <select value={assignForm.day_of_week} onChange={(e) => setAssignForm((f) => ({ ...f, day_of_week: e.target.value }))} className="border p-2 rounded w-full">
                    <option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option><option>Sunday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-1">Start</label>
                  <input type="time" value={assignForm.start_time} onChange={(e) => setAssignForm((f) => ({ ...f, start_time: e.target.value }))} className="border p-2 rounded w-full" />
                </div>

                <div>
                  <label className="block text-sm mb-1">End</label>
                  <input type="time" value={assignForm.end_time} onChange={(e) => setAssignForm((f) => ({ ...f, end_time: e.target.value }))} className="border p-2 rounded w-full" />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Room (optional)</label>
                <input value={assignForm.room_number} onChange={(e) => setAssignForm((f) => ({ ...f, room_number: e.target.value }))} className="border p-2 rounded w-full" placeholder="e.g. 101" />
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setAssignModalOpen(false)} className="px-3 py-2 bg-gray-200 rounded">Cancel</button>
                <button onClick={submitAssign} disabled={actionLoading} className="px-3 py-2 bg-indigo-700 text-white rounded">
                  {actionLoading ? "Assigning..." : "Assign Teacher"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

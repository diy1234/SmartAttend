// src/pages/ManageDepartments.js
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import slugify from "../utils/slugify";
import api from "../services/api";

/*
  Backend-connected ManageDepartments WITH ROOM NUMBER SUPPORT.
*/

export default function ManageDepartments() {
  // backend-backed state
  const [departments, setDepartments] = useState([]);
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // local input states
  const [newDept, setNewDept] = useState("");
  const [newSubject, setNewSubject] = useState({ dept: "", subject: "" });
  const [newAssignment, setNewAssignment] = useState({
    teacher: "",
    dept: "",
    subject: ""
  });

  const [newScheduleDay, setNewScheduleDay] = useState("");
  const [newScheduleStart, setNewScheduleStart] = useState("");
  const [newScheduleEnd, setNewScheduleEnd] = useState("");
  const [newRoomNumber, setNewRoomNumber] = useState(""); // ✅ ADDED

  const [actionLoading, setActionLoading] = useState(false);

  // Time slots
  const TIME_SLOTS = [
    { start: "08:30", end: "09:10" },
    { start: "09:15", end: "09:55" },
    { start: "10:00", end: "10:40" },
    { start: "11:00", end: "11:40" },
    { start: "11:45", end: "12:25" }
  ];

  // helper: convert "12:00 PM" or "12:00 AM" style to "HH:MM" 24-hour
function convertTo24Hour(time) {
  if (!time) return time;
  // if already in 24-hour format (HH:MM without AM/PM), return as-is
  if (!/AM|PM/i.test(time)) {
    return time.trim();
  }

  const parts = time.trim().split(' ');
  // time like "12:00" and modifier "PM"
  if (parts.length === 2) {
    const [timePart, modifier] = parts;
    let [hours, minutes] = timePart.split(':');
    hours = parseInt(hours, 10);
    const mod = modifier.toUpperCase();
    if (mod === 'PM' && hours !== 12) hours = hours + 12;
    if (mod === 'AM' && hours === 12) hours = 0;
    // pad
    const hh = String(hours).padStart(2, '0');
    const mm = (minutes || '00').padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return time.trim();
}


  // =============================
  // Load departments, schedules, teachers
  // =============================
  useEffect(() => {
    reloadAll();
  }, []);

  async function reloadAll() {
    await Promise.all([
      reloadDepartments(),
      reloadSchedules(),
      reloadTeachers()
    ]);
  }

  async function reloadDepartments() {
    try {
      const deps = await api.getDepartments();
      const normalized = (Array.isArray(deps) ? deps : []).map((d) => ({
        ...d,
        subjects: (d.subjects || []).map((s) =>
          typeof s === "string"
            ? { id: null, name: s }
            : { id: s.id ?? null, name: s.name ?? s }
        )
      }));
      setDepartments(normalized);
    } catch (err) {
      console.error("Load departments failed", err);
      setDepartments([]);
    }
  }

  async function reloadSchedules() {
    try {
      const resp = await api.api.get("/schedules/schedules");
      setWeeklySchedule(Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      console.error("Load schedules failed", err);
      setWeeklySchedule([]);
    }
  }

  async function reloadTeachers() {
    try {
      const resp = await api.api.get("/admin/teachers");
      setTeachers(Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      console.error("Load teachers failed", err);
      setTeachers([]);
    }
  }

  // =========================
  // Departments
  // =========================
  const handleAddDepartment = async () => {
    if (!newDept.trim()) return;
    setActionLoading(true);
    try {
      await api.createDepartment({ name: newDept.trim() });
      setNewDept("");
      await reloadDepartments();
      alert("Department added");
    } catch (err) {
      alert(err.message || "Failed to add department");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveDepartmentClick = async (dept) => {
    if (!dept?.name)
      return alert("Department name is required to delete.");
    if (!window.confirm(`Delete ${dept.name}?`)) return;

    try {
      await api.deleteDepartment(dept.name);
      await reloadDepartments();
      alert("Department deleted");
    } catch (err) {
      alert(err.message || "Failed to delete department");
    }
  };

  // =========================
  // Subjects
  // =========================
  const handleAddSubject = async (dept, subjectName) => {
    if (!subjectName || !dept) return;

    if (!dept.name) return alert("Department name is required.");

    try {
      await api.createSubject(dept.name, subjectName.trim());
      setNewSubject({ dept: "", subject: "" });
      await reloadDepartments();
      alert("Subject added");
    } catch (err) {
      alert(err.message || "Failed to create subject");
    }
  };

  const handleRemoveSubjectClick = async (dept, subj) => {
    if (!subj?.name) return alert("Subject name is required");
    if (!dept?.name) return alert("Department name is required");
    if (!window.confirm(`Delete subject ${subj.name}?`)) return;

    try {
      await api.deleteSubject(dept.name, subj.name);
      await reloadDepartments();
      alert("Subject deleted");
    } catch (err) {
      alert(err.message || "Failed to delete subject");
    }
  };

  // =========================
  // Add SCHEDULE (Teacher assignment)
  // =========================
  const handleAddSchedule = async () => {
    if (
      !newAssignment.teacher ||
      !newAssignment.dept ||
      !newAssignment.subject ||
      !newScheduleDay
    )
      return alert("Fill all fields");

    try {
      // teacher
      let teacherObj = teachers.find(
        (t) =>
          t.email === newAssignment.teacher ||
          t.user_email === newAssignment.teacher ||
          t.id === newAssignment.teacher
      );
      if (!teacherObj) return alert("Teacher not found");

      // dept
      const deptObj = departments.find(
        (d) => d.name === newAssignment.dept || d.id === newAssignment.dept
      );
      const departmentId = deptObj?.id;
      if (!departmentId) return alert("Department not found");

      // subject
      const subjObj = deptObj.subjects.find(
        (s) =>
          s.name === newAssignment.subject ||
          s.id === newAssignment.subject
      );
      const subjectId = subjObj?.id;
      if (!subjectId) return alert("Subject not in department");

      // time selection:
      let timeStr = "";
      if (newScheduleStart && newScheduleEnd) {
        if (newScheduleStart >= newScheduleEnd)
          return alert("Start must be before end");
        timeStr = `${newScheduleStart} - ${newScheduleEnd}`;
      } else {
        // auto slot
        const used = new Set(
          weeklySchedule
            .filter((s) => s.teacher_id === teacherObj.id && s.day === newScheduleDay)
            .map((s) => s.time)
        );
        const slot = TIME_SLOTS.find(
          (ts) => !used.has(`${ts.start} - ${ts.end}`)
        );
        if (!slot) return alert("No available slot");
        timeStr = `${slot.start} - ${slot.end}`;
      }

      let [startPart, endPart] = timeStr.split("-").map((x) => x.trim());
      startPart = convertTo24Hour(startPart);
      endPart = convertTo24Hour(endPart);

      // PAYLOAD INCLUDING ROOM NUMBER
      const payload = {
        teacher_id: teacherObj.user_id || teacherObj.id,
        department_id: departmentId,
        subject_id: subjectId,
        day_of_week: newScheduleDay,
        start_time: startPart,
        end_time: endPart,
        room_number: newRoomNumber.trim() || null, // ✅ ROOM NUMBER INCLUDED
        created_by: 1 
      };

      await api.createSchedule(payload);

      // reset
      setNewAssignment({ teacher: "", dept: "", subject: "" });
      setNewScheduleDay("");
      setNewScheduleStart("");
      setNewScheduleEnd("");
      setNewRoomNumber(""); // clear room input

      reloadSchedules();
      reloadDepartments();
      alert("Schedule added");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to add schedule");
    }
  };

  // =========================
  // Delete schedule
  // =========================
  const removeWeeklyEntry = async (id) => {
    if (!window.confirm("Delete schedule?")) return;
    try {
      await api.deleteSchedule(id);
      await reloadSchedules();
      alert("Schedule deleted");
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  };

  const handleSimpleAssign = async () => {
  if (!newAssignment.teacher || !newAssignment.dept || !newAssignment.subject) {
    return alert("Please fill all fields");
  }

  setActionLoading(true);

  try {
    // find teacher object
    let teacherObj = teachers.find(
      (t) =>
        t.email === newAssignment.teacher ||
        t.user_email === newAssignment.teacher ||
        t.full_name === newAssignment.teacher ||
        t.id === newAssignment.teacher
    );

    if (!teacherObj) {
      // try backend again
      const resp = await api.api.get("/admin/teachers");
      const list = Array.isArray(resp.data) ? resp.data : [];
      teacherObj = list.find((t) => t.email === newAssignment.teacher || t.id === newAssignment.teacher);
    }

    if (!teacherObj) {
      setActionLoading(false);
      return alert("Teacher not found.");
    }

    // find department id
    const deptObj = departments.find(
      (d) => d.name === newAssignment.dept || d.id === newAssignment.dept
    );
    if (!deptObj) {
      setActionLoading(false);
      return alert("Department not found.");
    }

    // find subject id
    const subjObj = deptObj.subjects.find(
      (s) => s.name === newAssignment.subject || s.id === newAssignment.subject
    );
    if (!subjObj) {
      setActionLoading(false);
      return alert("Subject not found.");
    }

    // ✨ NEW API CALL — insert into teacher_subjects table
        await api.assignTeacherToSubject(
          teacherObj.id,
          subjObj.id,
          deptObj.id
        );

    alert("Teacher assigned to subject successfully!");
    setNewAssignment({ teacher: "", dept: "", subject: "" });
  } catch (err) {
    console.error("Simple assign failed", err);
    alert(err.message || "Failed to assign");
  } finally {
    setActionLoading(false);
  }
};


  // =========================
  // Render
  // =========================
  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-[#132E6B] mb-6">
        Manage Departments & Subjects
      </h2>

      {/* Weekly Schedule UI */}
      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <h3 className="text-xl font-semibold mb-4">
          Weekly Schedule Management (with Room Number)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3 mb-3 items-center">

          {/* Teacher */}
          <input
            placeholder="Teacher email"
            value={newAssignment.teacher}
            onChange={(e) =>
              setNewAssignment({ ...newAssignment, teacher: e.target.value })
            }
            className="border p-2 rounded w-full md:col-span-2"
          />

          {/* Dept */}
          <select
            value={newAssignment.dept}
            onChange={(e) =>
              setNewAssignment({ ...newAssignment, dept: e.target.value })
            }
            className="border p-2 rounded w-full"
          >
            <option value="">Select dept</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Subject */}
          <select
            value={newAssignment.subject}
            onChange={(e) =>
              setNewAssignment({ ...newAssignment, subject: e.target.value })
            }
            className="border p-2 rounded w-full"
          >
            <option value="">Select subject</option>
            {(departments.find((d) => d.name === newAssignment.dept)?.subjects ||
              []
            ).map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Day */}
          <select
            value={newScheduleDay}
            onChange={(e) => setNewScheduleDay(e.target.value)}
            className="border p-2 rounded w-full"
          >
            <option value="">Day</option>
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(
              (d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              )
            )}
          </select>

          {/* Time + Room */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Start</label>
            <input
              type="time"
              value={newScheduleStart}
              onChange={(e) => setNewScheduleStart(e.target.value)}
              className="border p-1 rounded w-28"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-600">End</label>
            <input
              type="time"
              value={newScheduleEnd}
              onChange={(e) => setNewScheduleEnd(e.target.value)}
              className="border p-1 rounded w-28"
            />
          </div>
        </div>

        {/* ROOM INPUT */}
        <div className="mt-3 mb-3">
          <label className="text-xs text-gray-600">Room Number (optional)</label>
          <input
            type="text"
            placeholder="e.g., 101"
            value={newRoomNumber}
            onChange={(e) => setNewRoomNumber(e.target.value)}
            className="border p-2 rounded w-48"
          />
        </div>

        <button
          onClick={handleAddSchedule}
          className="px-3 py-1 bg-green-600 text-white rounded"
        >
          Add Schedule
        </button>

        {/* SCHEDULE LIST */}
        <div className="mt-6">
          <h4 className="font-medium mb-2">Current Weekly Schedule</h4>
          {weeklySchedule.length === 0 ? (
            <p>No schedule entries.</p>
          ) : (
            <div className="overflow-x-auto bg-white rounded-md border">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Day</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Time</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Teacher</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Department</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Subject</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Room</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y">
                  {weeklySchedule.map((s, idx) => (
                    <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm text-gray-800">{s.day_of_week}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.start_time} - {s.end_time}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{s.teacher_email || s.teacher_id}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.department_name || s.dept}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.subject_name || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        {s.room_number ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-xs">Room {s.room_number}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <button
                          onClick={() => removeWeeklyEntry(s.id)}
                          className="inline-flex items-center px-3 py-1 border border-red-200 text-red-700 rounded-md hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Departments + Subjects UI */}
      <div className="space-y-10">
        {departments.map((dept) => (
          <div key={dept.id}>
            <h3 className="text-2xl font-semibold">{dept.name} Department</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-2">
              {dept.subjects.map((subj) => (
                <div
                  key={subj.id}
                  className="bg-white rounded-xl shadow-md p-5 border"
                >
                  <h4 className="text-lg font-semibold">{subj.name}</h4>

                  <div className="flex gap-2 mt-2">
                    <Link
                      to={`/departments/${slugify(dept.name)}/${slugify(
                        subj.name
                      )}`}
                      className="text-blue-700 underline"
                    >
                      View
                    </Link>

                    <button
                      onClick={() => handleRemoveSubjectClick(dept, subj)}
                      className="text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add subject */}
            <div className="mt-4 flex gap-2">
              <input
                value={newSubject.subject}
                onChange={(e) =>
                  setNewSubject({ ...newSubject, subject: e.target.value })
                }
                placeholder="New subject"
                className="border p-2 rounded"
              />
              <button
                onClick={() =>
                  newSubject.subject &&
                  handleAddSubject(dept, newSubject.subject)
                }
                className="px-3 py-1 bg-green-600 text-white rounded"
              >
                Add Subject
              </button>
            </div>

            <button
              onClick={() => handleRemoveDepartmentClick(dept)}
              className="mt-3 px-3 py-1 bg-red-600 text-white rounded"
            >
              Remove Department
            </button>
          </div>
        ))}

        {/* Add Department */}
        <div className="bg-white p-4 rounded shadow-md">
          <h4 className="font-semibold mb-2">Add Department</h4>
          <div className="flex gap-2">
            <input
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              placeholder="Department name"
              className="border p-2 rounded"
            />
            <button
              onClick={handleAddDepartment}
              className="px-3 py-1 bg-blue-800 text-white rounded"
            >
              Add
            </button>
          </div>

          {/* Assign Teacher to Subject (Simple — adds row to teacher_subjects table only) */}
<div className="bg-white p-4 rounded shadow-md mt-6">
  <h4 className="font-semibold mb-2">Assign Teacher to Subject</h4>

  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
    <div>
      <label className="text-xs text-gray-600">Teacher email / id</label>
      <input
        placeholder="Teacher email or id"
        value={newAssignment.teacher}
        onChange={(e) => setNewAssignment((s) => ({ ...s, teacher: e.target.value }))}
        className="border p-2 rounded w-full"
      />
    </div>

    <div>
      <label className="text-xs text-gray-600">Department</label>
      <select
        value={newAssignment.dept}
        onChange={(e) => setNewAssignment((s) => ({ ...s, dept: e.target.value }))}
        className="border p-2 rounded w-full"
      >
        <option value="">Select dept</option>
        {departments.map((d) => (
          <option key={d.id || d.name} value={d.name}>{d.name}</option>
        ))}
      </select>
    </div>

    <div>
      <label className="text-xs text-gray-600">Subject</label>
      <select
        value={newAssignment.subject}
        onChange={(e) => setNewAssignment((s) => ({ ...s, subject: e.target.value }))}
        className="border p-2 rounded w-full"
      >
        <option value="">Select subject</option>
        {(departments.find((d) => d.name === newAssignment.dept)?.subjects || []).map((s) => (
          <option key={s.id || s.name} value={s.name}>{s.name}</option>
        ))}
      </select>
    </div>

    <div>
      <button
        onClick={handleSimpleAssign}
        className="px-3 py-1 bg-green-600 text-white rounded"
      >
        Assign
      </button>
    </div>
  </div>

</div>


        </div>
      </div>
    </div>
  );
}

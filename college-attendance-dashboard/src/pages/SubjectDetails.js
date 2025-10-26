import React, { useState, useEffect, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import DataContext from "../context/DataContext";
import slugify from "../utils/slugify";
import * as XLSX from "xlsx";

export default function SubjectDetails() {
  const { dept: deptParam, subject: subjectParam } = useParams();
  const { enrollments, removeEnrollment, attendances = [], updateAttendance } = useContext(DataContext);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    // find enrollments that match the route params (compare slugified names)
    const matched = (enrollments || []).filter((e) => {
      try {
        return slugify(e.dept) === deptParam && slugify(e.subject) === subjectParam;
      } catch (err) {
        return false;
      }
    });

    // map to a simple student list (email or identifier)
    const mapped = matched.map((m, idx) => ({ id: idx, student: m.student, dept: m.dept, subject: m.subject }));
    setStudents(mapped);
  }, [enrollments, deptParam, subjectParam]);

  useEffect(() => {
    // Aggregate attendances for this dept/subject. Support two storage shapes:
    // 1) Aggregated records where a.students is an array (teacher submitted batch)
    // 2) Per-student records where each attendance entry is one student (student check-ins)
    const raw = (attendances || []).filter(a => {
      try {
        return slugify(a.dept || a.department || '') === deptParam && slugify(a.subject || a.course || '') === subjectParam;
      } catch (err) {
        return false;
      }
    });

    // Group per date+submittedBy: key = date|submittedBy
    const groups = new Map();
    raw.forEach((a) => {
      const dateKey = a.date ? new Date(a.date).toISOString() : "";
      const submittedBy = a.submittedBy || a.teacher || a.faculty || '';
      const key = `${dateKey}||${submittedBy}`;

      if (Array.isArray(a.students) && a.students.length > 0) {
        // aggregated record: treat as its own group
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
        // per-student entry: push into group
        const existing = groups.get(key) || { id: Date.now() + Math.random(), date: a.date, dept: a.dept || a.department || deptParam, subject: a.subject || a.course || subjectParam, submittedBy, facultyApproved: a.facultyApproved, students: [] };
        // map student info
        const stud = a.student ? { student: a.student, name: a.name || a.student, status: a.status || (a.present ? 'Present' : 'Absent') } : (a.name ? { student: a.name, name: a.name, status: a.status || (a.present ? 'Present' : 'Absent') } : null);
        if (stud) existing.students.push(stud);
        groups.set(key, existing);
      }
    });

    const result = Array.from(groups.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
    setRecords(result);
  }, [attendances, deptParam, subjectParam]);

  const exportRecord = (rec) => {
    const data = (rec.students || []).map(s => ({ Student: s.student || s.email || s.name || '', Status: s.status || s.present || s.attendance || 'Present' }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Attendance_${rec.id}`);
    XLSX.writeFile(wb, `${(rec.dept||deptParam)}_${(rec.subject||subjectParam)}_${new Date(rec.date).toISOString().slice(0,10)}.xlsx`);
  };

  const openEditor = (rec) => {
    // clone record for editing
    setEditing(JSON.parse(JSON.stringify(rec)));
  };

  const saveEdit = () => {
    if(!editing) return;
    updateAttendance(editing.id, editing);
    setEditing(null);
    alert('Attendance updated');
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#132E6B]">Attendance for {subjectParam.replace(/-/g, ' ')} ({deptParam.replace(/-/g, ' ')})</h2>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <h3 className="font-medium mb-2">Submitted Attendance Records</h3>
        {records.length === 0 ? (
          <p className="text-gray-600">No attendance records submitted by faculty for this subject.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border text-left">Date</th>
                <th className="p-2 border text-left">Submitted By</th>
                <th className="p-2 border text-center">Students</th>
                <th className="p-2 border text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="p-2 border">{new Date(r.date).toLocaleString()}</td>
                  <td className="p-2 border">{(r.submittedBy || r.teacher || r.faculty) ? (
                    <Link to={`/teachers?email=${encodeURIComponent(r.submittedBy || r.teacher || r.faculty)}`} className="text-blue-700 underline">
                      {r.submittedBy || r.teacher || r.faculty}
                    </Link>
                  ) : '—'}</td>
                  <td className="p-2 border text-center">{(r.students || []).length}</td>
                  <td className="p-2 border text-right space-x-2">
                    <button onClick={()=>openEditor(r)} className="px-2 py-1 bg-blue-800 text-white rounded">View / Edit</button>
                    <button onClick={()=>exportRecord(r)} className="px-2 py-1 bg-green-600 text-white rounded">Export</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-medium mb-2">Enrolled Students</h3>
        {students.length === 0 ? (
          <p className="text-gray-600">No students are currently enrolled in this subject.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border text-left">#</th>
                <th className="p-2 border text-left">Student</th>
                <th className="p-2 border text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="p-2 border">{idx + 1}</td>
                  <td className="p-2 border">{s.student}</td>
                  <td className="p-2 border text-right">
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove enrollment for ${s.student}?`)) {
                          removeEnrollment(s.student, s.dept, s.subject);
                        }
                      }}
                      className="text-red-600"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Edit Attendance — {editing.course || `${editing.dept || ''} ${editing.subject || ''}`}</h3>
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="px-3 py-1 bg-gray-300 rounded">Close</button>
                <button onClick={saveEdit} className="px-3 py-1 bg-green-600 text-white rounded">Save</button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Notes</label>
                <textarea value={editing.notes || ''} onChange={e=>setEditing(s=>({...s, notes: e.target.value}))} className="w-full border p-2 rounded" rows={3} />
              </div>

              <div>
                <h4 className="font-medium mb-2">Students</h4>
                <div className="max-h-64 overflow-y-auto border rounded p-2">
                  {editing.students?.map((st, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4 p-2 rounded hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="font-medium">{st.name || st.student || `Student ${st.id || idx+1}`}</div>
                        <div className="text-sm text-gray-500">{st.id ? `ID: ${st.id}` : ''}</div>
                      </div>
                      <div>
                        <select value={st.status || 'Present'} onChange={e=>{
                          const next = { ...editing };
                          next.students[idx] = { ...next.students[idx], status: e.target.value };
                          setEditing(next);
                        }} className="border p-1 rounded">
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
    </div>
  );
}

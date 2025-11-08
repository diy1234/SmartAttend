import React, { useState, useEffect, useContext } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import DataContext from "../context/DataContext";
import slugify from "../utils/slugify";
import * as XLSX from "xlsx";

export default function SubjectDetails() {
  const { dept: deptParam, subject: subjectParam } = useParams();
  const location = useLocation();
  const { enrollments, removeEnrollment, attendances = [], updateAttendance, leaveRequests = [] } = useContext(DataContext);
  
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  // Use students from navigation state or fetch from backend
  useEffect(() => {
    if (location.state?.students) {
      // Use students passed from TeacherDashboard
      setStudents(location.state.students);
      setLoading(false);
    } else {
      // Fallback: fetch students from backend using department and subject
      fetchStudentsFromBackend();
    }
  }, [location.state, deptParam, subjectParam]);

  const fetchStudentsFromBackend = async () => {
    try {
      setLoading(true);
      // You would need to implement this endpoint or use existing ones
      // For now, we'll use the existing enrollments context
      const matched = (enrollments || []).filter((e) => {
        try {
          return slugify(e.dept) === deptParam && slugify(e.subject) === subjectParam;
        } catch (err) {
          return false;
        }
      });

      const mapped = matched.map((m, idx) => ({ 
        id: idx, 
        student: m.student, 
        dept: m.dept, 
        subject: m.subject 
      }));
      setStudents(mapped);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add the missing exportClass function
  const exportClass = () => {
    if (students.length === 0) {
      alert('No students available to export for this subject.');
      return;
    }

    // Prepare data for export
    const data = students.map((student, index) => ({
      'S.No': index + 1,
      'Student Name': student.name || 'N/A',
      'Email': student.email || 'N/A',
      'Enrollment No': student.enrollment_no || 'N/A',
      'Course': student.course || 'N/A',
      'Department': student.department || 'N/A',
      'Attendance Percentage': student.attendance?.percentage ? `${student.attendance.percentage}%` : 'N/A',
      'Classes Attended': student.attendance?.present_count || 0,
      'Total Classes': student.attendance?.total_classes || 0
    }));

    // Create worksheet and workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');

    // Generate file name
    const fileName = `${deptParam}_${subjectParam}_students_${new Date().toISOString().slice(0, 10)}`;
    
    // Export the file
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  // Add the missing buildSections function
  const buildSections = () => {
    // Group students by department or create a default section
    const sections = {};
    
    students.forEach((student) => {
      const section = student.department || 'General';
      if (!sections[section]) {
        sections[section] = [];
      }
      
      sections[section].push({
        roll: student.enrollment_no || `S${sections[section].length + 1}`,
        name: student.name || student.student || 'Unknown Student',
        attendance: student.attendance?.percentage ? `${student.attendance.percentage}%` : 'No Data',
        approvedBy: 'Teacher' // Default value, you can modify this based on your logic
      });
    });
    
    return sections;
  };

  // Add the missing exportRecord function
  const exportRecord = (rec) => {
    const data = (rec.students || []).map((s, index) => ({
      'S.No': index + 1,
      'Student': s.student || s.email || s.name || 'Unknown',
      'Status': s.status || 'Present'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Attendance_${rec.id}`);
    
    const fileName = `${rec.dept || deptParam}_${rec.subject || subjectParam}_${new Date(rec.date).toISOString().slice(0, 10)}`;
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  // Add the missing openEditor function
  const openEditor = (rec) => {
    setEditing(JSON.parse(JSON.stringify(rec)));
  };

  // Add the missing saveEdit function
  const saveEdit = () => {
    if (!editing) return;
    
    // Here you would typically send the updated data to your backend
    // For now, we'll just update the local state and show an alert
    updateAttendance(editing.id, editing);
    setEditing(null);
    alert('Attendance updated successfully!');
  };

  // Rest of your existing useEffect for attendance records
  useEffect(() => {
    // Aggregate attendances for this dept/subject...
    const raw = (attendances || []).filter(a => {
      try {
        return slugify(a.dept || a.department || '') === deptParam && slugify(a.subject || a.course || '') === subjectParam;
      } catch (err) {
        return false;
      }
    });

    // ... (rest of your existing attendance aggregation logic)
    const groups = new Map();
    raw.forEach((a) => {
      const dateKey = a.date ? new Date(a.date).toISOString() : "";
      const submittedBy = a.submittedBy || a.teacher || a.faculty || '';
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
          students: [] 
        };
        const stud = a.student ? { 
          student: a.student, 
          name: a.name || a.student, 
          status: a.status || (a.present ? 'Present' : 'Absent') 
        } : (a.name ? { 
          student: a.name, 
          name: a.name, 
          status: a.status || (a.present ? 'Present' : 'Absent') 
        } : null);
        if (stud) existing.students.push(stud);
        groups.set(key, existing);
      }
    });

    const result = Array.from(groups.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
    setRecords(result);
  }, [attendances, deptParam, subjectParam]);

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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#132E6B]">
          Students for {subjectParam?.replace(/-/g, ' ')} ({deptParam?.replace(/-/g, ' ')})
        </h2>
        {location.state?.courseInfo && (
          <div className="text-sm text-gray-600">
            Schedule: {location.state.courseInfo.schedule} • Room: {location.state.courseInfo.room}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Student List ({students.length} students)</h3>
          <div>
            <button onClick={exportClass} className="px-3 py-1 bg-green-600 text-white rounded text-sm">
              Export Excel
            </button>
          </div>
        </div>

        {/* Display students in a table */}
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
                      {student.attendance?.percentage || 0}%
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

      {/* Editor modal - only show if editing is not null */}
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
                <textarea 
                  value={editing.notes || ''} 
                  onChange={e => setEditing(s => ({...s, notes: e.target.value}))} 
                  className="w-full border p-2 rounded" 
                  rows={3} 
                />
              </div>

              <div>
                <h4 className="font-medium mb-2">Students</h4>
                <div className="max-h-64 overflow-y-auto border rounded p-2">
                  {editing.students?.map((st, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4 p-2 rounded hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="font-medium">{st.name || st.student || `Student ${st.id || idx + 1}`}</div>
                        <div className="text-sm text-gray-500">{st.id ? `ID: ${st.id}` : ''}</div>
                      </div>
                      <div>
                        <select 
                          value={st.status || 'Present'} 
                          onChange={e => {
                            const next = { ...editing };
                            next.students[idx] = { ...next.students[idx], status: e.target.value };
                            setEditing(next);
                          }} 
                          className="border p-1 rounded"
                        >
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
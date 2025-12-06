// src/pages/SubjectStudents.js

import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import api from "../services/api";

export default function SubjectStudents() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const dept = params.get("dept");
  const subject = params.get("subject");

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // ===============================
  // Fetch students enrolled in subject
  // ===============================
  const fetchStudents = async () => {
    try {
      setLoading(true);

      const list = await api.getSubjectStudents(dept, subject);

      setStudents(list || []);
    } catch (err) {
      console.error("Error loading student list:", err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // Load attendance % for each student
  // ===============================
  const loadAttendanceForStudents = async () => {
    if (students.length === 0) return;

    setLoadingAttendance(true);

    const updated = [];
    for (const s of students) {
      try {
        const result = await api.getStudentAttendancePercent(
          s.student_id,
          subject
        );

        updated.push({
          ...s,
          attendance_percent: result.percent || 0,
        });
      } catch {
        updated.push({
          ...s,
          attendance_percent: 0,
        });
      }
    }

    setStudents(updated);
    setLoadingAttendance(false);
  };

  // ===============================
  // Effect 1: load students
  // ===============================
  useEffect(() => {
    fetchStudents();
  }, [dept, subject]);

  // ===============================
  // Effect 2: load attendance after students arrive
  // ===============================
  useEffect(() => {
    loadAttendanceForStudents();
  }, [students.length]);

  // ===============================
  // Render
  // ===============================
  if (loading) {
    return (
      <div className="p-6 text-gray-700 text-lg">
        Loading students for {subject}...
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-[#132E6B] mb-6">
        Students for <span className="text-blue-600">{subject}</span> ({dept})
      </h2>

      <div className="bg-white shadow rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">
            Student List ({students.length} students)
          </h3>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Export Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border text-left">Student Name</th>
                <th className="px-4 py-2 border text-left">Email</th>
                <th className="px-4 py-2 border text-left">Enrollment No</th>
                <th className="px-4 py-2 border text-left">Course</th>
                <th className="px-4 py-2 border text-left">Semester</th>
                <th className="px-4 py-2 border text-left">
                  Attendance {loadingAttendance && "(loading...)"}
                </th>
              </tr>
            </thead>

            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="text-center text-gray-500 py-6 text-lg"
                  >
                    No students found for this course.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.student_id} className="border-b">
                    <td className="px-4 py-2 border">{s.student_name}</td>
                    <td className="px-4 py-2 border">{s.email}</td>
                    <td className="px-4 py-2 border">{s.enrollment_no}</td>
                    <td className="px-4 py-2 border">{s.course}</td>
                    <td className="px-4 py-2 border">{s.semester}</td>
                    <td
                      className={`px-4 py-2 border font-semibold ${
                        (s.attendance_percent || 0) >= 75
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {s.attendance_percent ?? 0}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Link
          to="/manage-departments"
          className="inline-block mt-4 text-blue-700 underline"
        >
          ← Back to Departments
        </Link>
      </div>
    </div>
  );
}

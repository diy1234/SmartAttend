import React, { useState, useEffect } from "react";

export default function AttendanceHistory() {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user")) || {});

  const [summary, setSummary] = useState({
    by_department: [],
    by_subject: [],
    by_student: [],
  });

  const [summaryLoading, setSummaryLoading] = useState(true);

  // -----------------------------
  //  Fetch overall attendance summary (ADMIN ONLY)
  // -----------------------------
  useEffect(() => {
    if (user.role !== "admin") return;

    const fetchSummary = async () => {
      setSummaryLoading(true);
      try {
        const resp = await fetch("/api/admin/attendance/summary");
        if (!resp.ok) throw new Error("Failed summary");
        const data = await resp.json();
        setSummary(data || {});
      } catch (e) {
        console.error(e);
        setSummary({ by_department: [], by_subject: [], by_student: [] });
      } finally {
        setSummaryLoading(false);
      }
    };

    fetchSummary();
  }, [user.role]);

  return (
    <div className="p-6">
      {/* TITLE */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Attendance History</h2>
      </div>

      {/* ONLY ADMIN SEES SUMMARY */}
      {user.role === "admin" && (
        <div className="space-y-10 mt-6 p-6 bg-white rounded shadow">
          <h2 className="text-2xl font-bold mb-4">📊 Overall Attendance Summary</h2>

          {/* ---------------------- */}
          {/*  BY DEPARTMENT TABLE   */}
          {/* ---------------------- */}
          <section>
            <h3 className="text-xl font-semibold mb-3">By Department</h3>
            {summaryLoading ? (
              <div className="text-gray-600">Loading summary...</div>
            ) : (
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 border">Department</th>
                    <th className="p-3 border">Total</th>
                    <th className="p-3 border">Present</th>
                    <th className="p-3 border">Absent</th>
                    <th className="p-3 border">%</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.by_department.map((d, i) => (
                    <tr key={i} className="text-center">
                      <td className="border p-2">{d.department}</td>
                      <td className="border p-2">{d.total_classes}</td>
                      <td className="border p-2">{d.present_classes}</td>
                      <td className="border p-2">{d.absent_classes}</td>
                      <td className="border p-2 font-semibold">
                        {d.total_classes
                          ? ((d.present_classes / d.total_classes) * 100).toFixed(
                              1
                            )
                          : "0.0"}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* ---------------------- */}
          {/*  BY SUBJECT TABLE      */}
          {/* ---------------------- */}
          <section>
            <h3 className="text-xl font-semibold mb-3">By Subject</h3>
            {summaryLoading ? (
              <div className="text-gray-600">Loading summary...</div>
            ) : (
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 border">Subject</th>
                    <th className="p-3 border">Total</th>
                    <th className="p-3 border">Present</th>
                    <th className="p-3 border">Absent</th>
                    <th className="p-3 border">%</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.by_subject.map((s, i) => (
                    <tr key={i} className="text-center">
                      <td className="border p-2">{s.subject}</td>
                      <td className="border p-2">{s.total_classes}</td>
                      <td className="border p-2">{s.present_classes}</td>
                      <td className="border p-2">{s.absent_classes}</td>
                      <td className="border p-2 font-semibold">
                        {s.total_classes
                          ? ((s.present_classes / s.total_classes) * 100).toFixed(
                              1
                            )
                          : "0.0"}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* ---------------------- */}
          {/*  BY STUDENT TABLE      */}
          {/* ---------------------- */}
          <section>
            <h3 className="text-xl font-semibold mb-3">By Student</h3>
            {summaryLoading ? (
              <div className="text-gray-600">Loading summary...</div>
            ) : (
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 border">Student</th>
                    <th className="p-3 border">Enrollment</th>
                    <th className="p-3 border">Total</th>
                    <th className="p-3 border">Present</th>
                    <th className="p-3 border">Absent</th>
                    <th className="p-3 border">%</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.by_student.map((s, i) => (
                    <tr key={i} className="text-center">
                      <td className="border p-2">{s.student_name}</td>
                      <td className="border p-2">{s.enrollment_no}</td>
                      <td className="border p-2">{s.total_classes}</td>
                      <td className="border p-2">{s.present_classes}</td>
                      <td className="border p-2">{s.absent_classes}</td>
                      <td className="border p-2 font-semibold">
                        {s.total_classes
                          ? ((s.present_classes / s.total_classes) * 100).toFixed(
                              1
                            )
                          : "0.0"}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

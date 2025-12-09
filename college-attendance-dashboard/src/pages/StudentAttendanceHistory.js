import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const PAGE_SIZES = [5, 10, 20, 50];

export default function StudentAttendanceHistory() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // --------------------------------------------
  // Fetching Attendance
  // --------------------------------------------
  const loadAttendance = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem("user")) || {};
      const userId = user.id || user.user_id;

      const profileRes = await api.get(`/student/dashboard/${userId}`);
      const studentId = profileRes.data?.profile?.student_id;

      const res = await api.get(`/attendance/student/${studentId}`);
      const rows = res.data.attendances || [];

      const normalized = rows.map((r) => ({
        id: r.id,
        attendance_date: r.attendance_date,
        subject: r.subject || r.class_name || "Unknown",
        department: r.department || "-",
        status: r.status,
        method: r.method, // face_recognition/manual/null
        marked_via_request: !!r.marked_via_request,
        teacher_name: r.teacher_name || "-",
      }));

      setAttendance(normalized);
    } catch (err) {
      console.error("Error loading attendance:", err);
      setAttendance([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load on mount
  useEffect(() => {
    loadAttendance();
  }, []);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAttendance();
  };

  // Unique subjects for filter dropdown
  const subjects = useMemo(() => {
    const setA = new Set();
    attendance.forEach((a) => a.subject && setA.add(a.subject));
    return [...setA];
  }, [attendance]);

  // --------------------------------------------
  // FILTER LOGIC
  // --------------------------------------------
  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return attendance.filter((rec) => {
      if (q) {
        const hay = `${rec.subject} ${rec.department} ${rec.teacher_name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (subjectFilter && rec.subject !== subjectFilter) return false;

      if (methodFilter !== "all") {
        if (methodFilter === "face" && rec.method !== "face_recognition") return false;
        if (methodFilter === "manual" && rec.method !== "manual") return false;
        if (methodFilter === "request" && !rec.marked_via_request) return false;
      }

      if (dateFrom && new Date(rec.attendance_date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(rec.attendance_date) > new Date(dateTo)) return false;

      return true;
    });
  }, [attendance, search, subjectFilter, methodFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // --------------------------------------------
  // METHOD LABEL LOGIC (YOUR REQUIREMENTS)
  // --------------------------------------------
  const methodLabel = (rec) => {
    if (rec.method === "face_recognition") return "Face Recognition";
    if (rec.method === "manual") return "Manual Marking";

    if (rec.marked_via_request) {
      if (rec.status === "present") return "Attendance Request (Approved)";
      return "Attendance Request (Rejected)";
    }

    return "Attendance Request"; // NO unknown anymore
  };

  const MethodIcon = ({ rec }) => {
    if (rec.method === "face_recognition") return <>🔍</>;
    if (rec.method === "manual") return <>✍️</>;
    if (rec.marked_via_request && rec.status === "present") return <>✅</>;
    if (rec.marked_via_request && rec.status === "absent") return <>❌</>;
    return <>📝</>; // Request icon
  };

  // --------------------------------------------
  // Teacher/Admin Label Logic
  // --------------------------------------------
  const whoMarked = (rec) => {
    if (rec.marked_via_request) return "Teacher"; // Admin never marks attendance
    return rec.teacher_name || "-";
  };

  // --------------------------------------------
  // RENDER UI
  // --------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-blue-900">📘 Attendance History</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            {refreshing ? (
              <>
                <span className="inline-block animate-spin">⟳</span> Refreshing...
              </>
            ) : (
              <>🔄 Refresh</>
            )}
          </button>
        </div>

        {/* filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-semibold">Search</label>
            <input
              className="w-full border p-2 rounded"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Subject</label>
            <select
              className="w-full border p-2 rounded"
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {subjects.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold">Method</label>
            <select
              className="w-full border p-2 rounded"
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All</option>
              <option value="face">Face</option>
              <option value="manual">Manual</option>
              <option value="request">Request Approved/Rejected</option>
            </select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-sm font-semibold">From</label>
              <input
                type="date"
                className="w-full border p-2 rounded"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-semibold">To</label>
              <input
                type="date"
                className="w-full border p-2 rounded"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {/* table */}
<div className="overflow-x-auto rounded-xl border border-gray-300 shadow-sm mt-4">
  <table className="min-w-full bg-white border-collapse">
    
    <thead className="bg-gray-100 text-sm text-gray-700 border-b border-gray-300">
      <tr>
        <th className="px-4 py-3 border-r border-gray-300 text-left">#</th>
        <th className="px-4 py-3 border-r border-gray-300 text-left">Date</th>
        <th className="px-4 py-3 border-r border-gray-300 text-left">Subject</th>
        <th className="px-4 py-3 border-r border-gray-300 text-left">Department</th>
        <th className="px-4 py-3 text-left">Status</th>
      </tr>
    </thead>

    <tbody>
      {loading ? (
        <tr>
          <td colSpan={5} className="p-6 text-center">
            Loading...
          </td>
        </tr>
      ) : paginated.length === 0 ? (
        <tr>
          <td colSpan={5} className="p-6 text-center text-gray-500">
            No attendance records match your filters.
          </td>
        </tr>
      ) : (
        paginated.map((rec, idx) => (
          <tr
            key={rec.id}
            className="hover:bg-gray-50 border-b border-gray-200 transition"
          >
            <td className="px-4 py-3 border-r border-gray-200">
              {(page - 1) * pageSize + idx + 1}
            </td>

            <td className="px-4 py-3 border-r border-gray-200">
              {rec.attendance_date}
            </td>

            <td className="px-4 py-3 border-r border-gray-200">
              {rec.subject}
            </td>

            <td className="px-4 py-3 border-r border-gray-200">
              {rec.department}
            </td>

            <td className="px-4 py-3">
              {rec.status === "present" ? (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                  Present
                </span>
              ) : (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                  Absent
                </span>
              )}
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>


        {/* pagination */}
        <div className="flex items-center justify-between mt-4 flex-col md:flex-row gap-4">
          <div className="flex gap-2 items-center">
            <span>Rows:</span>
            <select
              className="border p-1 rounded"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 items-center">
            <button className="px-2 border rounded" disabled={page === 1} onClick={() => setPage(1)}>
              «
            </button>
            <button className="px-2 border rounded" disabled={page === 1} onClick={() => setPage(page - 1)}>
              ‹
            </button>

            <span>
              Page {page} of {totalPages}
            </span>

            <button
              className="px-2 border rounded"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              ›
            </button>
            <button
              className="px-2 border rounded"
              disabled={page === totalPages}
              onClick={() => setPage(totalPages)}
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState, useContext } from "react";
import ToastContext from "../context/ToastContext";

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const { showToast } = useContext(ToastContext);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://127.0.0.1:5000/api/admin/students");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      console.error("Error loading students:", err);
      showToast && showToast("Failed to load students", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditStart = (student) => {
    setEditingId(student.id);
    setEditForm({ ...student });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/admin/students/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      setStudents(prev => prev.map(s => s.id === editingId ? editForm : s));
      setEditingId(null);
      showToast && showToast("Student updated successfully", "success");
    } catch (err) {
      console.error("Error updating student:", err);
      showToast && showToast("Failed to update student", "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/admin/students/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStudents(prev => prev.filter(s => s.id !== id));
      setDeleteConfirm(null);
      showToast && showToast("Student deleted successfully", "success");
    } catch (err) {
      console.error("Error deleting student:", err);
      showToast && showToast("Failed to delete student", "error");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-[#132E6B] mb-6">All Students</h2>

      {loading ? (
        <div className="text-center py-8 text-gray-600">Loading students...</div>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded-xl">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Student</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Enrollment</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Course</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Semester</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Phone</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Created</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-indigo-700">Actions</th>
              </tr>
            </thead>

            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-6 text-center text-gray-500">No students found in database</td>
                </tr>
              ) : (
                students.map((s, idx) => (
                  <tr key={s.id} className={`transition-shadow hover:shadow-sm ${idx % 2 === 0 ? 'bg-white' : 'bg-indigo-50/5'}`}>
                    <td className="px-4 py-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold">{s.name ? s.name.charAt(0).toUpperCase() : '?'}</div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{editingId === s.id ? <input type="text" name="name" value={editForm.name || ''} onChange={handleEditChange} className="border px-2 py-1 rounded" /> : s.name}</div>
                        <div className="text-xs text-gray-500">{s.enrollment_no || ''}</div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-600">{editingId === s.id ? <input type="email" name="email" value={editForm.email || ''} onChange={handleEditChange} className="border px-2 py-1 rounded w-full" /> : s.email}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{editingId === s.id ? <input type="text" name="enrollment_no" value={editForm.enrollment_no || ''} onChange={handleEditChange} className="border px-2 py-1 rounded" /> : s.enrollment_no}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{editingId === s.id ? <input type="text" name="course" value={editForm.course || ''} onChange={handleEditChange} className="border px-2 py-1 rounded" /> : <span className="inline-block bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded">{s.course || '-'}</span>}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{editingId === s.id ? <input type="number" name="semester" value={editForm.semester || ''} onChange={handleEditChange} className="border px-2 py-1 rounded w-16" /> : s.semester}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{editingId === s.id ? <input type="tel" name="phone" value={editForm.phone || ''} onChange={handleEditChange} className="border px-2 py-1 rounded" /> : (s.phone || '-')}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{s.created_at ? new Date(s.created_at).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-4 text-right text-sm space-x-2">
                      {editingId === s.id ? (
                        <>
                          <button onClick={handleEditSave} className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700">Save</button>
                          <button onClick={() => setEditingId(null)} className="inline-flex items-center px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEditStart(s)} className="inline-flex items-center px-3 py-1 border border-indigo-200 text-indigo-700 rounded-md mr-2 hover:bg-indigo-50">Edit</button>
                          <button onClick={() => setDeleteConfirm(s.id)} className="inline-flex items-center px-3 py-1 border border-red-200 text-red-700 rounded-md hover:bg-red-50">Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Student?</h3>
            <p className="text-gray-600 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

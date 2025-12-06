import React, { useEffect, useState, useContext } from "react";
import ToastContext from "../context/ToastContext";

export default function CourseList() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const { showToast } = useContext(ToastContext);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://127.0.0.1:5000/api/admin/courses");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCourses(data);
    } catch (err) {
      console.error("Error loading courses:", err);
      showToast && showToast("Failed to load courses", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditStart = (course) => {
    setEditingId(course.id);
    setEditForm({ ...course });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/admin/courses/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      setCourses(prev => prev.map(c => c.id === editingId ? editForm : c));
      setEditingId(null);
      showToast && showToast("Course updated successfully", "success");
    } catch (err) {
      console.error("Error updating course:", err);
      showToast && showToast("Failed to update course", "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/admin/courses/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCourses(prev => prev.filter(c => c.id !== id));
      setDeleteConfirm(null);
      showToast && showToast("Course deleted successfully", "success");
    } catch (err) {
      console.error("Error deleting course:", err);
      showToast && showToast("Failed to delete course", "error");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-[#132E6B] mb-6">All Courses</h2>

      {loading ? (
        <div className="text-center py-8 text-gray-600">Loading courses...</div>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded-xl">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-pink-700">Course</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-pink-700">Department</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-pink-700">Created</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-pink-700">Actions</th>
              </tr>
            </thead>

            <tbody>
              {courses.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-6 text-center text-gray-500">No courses found in database</td>
                </tr>
              ) : (
                courses.map((c, idx) => (
                  <tr key={c.id} className={`transition-shadow hover:shadow-sm ${idx % 2 === 0 ? 'bg-white' : 'bg-pink-50/5'}`}>
                    <td className="px-4 py-4 text-sm text-gray-800">{editingId === c.id ? <input type="text" name="name" value={editForm.name || ''} onChange={handleEditChange} className="border px-2 py-1 rounded w-full" /> : (c.name || '—')}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{editingId === c.id ? <input type="text" name="department" value={editForm.department || ''} onChange={handleEditChange} className="border px-2 py-1 rounded w-full" /> : (c.department || '—')}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-4 text-right text-sm space-x-2">
                      {editingId === c.id ? (
                        <>
                          <button onClick={handleEditSave} className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700">Save</button>
                          <button onClick={() => setEditingId(null)} className="inline-flex items-center px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEditStart(c)} className="inline-flex items-center px-3 py-1 border border-pink-200 text-pink-700 rounded-md mr-2 hover:bg-pink-50">Edit</button>
                          <button onClick={() => setDeleteConfirm(c.id)} className="inline-flex items-center px-3 py-1 border border-red-200 text-red-700 rounded-md hover:bg-red-50">Delete</button>
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
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Course?</h3>
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

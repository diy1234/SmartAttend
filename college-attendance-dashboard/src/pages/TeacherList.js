import React, { useEffect, useState, useContext } from "react";
import ToastContext from "../context/ToastContext";

export default function TeacherList() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const { showToast } = useContext(ToastContext);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://127.0.0.1:5000/api/admin/teachers");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTeachers(data);
    } catch (err) {
      console.error("Error loading teachers:", err);
      showToast && showToast("Failed to load teachers", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditStart = (teacher) => {
    setEditingId(teacher.id);
    setEditForm({ ...teacher });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/admin/teachers/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      setTeachers(prev => prev.map(t => t.id === editingId ? editForm : t));
      setEditingId(null);
      showToast && showToast("Teacher updated successfully", "success");
    } catch (err) {
      console.error("Error updating teacher:", err);
      showToast && showToast("Failed to update teacher", "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/admin/teachers/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTeachers(prev => prev.filter(t => t.id !== id));
      setDeleteConfirm(null);
      showToast && showToast("Teacher deleted successfully", "success");
    } catch (err) {
      console.error("Error deleting teacher:", err);
      showToast && showToast("Failed to delete teacher", "error");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-[#132E6B] mb-6">All Teachers</h2>

      {loading ? (
        <div className="text-center py-8 text-gray-600">Loading teachers...</div>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded-xl">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">Faculty</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">Department</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">Designation</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">Contact</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">Created</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-emerald-700">Actions</th>
              </tr>
            </thead>

            <tbody>
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-6 text-center text-gray-500">No teachers found in database</td>
                </tr>
              ) : (
                teachers.map((t, idx) => (
                  <tr key={t.id} className={`transition-shadow hover:shadow-sm ${idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/5'}`}>
                    <td className="px-4 py-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold">{t.full_name ? t.full_name.charAt(0).toUpperCase() : 'T'}</div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{editingId === t.id ? <input type="text" name="full_name" value={editForm.full_name || ''} onChange={handleEditChange} className="border px-2 py-1 rounded" /> : t.full_name}</div>
                        <div className="text-xs text-gray-500">{t.faculty_id || ''}</div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-600">{editingId === t.id ? <input type="email" name="email" value={editForm.email || ''} onChange={handleEditChange} className="border px-2 py-1 rounded w-full" /> : t.email}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{editingId === t.id ? <input type="text" name="department" value={editForm.department || ''} onChange={handleEditChange} className="border px-2 py-1 rounded" /> : (t.department || '-')}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{editingId === t.id ? <input type="text" name="designation" value={editForm.designation || ''} onChange={handleEditChange} className="border px-2 py-1 rounded" /> : (t.designation || '-')}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{editingId === t.id ? <input type="tel" name="contact" value={editForm.contact || ''} onChange={handleEditChange} className="border px-2 py-1 rounded" /> : (t.contact || '-')}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-4 text-right text-sm space-x-2">
                      {editingId === t.id ? (
                        <>
                          <button onClick={handleEditSave} className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700">Save</button>
                          <button onClick={() => setEditingId(null)} className="inline-flex items-center px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEditStart(t)} className="inline-flex items-center px-3 py-1 border border-emerald-200 text-emerald-700 rounded-md mr-2 hover:bg-emerald-50">Edit</button>
                          <button onClick={() => setDeleteConfirm(t.id)} className="inline-flex items-center px-3 py-1 border border-red-200 text-red-700 rounded-md hover:bg-red-50">Delete</button>
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
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Teacher?</h3>
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

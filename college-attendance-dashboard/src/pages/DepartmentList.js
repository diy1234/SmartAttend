import React, { useEffect, useState, useContext } from "react";
import ToastContext from "../context/ToastContext";

export default function DepartmentList() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const { showToast } = useContext(ToastContext);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://127.0.0.1:5000/api/admin/departments");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDepartments(data);
    } catch (err) {
      console.error("Error loading departments:", err);
      showToast && showToast("Failed to load departments", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditStart = (dept) => {
    setEditingId(dept.id);
    setEditForm({ ...dept });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/admin/departments/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      setDepartments(prev => prev.map(d => d.id === editingId ? editForm : d));
      setEditingId(null);
      showToast && showToast("Department updated successfully", "success");
    } catch (err) {
      console.error("Error updating department:", err);
      showToast && showToast("Failed to update department", "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/admin/departments/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDepartments(prev => prev.filter(d => d.id !== id));
      setDeleteConfirm(null);
      showToast && showToast("Department deleted successfully", "success");
    } catch (err) {
      console.error("Error deleting department:", err);
      showToast && showToast("Failed to delete department", "error");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-[#132E6B] mb-6">All Departments</h2>

      {loading ? (
        <div className="text-center py-8 text-gray-600">Loading departments...</div>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded-xl">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-amber-700">Department</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-amber-700">Subjects</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-amber-700">Created</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-amber-700">Actions</th>
              </tr>
            </thead>

            <tbody>
              {departments.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-6 text-center text-gray-500">No departments found in database</td>
                </tr>
              ) : (
                departments.map((d, idx) => (
                  <tr key={d.id} className={`transition-shadow hover:shadow-sm ${idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/5'}`}>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{editingId === d.id ? <input type="text" name="name" value={editForm.name || ''} onChange={handleEditChange} className="border px-2 py-1 rounded w-full" /> : d.name}</td>
                    <td className="px-4 py-4 text-sm text-center text-gray-600">{d.total_subjects !== undefined ? d.total_subjects : '—'}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-4 text-right text-sm space-x-2">
                      {editingId === d.id ? (
                        <>
                          <button onClick={handleEditSave} className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700">Save</button>
                          <button onClick={() => setEditingId(null)} className="inline-flex items-center px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEditStart(d)} className="inline-flex items-center px-3 py-1 border border-amber-200 text-amber-700 rounded-md mr-2 hover:bg-amber-50">Edit</button>
                          <button onClick={() => setDeleteConfirm(d.id)} className="inline-flex items-center px-3 py-1 border border-red-200 text-red-700 rounded-md hover:bg-red-50">Delete</button>
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
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Department?</h3>
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

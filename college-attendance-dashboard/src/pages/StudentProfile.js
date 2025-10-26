import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import UserContext from '../context/UserContext';
import DataContext from '../context/DataContext';

export default function StudentProfile(){
  const { user, setUser } = useContext(UserContext);
  const { getEnrollmentsForStudent } = useContext(DataContext);

  const stored = user || JSON.parse(localStorage.getItem('user') || '{}');
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: stored.name || '',
    roll: stored.roll || stored.email || '',
    program: stored.program || '',
    semester: stored.semester || '',
    email: stored.email || '',
    phone: stored.phone || '',
    emergencyName: stored.emergencyName || '',
    emergencyPhone: stored.emergencyPhone || '',
    address: stored.address || '',
    mentor: stored.mentor || '',
    department: stored.department || '',
  });

  useEffect(()=>{
    setForm(f => ({ ...f, name: stored.name || '', email: stored.email || '' }));
  }, [stored]);

  const enrolls = getEnrollmentsForStudent(stored.email || '');

  const save = () => {
    const updated = { ...(stored || {}), ...form };
    localStorage.setItem('user', JSON.stringify(updated));
    if (setUser) setUser(updated);
    setEditMode(false);
  };

  const handleRescan = () => {
    // placeholder: in real app this would start face enrollment flow
    const updated = { ...(stored || {}), faceStatus: 'Pending Enrollment' };
    localStorage.setItem('user', JSON.stringify(updated));
    if (setUser) setUser(updated);
    alert('Face re-scan requested. Follow the on-screen instructions to re-enroll.');
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-[#132E6B] mb-6">Student Profile</h2>

      <div className="bg-white p-6 rounded-xl shadow-md mb-6 flex gap-6">
        <div className="w-32">
          <img src={stored.photo || '/avatar-placeholder.png'} alt="avatar" className="w-32 h-32 rounded-full object-cover border" />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold">{form.name || 'Student Name'}</h3>
              <p className="text-sm text-gray-600">Roll / ID: {form.roll || '—'}</p>
              <p className="text-sm text-gray-600">{form.program}{form.semester ? ` — Sem ${form.semester}` : ''}</p>
            </div>
            <div className="text-right">
              <div className="mb-2">
                <span className={`px-2 py-1 rounded text-sm font-medium ${stored.faceStatus === 'Active' ? 'bg-green-100 text-green-800' : stored.faceStatus === 'Outdated' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>
                  {stored.faceStatus || 'Pending Enrollment'}
                </span>
              </div>
              <div className="text-sm text-gray-500">Last enrollment: {stored.lastEnrollment ? new Date(stored.lastEnrollment).toLocaleDateString() : 'N/A'}</div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleRescan} className="bg-blue-600 text-white px-4 py-2 rounded">Request Re-scan</button>
            <button onClick={() => setEditMode(!editMode)} className="border px-4 py-2 rounded">{editMode ? 'Cancel' : 'Edit Contact'}</button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <h4 className="font-semibold mb-3">Contact Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600">Primary Email</label>
            <input value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} disabled={!editMode} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Phone</label>
            <input value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})} disabled={!editMode} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Emergency Contact Name</label>
            <input value={form.emergencyName} onChange={(e)=>setForm({...form, emergencyName: e.target.value})} disabled={!editMode} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Emergency Contact Phone</label>
            <input value={form.emergencyPhone} onChange={(e)=>setForm({...form, emergencyPhone: e.target.value})} disabled={!editMode} className="w-full border p-2 rounded" />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-gray-600">Address</label>
            <textarea value={form.address} onChange={(e)=>setForm({...form, address: e.target.value})} disabled={!editMode} className="w-full border p-2 rounded" />
          </div>
        </div>
        {editMode && (
          <div className="mt-4">
            <button onClick={save} className="bg-green-600 text-white px-4 py-2 rounded">Save Changes</button>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <h4 className="font-semibold mb-3">Academic Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><strong>Mentor/Advisor:</strong> {form.mentor || '—'}</div>
          <div><strong>Department:</strong> {form.department || '—'}</div>
          <div className="md:col-span-2">
            <strong>Enrolled Subjects:</strong>
            {enrolls && enrolls.length ? (
              <ul className="list-disc ml-5 mt-2">
                {enrolls.map((e, i)=> <li key={i}>{e.dept} — {e.subject}</li>)}
              </ul>
            ) : <div className="text-sm text-gray-500 mt-2">No enrollments found</div>}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <h4 className="font-semibold mb-3">Account Management</h4>
        <div className="flex flex-col md:flex-row gap-3">
          <Link to="/settings" className="px-4 py-2 bg-gray-100 rounded">Change Password</Link>
          <button className="px-4 py-2 bg-gray-100 rounded">Notification Preferences</button>
          <Link to="/about" className="px-4 py-2 bg-gray-100 rounded">Privacy & Policy</Link>
        </div>
      </div>
    </div>
  );
}

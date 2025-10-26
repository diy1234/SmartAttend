import React, { useContext, useState, useEffect } from 'react';
import UserContext from '../context/UserContext';
import DataContext from '../context/DataContext';

export default function TeacherAboutMe(){
  const { user, setUser } = useContext(UserContext);
  const { departments } = useContext(DataContext);

  const stored = JSON.parse(localStorage.getItem('user')) || {};
  const profile = stored.teacherProfile || {
    facultyId: '', fullName: stored.name || '', email: stored.email || '', department: departments[0]?.name || '',
    designation: 'Assistant Professor', gender: 'Male', contact: '', photo: stored.photo || '', linkedin: '', socialLinks: [], professional: '',
    headline: '', aboutText: ''
  };

  const [local, setLocal] = useState(profile);

  useEffect(()=>{
    const u = JSON.parse(localStorage.getItem('user')) || {};
    setLocal(prev => ({ ...prev, fullName: u.name || prev.fullName, email: u.email || prev.email, photo: u.photo || prev.photo }));
  }, [user, departments]);

  const save = (patch) => {
    const cur = JSON.parse(localStorage.getItem('user')) || {};
    const nextProfile = { ...(cur.teacherProfile||{}), ...local, ...patch };
    const merged = { ...cur, teacherProfile: nextProfile };
    localStorage.setItem('user', JSON.stringify(merged));
    setUser && setUser(merged);
    setLocal(nextProfile);
  };

  const addLink = (val) => { if(!val) return; const arr = [...(local.socialLinks||[]), val]; setLocal(l=>({...l, socialLinks:arr})); save({ socialLinks: arr }); };
  const removeLink = (i) => { const arr=(local.socialLinks||[]).filter((_,idx)=>idx!==i); setLocal(l=>({...l, socialLinks:arr})); save({ socialLinks: arr }); };

  return (
    <div className="min-h-screen bg-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
  <h1 className="text-2xl font-bold text-[#132E6B] mb-4">My Profile</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="col-span-1 bg-white shadow rounded-lg p-4 flex flex-col items-center">
            <img src={local.photo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'} alt="avatar" className="w-32 h-32 rounded-full object-cover border mb-3" />
            <h2 className="font-semibold text-lg">{local.fullName || 'Teacher'}</h2>
            <p className="text-sm text-gray-600">{local.designation || ''} — {local.department || ''}</p>
            <div className="mt-3 w-full">
              <label className="block text-xs text-gray-500">Headline</label>
              <input value={local.headline||''} onChange={(e)=>setLocal(l=>({...l, headline: e.target.value}))} onBlur={()=>save({ headline: local.headline })} className="w-full mt-1 border px-2 py-1 rounded text-sm" placeholder="Short headline (e.g., PhD, Subject lead)" />
            </div>
          </div>

          <div className="col-span-2 bg-white shadow rounded-lg p-4 space-y-3">
            <label className="block text-xs text-gray-600">Faculty ID</label>
            <input value={local.facultyId||''} onChange={(e)=>setLocal(l=>({...l, facultyId: e.target.value}))} onBlur={()=>save({ facultyId: local.facultyId })} className="w-full border px-2 py-1 rounded" />

            <label className="block text-xs text-gray-600">Full Name</label>
            <input value={local.fullName||''} onChange={(e)=>setLocal(l=>({...l, fullName: e.target.value}))} onBlur={()=>save({ fullName: local.fullName })} className="w-full border px-2 py-1 rounded" />

            <label className="block text-xs text-gray-600">Email</label>
            <input value={local.email||''} onChange={(e)=>setLocal(l=>({...l, email: e.target.value}))} onBlur={()=>save({ email: local.email })} className="w-full border px-2 py-1 rounded" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600">Department</label>
                <select value={local.department||''} onChange={(e)=>setLocal(l=>({...l, department: e.target.value}))} onBlur={()=>save({ department: local.department })} className="w-full border px-2 py-1 rounded">
                  {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600">Designation</label>
                <select value={local.designation||''} onChange={(e)=>setLocal(l=>({...l, designation: e.target.value}))} onBlur={()=>save({ designation: local.designation })} className="w-full border px-2 py-1 rounded">
                  <option>Assistant Professor</option>
                  <option>Associate Professor</option>
                  <option>Professor</option>
                  <option>Lecturer</option>
                </select>
              </div>
            </div>

            <label className="block text-xs text-gray-600">Gender</label>
            <div className="flex gap-3">
              {['Male','Female','Other'].map(g=> <label key={g}><input type="radio" name="gender" checked={local.gender===g} onChange={()=>{ setLocal(l=>({...l, gender: g})); save({ gender: g }); }} /> <span className="ml-1">{g}</span></label>)}
            </div>

            <label className="block text-xs text-gray-600">Contact Number</label>
            <input value={local.contact||''} onChange={(e)=>setLocal(l=>({...l, contact: e.target.value}))} onBlur={()=>save({ contact: local.contact })} className="w-full border px-2 py-1 rounded" />

            <label className="block text-xs text-gray-600">Profile Photo</label>
            <div className="flex items-center gap-3">
              <img src={local.photo||'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'} alt="avatar" className="w-16 h-16 rounded-full object-cover border" />
              <input type="file" accept="image/*" onChange={(e)=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onloadend=()=>{ setLocal(l=>({...l, photo: r.result})); save({ photo: r.result }); }; r.readAsDataURL(f); }} />
            </div>

            <label className="block text-xs text-gray-600">LinkedIn</label>
            <input value={local.linkedin||''} onChange={(e)=>setLocal(l=>({...l, linkedin: e.target.value}))} onBlur={()=>save({ linkedin: local.linkedin })} className="w-full border px-2 py-1 rounded" placeholder="https://linkedin.com/in/yourid" />

            <label className="block text-xs text-gray-600">Social Links</label>
            <div className="space-y-2">
              <AddLinkInline items={local.socialLinks||[]} onAdd={addLink} onRemove={removeLink} />
            </div>

            <label className="block text-xs text-gray-600">Professional & Academic Details</label>
            <textarea value={local.professional||''} onChange={(e)=>setLocal(l=>({...l, professional: e.target.value}))} onBlur={()=>save({ professional: local.professional })} className="w-full border px-2 py-1 rounded h-28" placeholder="Education, experience, publications, achievements" />

            <div className="text-right">
              <button onClick={()=>{ save({}); alert('Profile saved'); }} className="bg-blue-800 text-white px-4 py-2 rounded">Save</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddLinkInline({ items = [], onAdd, onRemove }){
  const [val, setVal] = useState('');
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input value={val} onChange={(e)=>setVal(e.target.value)} className="border px-2 py-1 rounded w-full text-sm" placeholder="Add link (GitHub, personal site)" />
        <button onClick={()=>{ if(!val) return; onAdd(val.trim()); setVal(''); }} className="bg-blue-800 text-white px-3 py-1 rounded text-sm">Add</button>
      </div>
      <ul className="text-sm">
        {items.map((it, idx) => (<li key={idx} className="flex justify-between items-center"><a className="text-blue-700" href={it} target="_blank" rel="noreferrer">{it}</a><button className="text-red-600 text-sm" onClick={()=>onRemove(idx)}>Remove</button></li>))}
      </ul>
    </div>
  );
}

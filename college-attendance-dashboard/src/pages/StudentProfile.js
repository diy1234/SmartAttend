import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import UserContext from '../context/UserContext';
import DataContext from '../context/DataContext';
import ToastContext from '../context/ToastContext';
import api, { getUserProfile } from '../services/api';

export default function StudentProfile(){
  const { user, setUser } = useContext(UserContext);
  const { getEnrollmentsForStudent } = useContext(DataContext);
  const { showToast } = useContext(ToastContext);

  const stored = user || JSON.parse(localStorage.getItem('user') || '{}');
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    address: '',
    experience: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/users/student-profile?student_id=${stored.id}`);
        setProfileData(response.data.profile);
        // Merge fetched profile into localStorage user and context so navbar/profile areas update
        try {
          const merged = { ...(stored || {}), ...response.data.profile };
          localStorage.setItem('user', JSON.stringify(merged));
          if (setUser) setUser(merged);
        } catch (e) {
          // ignore storage errors
        }
        
        // Initialize form with profile data
        setForm({
          name: response.data.profile.name || '',
          phone: response.data.profile.phone || '',
          emergency_contact_name: response.data.profile.emergency_contact_name || '',
          emergency_contact_phone: response.data.profile.emergency_contact_phone || '',
          address: response.data.profile.address || '',
          experience: response.data.profile.experience || response.data.profile.about || ''
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (stored.id) {
      fetchProfile();
    }
  }, [stored.id]);

  // Keep profileData in sync if UserContext.user changes elsewhere (e.g., avatar upload from Navbar)
  useEffect(() => {
    if (user) {
      setProfileData(prev => ({ ...(prev || {}), ...(user || {}) }));
      // also merge form with any new fields if present
      setForm(prev => ({ ...(prev || {}), phone: (user.phone || prev.phone), address: (user.address || prev.address), emergency_contact_name: (user.emergency_contact_name || prev.emergency_contact_name), emergency_contact_phone: (user.emergency_contact_phone || prev.emergency_contact_phone), experience: (user.experience || prev.experience) }));
    }
  }, [user]);

  const save = async () => {
    setLoading(true);
    try {
      const response = await api.put(`/users/student-profile/${stored.id}`, form);

      // Build updated profile locally (optimistic)
      const updatedProfile = { ...(profileData || {}), ...form };
      setProfileData(updatedProfile);

      // merge into user object stored in localStorage/context
      try {
        const mergedUser = { ...(stored || {}), ...updatedProfile };
        localStorage.setItem('user', JSON.stringify(mergedUser));
        if (setUser) setUser(mergedUser);
      } catch (e) {}

      setEditMode(false);

      if (response && response.data && response.data.success) {
        showToast('Profile updated successfully', 'success', 3000);
      } else {
        showToast('Saved locally (server did not confirm).', 'warning', 4000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      // Still apply optimistic local update so UI shows changes
      const updatedProfile = { ...(profileData || {}), ...form };
      setProfileData(updatedProfile);
      try {
        const mergedUser = { ...(stored || {}), ...updatedProfile };
        localStorage.setItem('user', JSON.stringify(mergedUser));
        if (setUser) setUser(mergedUser);
      } catch (e) {}
      setEditMode(false);
      showToast('Saved locally (offline).', 'warning', 4000);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    // reset form to profileData values
    if (profileData) {
      setForm({
        name: profileData.name || '',
        phone: profileData.phone || '',
        emergency_contact_name: profileData.emergency_contact_name || '',
        emergency_contact_phone: profileData.emergency_contact_phone || '',
        address: profileData.address || '',
      });
    }
    setEditMode(false);
  };

  return (
    <div className="p-8 bg-gradient-to-b from-white to-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="text-4xl text-[#132E6B]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="#132E6B" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.31 0-8 1.67-8 5v1h16v-1c0-3.33-4.69-5-8-5z"/></svg>
          </div>
          <h2 className="text-3xl font-bold text-[#132E6B]">Student Profile</h2>
        </div>

        <div>
          {!editMode ? (
            <button onClick={() => setEditMode(true)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded shadow">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 010 2.828l-9.9 9.9a1 1 0 01-.464.263l-4 1a1 1 0 01-1.213-1.213l1-4a1 1 0 01.263-.464l9.9-9.9a2 2 0 012.828 0z"/></svg>
              Edit Profile
            </button>
          ) : (
            <button onClick={handleCancel} className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded shadow">Cancel</button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        {editMode ? (
          <form onSubmit={(e)=>{e.preventDefault(); save();}} className="space-y-6">
              <div className="flex items-start gap-8">
                <div className="w-36 h-36 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-white text-4xl font-bold shadow-lg relative">
                  {profileData?.name ? profileData.name.charAt(0) : (stored.name || 'U').charAt(0)}
                  <label className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 border cursor-pointer">
                    <input type="file" accept="image/*" onChange={(e)=>{
                      const file = e.target.files[0];
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const dataUrl = reader.result;
                        const updated = { ...(user||{}), photo: dataUrl };
                        try { localStorage.setItem('user', JSON.stringify(updated)); } catch(e) {}
                        if (setUser) setUser(updated);
                        // also update profileData so this page reflects the new image immediately
                        setProfileData(prev => ({ ...(prev||{}), photo: dataUrl, avatar: dataUrl }));
                      };
                      if (file) reader.readAsDataURL(file);
                    }} className="absolute inset-0 w-6 h-6 opacity-0 cursor-pointer" />
                    <svg className="w-4 h-4 text-gray-700" fill="currentColor" viewBox="0 0 20 20"><path d="M3 7h3l2-3h6l2 3h3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><circle cx="12" cy="13" r="3"/></svg>
                  </label>
                </div>

              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Full Name (Read-only)</label>
                  <input readOnly value={profileData?.name || stored.name || ''} className="mt-2 block w-full border rounded p-3 bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Email (Read-only)</label>
                  <input readOnly value={stored.email || profileData?.email || ''} className="mt-2 block w-full border rounded p-3 bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Course (Read only)</label>
                  <input readOnly value={profileData?.course || profileData?.department || '-'} className="mt-2 block w-full border rounded p-3 bg-gray-50" />
                </div>
              </div>
            </div>

            <hr />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="Enter phone number" className="mt-2 block w-full border rounded p-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Address</label>
                <input name="address" value={form.address} onChange={handleChange} placeholder="Enter address" className="mt-2 block w-full border rounded p-3" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">Experience</label>
              <textarea name="experience" value={form.experience || ''} onChange={(e)=> setForm(prev=>({...prev, experience: e.target.value}))} placeholder="Enter your experience (e.g., internships, projects, skills)" className="mt-2 block w-full border rounded p-3 h-28" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">Emergency Contact Name</label>
                <input name="emergency_contact_name" value={form.emergency_contact_name} onChange={handleChange} placeholder="Enter emergency contact name" className="mt-2 block w-full border rounded p-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Emergency Contact Phone</label>
                <input name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handleChange} placeholder="Enter emergency contact phone" className="mt-2 block w-full border rounded p-3" />
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded shadow">💾 Save Changes</button>
            </div>
          </form>
        ) : (
          <>
            {/* Top summary row (avatar + 4 fields) */}
            <div className="flex items-center space-x-8 mb-6">
              <div className="w-36 h-36 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                <img src={profileData?.photo || profileData?.avatar || stored.photo || ''} alt="avatar" className="w-full h-full object-cover rounded-full" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
                {!((profileData && (profileData.photo || profileData.avatar)) || stored.photo) && (
                  <span>{(profileData?.name || stored.name || 'U').charAt(0)}</span>
                )}
              </div>

              <div className="flex-1 grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-500">ENROLLMENT NO.</div>
                  <div className="text-lg font-semibold mt-1">{profileData?.enrollment_no || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">COURSE</div>
                  <div className="text-lg font-semibold mt-1">{profileData?.course || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">SEMESTER</div>
                  <div className="text-lg font-semibold mt-1">{profileData?.semester || '-'}</div>
                </div>
              </div>
            </div>

            <hr className="my-6" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg">
              
                <div className="flex items-center mb-3">
                  <svg className="w-6 h-6 text-pink-500 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M2 5a2 2 0 012-2h1.5a.5.5 0 01.5.5V5h6V3.5a.5.5 0 01.5-.5H16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5z"/></svg>
                  <h4 className="text-lg font-semibold text-[#132E6B]">Contact Information</h4>
                </div>
                <div className="text-sm text-gray-700 space-y-3">
                  <div><strong>PHONE</strong><div className="text-gray-600 mt-1">{profileData?.phone || form.phone || '-'}</div></div>
                  <div><strong>ADDRESS</strong><div className="text-gray-600 mt-1">{profileData?.address || form.address || '-'}</div></div>
                </div>
              </div>

              <div className="bg-green-50 p-6 rounded-lg">
                <div className="flex items-center mb-3">
                  <svg className="w-6 h-6 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H3a1 1 0 110-2h6V3a1 1 0 011-1z"/></svg>
                  <h4 className="text-lg font-semibold text-[#0f5132]">Emergency Contact</h4>
                </div>
                <div className="text-sm text-gray-700 space-y-3">
                  <div><strong>NAME</strong><div className="text-gray-600 mt-1">{profileData?.emergency_contact_name || form.emergency_contact_name || '-'}</div></div>
                  <div><strong>PHONE</strong><div className="text-gray-600 mt-1">{profileData?.emergency_contact_phone || form.emergency_contact_phone || '-'}</div></div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
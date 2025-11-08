import React, { useContext, useState, useEffect } from 'react';
import UserContext from '../context/UserContext';
import DataContext from '../context/DataContext';

export default function TeacherAboutMe(){
  const { user, setUser } = useContext(UserContext);
  const { departments } = useContext(DataContext);

  const [local, setLocal] = useState({
    faculty_id: '', 
    full_name: '', 
    email: '', 
    department: '', 
    designation: 'Assistant Professor', 
    gender: 'Male', 
    contact: '', 
    photo: '', 
    linkedin: '', 
    social_links: [], 
    professional: '',
    headline: '', 
    about_text: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [facultyIdEditable, setFacultyIdEditable] = useState(false);

  // Fetch teacher profile from backend
  useEffect(() => {
    const fetchTeacherProfile = async () => {
      try {
        setLoading(true);
        const userId = user?.id || JSON.parse(localStorage.getItem('user'))?.id;
        
        if (!userId) {
          console.error('No user ID found');
          setLoading(false);
          return;
        }

        const response = await fetch(`http://127.0.0.1:5000/api/teachers/profile?user_id=${userId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const profileData = await response.json();
        
        // Transform backend data to match frontend structure
        const transformedProfile = {
          faculty_id: profileData.faculty_id || '',
          full_name: profileData.full_name || user?.name || '',
          email: profileData.email || user?.email || '',
          department: profileData.department || departments[0]?.name || '',
          designation: profileData.designation || 'Assistant Professor',
          gender: profileData.gender || 'Male',
          contact: profileData.contact || '',
          photo: profileData.photo || '',
          linkedin: profileData.linkedin || '',
          social_links: profileData.social_links || [],
          professional: profileData.professional || '',
          headline: profileData.headline || '',
          about_text: profileData.about_text || ''
        };

        setLocal(transformedProfile);
        
      } catch (error) {
        console.error('Error fetching teacher profile:', error);
        // Fallback to localStorage data if API fails
        const stored = JSON.parse(localStorage.getItem('user')) || {};
        const fallbackProfile = stored.teacherProfile || {
          faculty_id: '', 
          full_name: stored.name || '', 
          email: stored.email || '', 
          department: departments[0]?.name || '',
          designation: 'Assistant Professor', 
          gender: 'Male', 
          contact: '', 
          photo: stored.photo || '', 
          linkedin: '', 
          social_links: [], 
          professional: '',
          headline: '', 
          about_text: ''
        };
        setLocal(fallbackProfile);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherProfile();
  }, [user, departments]);

  // Generate Faculty ID only once when department is selected for the first time
  const generateFacultyId = async (newDepartment) => {
    try {
      const userId = user?.id || JSON.parse(localStorage.getItem('user'))?.id;
      
      if (!userId) return;

      // Only generate if faculty_id is empty
      if (!local.faculty_id) {
        const response = await fetch('http://127.0.0.1:5000/api/teachers/profile/generate-faculty-id', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            department: newDepartment
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        // Update local state with new faculty ID
        setLocal(prev => ({ 
          ...prev, 
          faculty_id: result.faculty_id,
          department: newDepartment 
        }));
      } else {
        // If faculty ID already exists, just update department
        setLocal(prev => ({ 
          ...prev, 
          department: newDepartment 
        }));
      }
      
    } catch (error) {
      console.error('Error generating faculty ID:', error);
      // Fallback: Generate a simple ID locally only if no faculty_id exists
      if (!local.faculty_id) {
        const deptCode = newDepartment ? newDepartment.substring(0, 3).toUpperCase() : 'FAC';
        const userId = user?.id || JSON.parse(localStorage.getItem('user'))?.id || '000';
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const fallbackId = `${deptCode}${userId.toString().padStart(3, '0')}${randomSuffix}`;
        
        setLocal(prev => ({ 
          ...prev, 
          faculty_id: fallbackId,
          department: newDepartment 
        }));
      }
    }
  };

  // Save profile to backend
  const saveProfile = async (patch = {}) => {
    try {
      setSaving(true);
      setMessage('');
      
      const userId = user?.id || JSON.parse(localStorage.getItem('user'))?.id;
      
      if (!userId) {
        throw new Error('User ID not found');
      }

      const updatedProfile = { ...local, ...patch };
      
      const response = await fetch('http://127.0.0.1:5000/api/teachers/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          faculty_id: updatedProfile.faculty_id,
          full_name: updatedProfile.full_name,
          email: updatedProfile.email,
          department: updatedProfile.department,
          designation: updatedProfile.designation,
          gender: updatedProfile.gender,
          contact: updatedProfile.contact,
          photo: updatedProfile.photo,
          linkedin: updatedProfile.linkedin,
          social_links: updatedProfile.social_links,
          professional: updatedProfile.professional,
          headline: updatedProfile.headline,
          about_text: updatedProfile.about_text
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Update local state with potentially new faculty ID from backend
      const finalProfile = { ...updatedProfile, faculty_id: result.faculty_id || updatedProfile.faculty_id };
      setLocal(finalProfile);
      
      // Update localStorage for offline fallback
      const currentUser = JSON.parse(localStorage.getItem('user')) || {};
      const mergedUser = { 
        ...currentUser, 
        teacherProfile: finalProfile,
        name: finalProfile.full_name || currentUser.name,
        email: finalProfile.email || currentUser.email,
        photo: finalProfile.photo || currentUser.photo
      };
      localStorage.setItem('user', JSON.stringify(mergedUser));
      
      // Update user context
      if (setUser) {
        setUser(mergedUser);
      }
      
      setMessage('Profile saved successfully!');
      setTimeout(() => setMessage(''), 3000);
      
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage('Error saving profile. Please try again.');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Save photo separately (optimized for image uploads)
  const saveProfilePhoto = async (photoData) => {
    try {
      const userId = user?.id || JSON.parse(localStorage.getItem('user'))?.id;
      
      if (!userId) {
        throw new Error('User ID not found');
      }

      const response = await fetch('http://127.0.0.1:5000/api/teachers/profile/photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          photo: photoData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update local state
      setLocal(prev => ({ ...prev, photo: photoData }));
      
      // Update localStorage
      const currentUser = JSON.parse(localStorage.getItem('user')) || {};
      const updatedUser = { ...currentUser, photo: photoData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      if (setUser) {
        setUser(updatedUser);
      }
      
    } catch (error) {
      console.error('Error saving profile photo:', error);
      // Fallback to localStorage only
      const currentUser = JSON.parse(localStorage.getItem('user')) || {};
      const updatedUser = { ...currentUser, photo: photoData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const addLink = (val) => { 
    if (!val) return; 
    const newLinks = [...(local.social_links || []), val]; 
    setLocal(prev => ({ ...prev, social_links: newLinks })); 
    saveProfile({ social_links: newLinks }); 
  };

  const removeLink = (index) => { 
    const newLinks = (local.social_links || []).filter((_, idx) => idx !== index); 
    setLocal(prev => ({ ...prev, social_links: newLinks })); 
    saveProfile({ social_links: newLinks }); 
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const photoData = reader.result;
      setLocal(prev => ({ ...prev, photo: photoData }));
      saveProfilePhoto(photoData);
    };
    reader.readAsDataURL(file);
  };

  const handleDepartmentChange = (newDepartment) => {
    // Only generate faculty ID if it doesn't exist
    if (!local.faculty_id) {
      generateFacultyId(newDepartment);
    } else {
      setLocal(prev => ({ ...prev, department: newDepartment }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto"></div>
          <p className="mt-4 text-blue-900">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-[#132E6B] mb-4">My Profile</h1>
        
        {/* Success/Error Message */}
        {message && (
          <div className={`mb-4 p-3 rounded ${
            message.includes('Error') ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-green-100 text-green-700 border border-green-300'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Profile Photo Section */}
          <div className="col-span-1 bg-white shadow rounded-lg p-4 flex flex-col items-center">
            <img 
              src={local.photo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'} 
              alt="avatar" 
              className="w-32 h-32 rounded-full object-cover border mb-3" 
            />
            <h2 className="font-semibold text-lg">{local.full_name || 'Teacher'}</h2>
            <p className="text-sm text-gray-600">{local.designation || ''} — {local.department || ''}</p>
            
            {/* Faculty ID Display - Permanent */}
            <div className="mt-3 w-full text-center">
              <label className="block text-xs text-gray-500 mb-1">Faculty ID</label>
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-mono text-sm">
                {local.faculty_id || 'Not assigned'}
              </div>
              {/* Removed the "Regenerate ID" button */}
            </div>
            
            <div className="mt-3 w-full">
              <label className="block text-xs text-gray-500">Headline</label>
              <input 
                value={local.headline || ''} 
                onChange={(e) => setLocal(prev => ({ ...prev, headline: e.target.value }))} 
                onBlur={() => saveProfile({ headline: local.headline })} 
                className="w-full mt-1 border px-2 py-1 rounded text-sm" 
                placeholder="Short headline (e.g., PhD, Subject lead)" 
              />
            </div>
          </div>

          {/* Profile Details Section */}
          <div className="col-span-2 bg-white shadow rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600">Faculty ID</label>
                <div className="flex items-center gap-2">
                  <input 
                    value={local.faculty_id || ''} 
                    onChange={(e) => setLocal(prev => ({ ...prev, faculty_id: e.target.value }))} 
                    onBlur={() => saveProfile({ faculty_id: local.faculty_id })} 
                    className="w-full border px-2 py-1 rounded font-mono" 
                    placeholder="Auto-generated"
                    readOnly={!facultyIdEditable}
                  />
                  <button 
                    onClick={() => setFacultyIdEditable(!facultyIdEditable)}
                    className="text-blue-600 text-sm whitespace-nowrap"
                  >
                    {facultyIdEditable ? 'Lock' : 'Edit'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {facultyIdEditable ? 'You can manually edit the Faculty ID' : 'Permanent Faculty ID'}
                </p>
              </div>
              <div>
                <label className="block text-xs text-gray-600">Department</label>
                <select 
                  value={local.department || ''} 
                  onChange={(e) => handleDepartmentChange(e.target.value)} 
                  onBlur={() => saveProfile({ department: local.department })} 
                  className="w-full border px-2 py-1 rounded"
                >
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <label className="block text-xs text-gray-600">Full Name</label>
            <input 
              value={local.full_name || ''} 
              onChange={(e) => setLocal(prev => ({ ...prev, full_name: e.target.value }))} 
              onBlur={() => saveProfile({ full_name: local.full_name })} 
              className="w-full border px-2 py-1 rounded" 
            />

            <label className="block text-xs text-gray-600">Email</label>
            <input 
              value={local.email || ''} 
              onChange={(e) => setLocal(prev => ({ ...prev, email: e.target.value }))} 
              onBlur={() => saveProfile({ email: local.email })} 
              className="w-full border px-2 py-1 rounded" 
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600">Designation</label>
                <select 
                  value={local.designation || ''} 
                  onChange={(e) => setLocal(prev => ({ ...prev, designation: e.target.value }))} 
                  onBlur={() => saveProfile({ designation: local.designation })} 
                  className="w-full border px-2 py-1 rounded"
                >
                  <option>Assistant Professor</option>
                  <option>Associate Professor</option>
                  <option>Professor</option>
                  <option>Lecturer</option>
                </select>
              </div>
            </div>

            <label className="block text-xs text-gray-600">Gender</label>
            <div className="flex gap-3">
              {['Male', 'Female', 'Other'].map(g => (
                <label key={g} className="flex items-center">
                  <input 
                    type="radio" 
                    name="gender" 
                    checked={local.gender === g} 
                    onChange={() => { 
                      setLocal(prev => ({ ...prev, gender: g })); 
                      saveProfile({ gender: g }); 
                    }} 
                    className="mr-1"
                  /> 
                  <span>{g}</span>
                </label>
              ))}
            </div>

            <label className="block text-xs text-gray-600">Contact Number</label>
            <input 
              value={local.contact || ''} 
              onChange={(e) => setLocal(prev => ({ ...prev, contact: e.target.value }))} 
              onBlur={() => saveProfile({ contact: local.contact })} 
              className="w-full border px-2 py-1 rounded" 
            />

            <label className="block text-xs text-gray-600">Profile Photo</label>
            <div className="flex items-center gap-3">
              <img 
                src={local.photo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'} 
                alt="avatar" 
                className="w-16 h-16 rounded-full object-cover border" 
              />
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload}
                className="text-sm"
              />
            </div>

            <label className="block text-xs text-gray-600">LinkedIn</label>
            <input 
              value={local.linkedin || ''} 
              onChange={(e) => setLocal(prev => ({ ...prev, linkedin: e.target.value }))} 
              onBlur={() => saveProfile({ linkedin: local.linkedin })} 
              className="w-full border px-2 py-1 rounded" 
              placeholder="https://linkedin.com/in/yourid" 
            />

            <label className="block text-xs text-gray-600">Social Links</label>
            <div className="space-y-2">
              <AddLinkInline 
                items={local.social_links || []} 
                onAdd={addLink} 
                onRemove={removeLink} 
              />
            </div>

            <label className="block text-xs text-gray-600">Professional & Academic Details</label>
            <textarea 
              value={local.professional || ''} 
              onChange={(e) => setLocal(prev => ({ ...prev, professional: e.target.value }))} 
              onBlur={() => saveProfile({ professional: local.professional })} 
              className="w-full border px-2 py-1 rounded h-28" 
              placeholder="Education, experience, publications, achievements" 
            />

            <label className="block text-xs text-gray-600">About Me</label>
            <textarea 
              value={local.about_text || ''} 
              onChange={(e) => setLocal(prev => ({ ...prev, about_text: e.target.value }))} 
              onBlur={() => saveProfile({ about_text: local.about_text })} 
              className="w-full border px-2 py-1 rounded h-20" 
              placeholder="Tell us about yourself..." 
            />

            <div className="text-right">
              <button 
                onClick={() => saveProfile()} 
                disabled={saving}
                className="bg-blue-800 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// AddLinkInline component remains the same
function AddLinkInline({ items = [], onAdd, onRemove }){
  const [val, setVal] = useState('');
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input 
          value={val} 
          onChange={(e) => setVal(e.target.value)} 
          className="border px-2 py-1 rounded w-full text-sm" 
          placeholder="Add link (GitHub, personal site)" 
        />
        <button 
          onClick={() => { 
            if (!val) return; 
            onAdd(val.trim()); 
            setVal(''); 
          }} 
          className="bg-blue-800 text-white px-3 py-1 rounded text-sm"
        >
          Add
        </button>
      </div>
      <ul className="text-sm">
        {items.map((it, idx) => (
          <li key={idx} className="flex justify-between items-center">
            <a className="text-blue-700" href={it} target="_blank" rel="noreferrer">{it}</a>
            <button className="text-red-600 text-sm" onClick={() => onRemove(idx)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
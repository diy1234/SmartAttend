import React, { useState, useEffect } from 'react';
import { useUserContext } from '../context/UserContext';
import { useToast } from '../context/ToastContext';

const FacultyProfile = () => {
  const { user } = useUserContext();
  const { showToast } = useToast();
  const [profile, setProfile] = useState({
    faculty_id: '',
    full_name: '',
    email: '',
    department: '',
    designation: '',
    gender: '',
    contact_number: '',
    profile_photo: null
  });
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchProfile();
    fetchDepartments();
    fetchDesignations();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/faculty/profile?user_id=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      showToast('Error fetching profile', 'error');
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/faculty/departments');
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchDesignations = async () => {
    try {
      const response = await fetch('/api/faculty/designations');
      if (response.ok) {
        const data = await response.json();
        setDesignations(data);
      }
    } catch (error) {
      console.error('Error fetching designations:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    Object.keys(profile).forEach(key => {
      formData.append(key, profile[key]);
    });
    
    if (selectedFile) {
      formData.append('profile_photo', selectedFile);
    }
    
    try {
      const response = await fetch('/api/faculty/profile', {
        method: 'PUT',
        body: formData
      });
      
      if (response.ok) {
        showToast('Profile updated successfully', 'success');
        setIsEditing(false);
        fetchProfile();
      } else {
        showToast('Error updating profile', 'error');
      }
    } catch (error) {
      showToast('Error updating profile', 'error');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Faculty Profile</h1>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Photo */}
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 rounded-full overflow-hidden">
              <img
                src={profile.profile_photo || '/default-avatar.png'}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            {isEditing && (
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="text-sm"
              />
            )}
          </div>

          {/* Faculty ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Faculty ID</label>
            <input
              type="text"
              value={profile.faculty_id}
              disabled
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              name="full_name"
              value={profile.full_name}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              value={profile.email}
              disabled
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <select
              name="department"
              value={profile.department}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Designation */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Designation</label>
            <select
              name="designation"
              value={profile.designation}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            >
              <option value="">Select Designation</option>
              {designations.map(desig => (
                <option key={desig} value={desig}>{desig}</option>
              ))}
            </select>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <div className="mt-1 space-x-4">
              {['Male', 'Female', 'Other'].map(gender => (
                <label key={gender} className="inline-flex items-center">
                  <input
                    type="radio"
                    name="gender"
                    value={gender}
                    checked={profile.gender === gender}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="form-radio"
                  />
                  <span className="ml-2">{gender}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Contact Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Number</label>
            <input
              type="tel"
              name="contact_number"
              value={profile.contact_number}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              pattern="[0-9]{10}"
            />
          </div>

          {isEditing && (
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-green-500 text-white px-6 py-2 rounded"
              >
                Save Changes
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default FacultyProfile;
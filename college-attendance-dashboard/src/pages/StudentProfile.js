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
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/users/student-profile?student_id=${stored.id}`);
        setProfileData(response.data.profile);
        
        // Initialize form with profile data
        setForm({
          name: response.data.profile.name || '',
          phone: response.data.profile.phone || '',
          emergency_contact_name: response.data.profile.emergency_contact_name || '',
          emergency_contact_phone: response.data.profile.emergency_contact_phone || '',
          address: response.data.profile.address || '',
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

  const save = async () => {
    try {
      const response = await api.put(`/users/student-profile/${stored.id}`, form);
      
      if (response.data.success) {
        // Update local storage and context
        const updatedUser = { ...stored, ...form };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        if (setUser) setUser(updatedUser);
        
        setEditMode(false);
        showToast('Profile updated successfully', 'success', 3000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Error updating profile', 'error', 3000);
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

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-[#132E6B] mb-6">Student Profile</h2>

      {/* Profile content using profileData */}
      {/* ... rest of the component ... */}
    </div>
  );
}
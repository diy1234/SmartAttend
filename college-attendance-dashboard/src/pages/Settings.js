import React, { useState } from "react";

export default function Settings() {
  const [theme, setTheme] = useState("light");
  const [email, setEmail] = useState("admin@smartattend.com");
  const [notifications, setNotifications] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profilePic, setProfilePic] = useState(
    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
  );
  const [uploadEndpoint, setUploadEndpoint] = useState(()=> localStorage.getItem('uploadEndpoint') || '');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfilePic(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    alert("Settings saved successfully!");
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md p-6 mt-4">
      <h2 className="text-2xl font-semibold text-[#132E6B] mb-6">
        Admin Settings
      </h2>

      {/* Profile Picture Upload */}
      <div className="mb-8 flex flex-col items-center text-center">
        <img
          src={profilePic}
          alt="Profile"
          className="w-28 h-28 rounded-full border-4 border-[#132E6B] shadow-md mb-4"
        />
        <label className="cursor-pointer bg-[#132E6B] text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-900">
          Upload New Picture
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
        </label>
      </div>

      {/* Profile Info */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-700 mb-2">Email</h3>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring focus:ring-blue-200"
        />
      </div>

      {/* Password Section */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-700 mb-2">
          Change Password
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring focus:ring-blue-200"
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring focus:ring-blue-200"
          />
        </div>
      </div>

      {/* Notifications */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-700 mb-2">
          Notifications
        </h3>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={notifications}
            onChange={() => setNotifications(!notifications)}
            className="w-4 h-4 text-blue-600"
          />
          Enable email notifications
        </label>
      </div>

      {/* Theme Switch */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-700 mb-2">Theme</h3>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="bg-[#132E6B] text-white px-5 py-2 rounded-lg hover:bg-blue-900 transition"
      >
        Save Changes
      </button>
      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-700 mb-2">Upload Endpoint (optional)</h3>
        <input value={uploadEndpoint} onChange={(e)=>setUploadEndpoint(e.target.value)} placeholder="https://example.com/upload" className="w-full border p-2 rounded" />
        <div className="mt-2 flex gap-2">
          <button onClick={()=>{ localStorage.setItem('uploadEndpoint', uploadEndpoint); alert('Upload endpoint saved'); }} className="px-3 py-1 bg-blue-800 text-white rounded">Save Endpoint</button>
          <button onClick={()=>{ setUploadEndpoint(''); localStorage.removeItem('uploadEndpoint'); }} className="px-3 py-1 bg-gray-200 rounded">Clear</button>
        </div>
      </div>
    </div>
  );
}

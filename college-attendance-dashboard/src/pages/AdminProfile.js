import React, { useState, useEffect, useContext } from "react";
import UserContext from "../context/UserContext";

function AdminProfile() {
  const { user: ctxUser, setUser: setCtxUser } = useContext(UserContext);
  const [user, setUser] = useState(
    ctxUser || {
      name: "John Doe",
      email: "admin@smartattend.com",
      phone: "+91 9876543210",
      joined: "January 2023",
      photo: "",
    }
  );
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    // Keep local state in sync with context/localStorage
    if (ctxUser) setUser(ctxUser);
    else {
      const storedUser = localStorage.getItem("user");
      if (storedUser) setUser(JSON.parse(storedUser));
    }
  }, [ctxUser]);

  const handleEditToggle = () => setEditMode(!editMode);

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      setUser({ ...user, photo: reader.result });
    };
    if (file) reader.readAsDataURL(file);
  };

  const handleSave = () => {
    localStorage.setItem("user", JSON.stringify(user));
    // update context so Navbar updates immediately
    if (setCtxUser) setCtxUser(user);
    setEditMode(false);
    alert("Profile updated successfully!");
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-blue-700 mb-6 flex items-center gap-2">
        👤 Admin Profile
      </h1>

      <div className="bg-white rounded-xl shadow-md p-6 w-full max-w-2xl mx-auto">
        {/* Profile Image */}
        <div className="flex flex-col items-center mb-4">
          <img
            src={
              user.photo ||
              "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
            }
            alt="Profile"
            className="w-28 h-28 rounded-full object-cover mb-3 border-2 border-blue-600"
          />
          {editMode && (
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="text-sm text-gray-600"
            />
          )}
        </div>

        {/* Profile Info */}
        <div className="space-y-4">
          <div>
            <label className="font-semibold">Name:</label>
            {editMode ? (
              <input
                type="text"
                name="name"
                value={user.name}
                onChange={handleChange}
                className="border p-2 w-full rounded"
              />
            ) : (
              <p>{user.name}</p>
            )}
          </div>

          <div>
            <label className="font-semibold">Email:</label>
            {editMode ? (
              <input
                type="email"
                name="email"
                value={user.email}
                onChange={handleChange}
                className="border p-2 w-full rounded"
              />
            ) : (
              <p>{user.email}</p>
            )}
          </div>

          <div>
            <label className="font-semibold">Phone:</label>
            {editMode ? (
              <input
                type="text"
                name="phone"
                value={user.phone}
                onChange={handleChange}
                className="border p-2 w-full rounded"
              />
            ) : (
              <p>{user.phone}</p>
            )}
          </div>

          <div>
            <label className="font-semibold">Joined:</label>
            <p>{user.joined}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="text-right mt-6">
          {editMode ? (
            <button
              onClick={handleSave}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            >
              Save Changes
            </button>
          ) : (
            <button
              onClick={handleEditToggle}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminProfile;

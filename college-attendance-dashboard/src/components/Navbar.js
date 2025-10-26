import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaBell } from "react-icons/fa";
import UserContext from "../context/UserContext";
import Logo from './Logo';

const Navbar = () => {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("notifications")) || [
      "Welcome Admin! System running smoothly.",
      "New student registered in MCA.",
      "Attendance updated for BCA batch.",
    ];
    setNotifications(stored);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    // If a suggestion is active, use that
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      navigate(suggestions[activeIndex].path);
      setSearch("");
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    // fallback: try to match the term against known pages
    const term = search.trim().toLowerCase();
    const fallback = pages.find((p) => p.keywords.some((k) => k.includes(term)) || p.label.toLowerCase().includes(term));
    if (fallback) {
      navigate(fallback.path);
      setSearch("");
      setSuggestions([]);
      setActiveIndex(-1);
    } else {
      alert("No matching page found!");
    }
  };

  const pages = [
    { label: "Dashboard", path: "/dashboard", keywords: ["dashboard", "home"] },
    { label: "Admin Profile", path: "/admin-profile", keywords: ["profile", "admin"] },
    { label: "Admins", path: "/admins", keywords: ["admins", "administrators"] },
    { label: "Students", path: "/students", keywords: ["students", "student"] },
    { label: "Teachers", path: "/teachers", keywords: ["teachers", "teacher"] },
    { label: "Settings", path: "/settings", keywords: ["settings", "preferences"] },
    { label: "About", path: "/about", keywords: ["about"] },
    { label: "Contact", path: "/contact", keywords: ["contact"] },
  ];

  // Load entity lists (students/teachers) from localStorage or use small samples
  const studentsList = JSON.parse(localStorage.getItem("students")) || [
    { id: 1, name: "Alice Johnson" },
    { id: 2, name: "Bob Kumar" },
    { id: 3, name: "Carlos M" },
  ];
  const teachersList = JSON.parse(localStorage.getItem("teachers")) || [
    { id: 1, name: "Prof. Smith" },
    { id: 2, name: "Dr. Radha" },
  ];

  const updateSuggestions = (value) => {
    const term = value.trim().toLowerCase();
    if (!term) {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }
    const pageMatches = pages.filter((p) => p.label.toLowerCase().includes(term) || p.keywords.some((k) => k.includes(term)));
    const studentMatches = studentsList.filter((s) => s.name.toLowerCase().includes(term)).slice(0, 4).map((s) => ({ label: `Student: ${s.name}`, path: `/students?search=${encodeURIComponent(s.name)}` }));
    const teacherMatches = teachersList.filter((t) => t.name.toLowerCase().includes(term)).slice(0, 4).map((t) => ({ label: `Teacher: ${t.name}`, path: `/teachers?search=${encodeURIComponent(t.name)}` }));

    const matched = [...pageMatches, ...studentMatches, ...teacherMatches].slice(0, 8);
    setSuggestions(matched);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      // form submit will handle navigation
    } else if (e.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("notifications");
    navigate("/login");
    window.location.reload();
  };

  return (
    <nav className="flex items-center justify-between bg-white shadow-md px-6 py-3 sticky top-0 z-50">
      {/* Left: Logo */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => {
          // navigate to dashboard based on role
          const role = user?.role || JSON.parse(localStorage.getItem('user'))?.role;
          if (role === 'student') navigate('/student-dashboard');
          else if (role === 'teacher') navigate('/teacher-dashboard');
          else navigate('/admin-dashboard');
        }}
      >
        {/* inline SVG logo component */}
  <Logo className="w-14 h-14" />
        <h1 className="text-xl font-bold text-[#132E6B]">SMARTATTEND</h1>
      </div>

      {/* Center: Search + About/Contact */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <form
            onSubmit={handleSearch}
            className="flex items-center bg-gray-100 px-3 py-1 rounded-full w-60"
          >
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                updateSuggestions(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              className="bg-transparent outline-none text-sm w-full px-2"
            />
            <button
              type="submit"
              className="bg-[#132E6B] text-white text-xs px-3 py-1 rounded-full hover:bg-blue-900"
            >
              Go
            </button>
          </form>

          {suggestions.length > 0 && (
            <ul className="absolute left-0 mt-2 w-60 bg-white border border-gray-200 rounded shadow z-50 max-h-52 overflow-y-auto">
              {suggestions.map((s, idx) => (
                <li
                  key={s.path}
                  onMouseDown={(ev) => {
                    // onMouseDown prevents blur before click
                    ev.preventDefault();
                    navigate(s.path);
                    setSearch("");
                    setSuggestions([]);
                    setActiveIndex(-1);
                  }}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${idx === activeIndex ? 'bg-gray-100' : ''}`}
                >
                  {s.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link to="/about" className="text-gray-700 hover:text-[#132E6B] font-medium">
          About
        </Link>
        <Link to="/contact" className="text-gray-700 hover:text-[#132E6B] font-medium">
          Contact
        </Link>
      </div>

      {/* Right: Notifications + Profile + Logout */}
  <div className="flex items-center gap-4 relative">
        {/* Quick links for teachers */}
        {user?.role === 'teacher' && (
          <div className="mr-3">
            <Link to="/teacher-face" className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700">Mark Attendance</Link>
          </div>
        )}
        <div className="relative">
          <FaBell
            size={18}
            className="cursor-pointer text-gray-700 hover:text-[#132E6B]"
            title="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
          />
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
              <h4 className="font-semibold text-[#132E6B] mb-2 text-sm">Notifications</h4>
              {notifications.length > 0 ? (
                <ul className="text-gray-700 text-sm space-y-2 max-h-48 overflow-y-auto">
                  {notifications.map((note, index) => (
                    <li key={index} className="border-b last:border-none pb-1 hover:bg-gray-50 rounded-md px-2">
                      {note}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">No notifications yet</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Link to={user?.role === 'student' ? '/student-profile' : user?.role === 'teacher' ? '/teacher-about' : '/admin-profile'} className="flex items-center">
              <img
                src={
                  (user && user.photo) ||
                  "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                }
                alt="avatar"
                className="w-8 h-8 rounded-full object-cover border"
                title="Admin Profile"
              />
            </Link>

            {/* camera overlay */}
            <label
              title="Change avatar"
              className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border cursor-pointer"
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const updated = { ...(user || {}), photo: reader.result };
                    localStorage.setItem("user", JSON.stringify(updated));
                    setUser(updated);
                  };
                  if (file) reader.readAsDataURL(file);
                }}
                className="absolute inset-0 w-5 h-5 opacity-0 cursor-pointer"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="w-4 h-4 text-gray-700"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7h3l2-3h6l2 3h3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                <circle cx="12" cy="13" r="3" strokeWidth="1.5" />
              </svg>
            </label>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="border border-red-600 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-600 hover:text-white"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;

import React, { useState, useEffect } from "react";
import Logo from '../components/Logo';
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // If there's a stored user with extra fields (like photo) we want to preserve them on login
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.email) setEmail(parsed.email);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const validateForm = () => {
    if (!email) return "Email is required";
    if (!/\S+@\S+\.\S+/.test(email)) return "Please enter a valid email address";
    if (!password) return "Password is required";
    if (password.length < 6)
      return "Password must be at least 6 characters long";
    return "";
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  const validationError = validateForm();
  if (validationError) {
    setError(validationError);
    return;
  }

  try {
    const response = await fetch('http://127.0.0.1:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
        role: role
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
      
      if (data.user.role === "admin") navigate("/admin-dashboard");
      else if (data.user.role === "teacher") navigate("/teacher-dashboard");
      else navigate("/student-dashboard");
    } else {
      setError(data.error);
    }
  } catch (error) {
    setError('Network error. Please try again.');
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300">
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md"
      >
        {/* Website Name */}
        <div className="flex items-center justify-center gap-3 mb-2">
            <a href="/" className="inline-flex items-center">
            <Logo className="w-16 h-16" />
          </a>
          <h1 className="text-4xl font-extrabold text-center text-[#132E6B] tracking-wide">SmartAttend</h1>
        </div>
        <p className="text-center text-gray-500 mb-8">Smart Attendance System</p>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-[#132E6B] mb-6">
          Welcome Back 👋
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-700 font-medium mb-1">Login as</label>
            <div className="flex gap-3 items-center">
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="role" value="admin" checked={role === 'admin'} onChange={() => setRole('admin')} />
                <span className="text-sm">Admin</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="role" value="teacher" checked={role === 'teacher'} onChange={() => setRole('teacher')} />
                <span className="text-sm">Teacher</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="role" value="student" checked={role === 'student'} onChange={() => setRole('student')} />
                <span className="text-sm">Student</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#132E6B] outline-none transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#132E6B] outline-none transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-sm text-center font-medium"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            className="w-full bg-[#132E6B] text-white py-3 rounded-lg font-semibold text-lg hover:bg-blue-900 transition duration-300 shadow-md"
          >
            Login
          </button>
        </form>

        {/* Links */}
        <div className="text-center mt-4">
          <Link
            to="/forgot-password"
            className="text-[#132E6B] hover:underline font-medium"
          >
            Forgot Password?
          </Link>
        </div>

        <p className="text-center text-gray-600 text-sm mt-4">
          Don’t have an account?{" "}
          <Link
            to="/signup"
            className="text-[#132E6B] font-semibold hover:underline"
          >
            Sign Up
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;

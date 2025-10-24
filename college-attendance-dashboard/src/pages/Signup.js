import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const Signup = ({ onSignup }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student" // Added default role
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!formData.name) errs.name = "Name is required";
    if (!formData.email) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      errs.email = "Invalid email format";
    if (!formData.password) errs.password = "Password is required";
    else if (formData.password.length < 6)
      errs.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword)
      errs.confirmPassword = "Passwords do not match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const res = await fetch("/api/auth/signup", {  // Changed to relative path
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role || "student",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");

      alert("Signup successful!");
      navigate("/login");
    } catch (err) {
      setErrors({ general: err.message });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300 p-6">
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md"
      >
        <h2 className="text-3xl font-bold text-[#132E6B] mb-6 text-center">
          Create Account ✨
        </h2>
        
        {errors.general && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-500 text-sm text-center font-medium mb-4"
          >
            {errors.general}
          </motion.p>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-700 font-medium mb-1">Sign up as</label>
            <div className="flex gap-3 items-center">
              <label className="inline-flex items-center gap-2">
                <input 
                  type="radio" 
                  name="role" 
                  value="teacher" 
                  checked={formData.role === 'teacher'} 
                  onChange={() => setFormData({...formData, role: 'teacher'})} 
                />
                <span className="text-sm">Teacher</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input 
                  type="radio" 
                  name="role" 
                  value="student" 
                  checked={!formData.role || formData.role === 'student'} 
                  onChange={() => setFormData({...formData, role: 'student'})} 
                />
                <span className="text-sm">Student</span>
              </label>
            </div>
          </div>
          
          <div>
            <label className="block font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#132E6B] outline-none"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#132E6B] outline-none"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter a password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#132E6B] outline-none"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#132E6B] outline-none"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-[#132E6B] text-white py-2 rounded-lg hover:bg-blue-900 transition font-medium"
          >
            Sign Up
          </button>
        </form>

        <p className="text-center text-gray-700 text-sm mt-4">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-[#132E6B] font-semibold hover:underline"
          >
            Login
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;
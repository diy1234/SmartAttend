// src/pages/ForgotPassword.js (Updated version)
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const validateEmail = (email) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email) {
      setError("Email is required");
      return;
    } else if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess(true);
        setEmail("");
      } else {
        setError(data.error || "Failed to send reset email");
      }
    } catch (error) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
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
        <h2 className="text-3xl font-bold text-[#132E6B] mb-4 text-center">
          Forgot Password 🔐
        </h2>
        <p className="text-gray-600 text-sm mb-6 text-center">
          Enter your registered email and we'll send you a password reset link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#132E6B] outline-none"
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#132E6B] text-white py-2 rounded-lg hover:bg-blue-900 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending Reset Link..." : "Send Reset Link"}
          </button>
        </form>

        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-4"
          >
            <p className="text-green-600 font-medium">
              ✅ If the email exists in our system, a reset link has been sent.
            </p>
            <p className="text-gray-600 text-sm mt-2">
              Check your email (or Flask console in dev). Click the link to reset your password.
            </p>
          </motion.div>
        )}

        <p className="text-center text-gray-700 text-sm mt-6">
          Remembered your password?{" "}
          <Link
            to="/login"
            className="text-[#132E6B] font-semibold hover:underline"
          >
            Back to Login
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
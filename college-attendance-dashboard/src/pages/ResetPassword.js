// src/pages/ResetPassword.js
import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setTokenValid(false);
        return;
      }
      try {
        setLoadingVerify(true);
        const res = await fetch('http://localhost:5000/api/auth/verify-reset-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (data.valid) {
          setTokenValid(true);
          setUserEmail(data.email || "");
        } else {
          setTokenValid(false);
        }
      } catch (e) {
        setTokenValid(false);
      } finally {
        setLoadingVerify(false);
      }
    };
    verify();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!formData.newPassword || !formData.confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, new_password: formData.newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => { navigate("/login"); }, 3000);
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (error) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // While loading during form submission we'll show the button spinner state

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300 p-6">
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md"
      >
        <h2 className="text-3xl font-bold text-[#132E6B] mb-4 text-center">
          Reset Password 🔑
        </h2>
        
        {loadingVerify ? (
          <p className="text-gray-600 text-sm mb-6 text-center">Verifying link...</p>
        ) : tokenValid === false ? (
          <div className="text-center mb-4">
            <p className="text-red-500 font-semibold">Invalid or expired reset link.</p>
            <Link to="/forgot-password" className="text-sm text-blue-600">Request a new link</Link>
          </div>
        ) : (
          userEmail && (
            <p className="text-gray-600 text-sm mb-6 text-center bg-blue-50 p-3 rounded-lg">
              Resetting password for: <strong>{userEmail}</strong>
            </p>
          )
        )}

        <p className="text-gray-600 text-sm mb-6 text-center">
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              name="newPassword"
              placeholder="Enter new password"
              value={formData.newPassword}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#132E6B] outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm new password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#132E6B] outline-none"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-sm text-center"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#132E6B] text-white py-2 rounded-lg hover:bg-blue-900 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Resetting Password..." : "Reset Password"}
          </button>
        </form>

        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-4"
          >
            <p className="text-green-600 font-medium mb-2">
              ✅ Password reset successfully!
            </p>
            <p className="text-gray-600 text-sm">
              Redirecting to login page...
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

export default ResetPassword;
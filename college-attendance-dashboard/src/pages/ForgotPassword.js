import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [step, setStep] = useState(1); // 1: email, 2: code, 3: success
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email) {
      setError("Email is required");
      return;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
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
        setStep(2); // Move to code verification step
        // Inform the user that the code was emailed instead of pointing to the server console
        window.alert('A verification code was sent to your email. Please check your inbox and spam folder.');
      } else {
        setError(data.error || "Failed to send verification code");
      }
    } catch (error) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeVerification = async (e) => {
    e.preventDefault();
    setError("");

    if (!verificationCode) {
      setError("Verification code is required");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email,
          code: verificationCode 
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setStep(3); // Move to password reset step
        setError("");
      } else {
        setError(data.error || "Invalid verification code");
      }
    } catch (error) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (newPassword) => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email,
          new_password: newPassword 
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess(true);
        setStep(4); // Success step
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (error) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center auth-hero p-6">
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="auth-card p-8 w-full max-w-md"
      >
        <h2 className="text-3xl font-bold text-[#132E6B] mb-4 text-center">
          {step === 1 && "Forgot Password 🔐"}
          {step === 2 && "Verify Code 🔢"}
          {step === 3 && "Reset Password 🔑"}
          {step === 4 && "Success! ✅"}
        </h2>

        {/* Step 1: Email Input */}
        {step === 1 && (
          <>
            <p className="text-gray-600 text-sm mb-6 text-center">
              Enter your registered email to receive a verification code
            </p>
            <form onSubmit={handleEmailSubmit} className="space-y-5">
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
                  disabled={loading}
                />
              </div>

              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#132E6B] text-white py-2 rounded-lg hover:bg-blue-900 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending Code..." : "Send Verification Code"}
              </button>
            </form>
          </>
        )}

        {/* Step 2: Code Verification */}
        {step === 2 && (
          <>
            <p className="text-gray-600 text-sm mb-6 text-center">
              Enter the 6-digit code sent to your email
            </p>
            <form onSubmit={handleCodeVerification} className="space-y-5">
              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#132E6B] outline-none text-center text-lg font-mono"
                  disabled={loading}
                  maxLength="6"
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Check your email (and spam folder) for the 6-digit code
                </p>
              </div>

              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#132E6B] text-white py-2 rounded-lg hover:bg-blue-900 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Verifying..." : "Verify Code"}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition font-medium"
              >
                Back to Email
              </button>
            </form>
          </>
        )}

        {/* Step 3: Password Reset */}
        {step === 3 && (
          <PasswordResetForm 
            onSubmit={handlePasswordReset}
            loading={loading}
            error={error}
            onBack={() => setStep(2)}
          />
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="text-center">
            <div className="text-green-600 text-6xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-green-700 mb-2">
              Password Reset Successful!
            </h3>
            <p className="text-gray-600 mb-6">
              Your password has been reset successfully. You can now login with your new password.
            </p>
            <Link
              to="/login"
              className="bg-[#132E6B] text-white py-2 px-6 rounded-lg hover:bg-blue-900 transition font-medium inline-block"
            >
              Go to Login
            </Link>
          </div>
        )}

        {step < 4 && (
          <p className="text-center text-gray-700 text-sm mt-6">
            Remembered your password?{" "}
            <Link
              to="/login"
              className="text-[#132E6B] font-semibold hover:underline"
            >
              Back to Login
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
};

// Separate component for password reset form
const PasswordResetForm = ({ onSubmit, loading, error, onBack }) => {
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.password || !formData.confirmPassword) {
      alert("Please fill in all fields");
      return;
    }

    if (formData.password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    onSubmit(formData.password);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <>
      <p className="text-gray-600 text-sm mb-6 text-center">
        Enter your new password
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block font-medium text-gray-700 mb-1">
            New Password
          </label>
          <input
            type="password"
            name="password"
            placeholder="Enter new password"
            value={formData.password}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#132E6B] outline-none"
            disabled={loading}
            minLength="6"
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm new password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#132E6B] outline-none"
            disabled={loading}
          />
        </div>

        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#132E6B] text-white py-2 rounded-lg hover:bg-blue-900 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Resetting Password..." : "Reset Password"}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition font-medium"
        >
          Back to Code Verification
        </button>
      </form>
    </>
  );
};

export default ForgotPassword;
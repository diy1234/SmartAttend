// src/pages/Contact.js
import React, { useState, useEffect, useContext } from "react";
import UserContext from "../context/UserContext";
import ToastContext from "../context/ToastContext";

const Contact = () => {
  const { user } = useContext(UserContext);
  const { showToast } = useContext(ToastContext);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Prefill name/email from logged-in user if available
  useEffect(() => {
    const storedUser = user || JSON.parse(localStorage.getItem("user") || "{}");
    setFormData((prev) => ({
      ...prev,
      name: storedUser?.name || prev.name || "",
      email: storedUser?.email || prev.email || "",
    }));
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.message) {
      showToast("Please fill all fields before submitting!", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/contact/submit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      setSubmitted(true);
      showToast("Message sent successfully!", "success");

      // Clear only the message so name/email stay for convenience
      setFormData((prev) => ({
        ...prev,
        message: "",
      }));
    } catch (error) {
      console.error("Error sending contact form:", error);
      showToast(
        error.message || "Something went wrong while sending your message.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-8">
      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-lg w-full">
        <h1 className="text-3xl font-bold text-[#132E6B] mb-6 text-center">
          Contact Us
        </h1>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              name="name"
              placeholder="Your Name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#132E6B] outline-none"
            />
            <input
              type="email"
              name="email"
              placeholder="Your Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#132E6B] outline-none"
            />
            <textarea
              name="message"
              placeholder="Your Message"
              rows="5"
              value={formData.message}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#132E6B] outline-none"
            ></textarea>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#132E6B] text-white py-2 rounded-lg hover:bg-blue-900 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Sending..." : "Send Message"}
            </button>
          </form>
        ) : (
          <p className="text-green-600 text-center text-lg">
            ✅ Thank you for contacting us! We’ll get back to you soon.
          </p>
        )}
      </div>
    </div>
  );
};

export default Contact;

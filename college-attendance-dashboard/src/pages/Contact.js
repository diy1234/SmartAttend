import React, { useState } from "react";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      alert("Please fill all fields before submitting!");
      return;
    }
    setSubmitted(true);
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
              className="w-full bg-[#132E6B] text-white py-2 rounded-lg hover:bg-blue-900 transition"
            >
              Send Message
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

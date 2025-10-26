import React from "react";
import Logo from '../components/Logo';

const About = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 flex items-center justify-center p-8">
      <div className="max-w-3xl bg-white p-10 rounded-2xl shadow-xl text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <a href="/" className="inline-flex items-center">
            <Logo className="w-16 h-16" />
          </a>
          <h1 className="text-3xl font-bold text-[#132E6B]">About SmartAttend</h1>
        </div>
        <p className="text-gray-600 text-lg leading-relaxed">
          SmartAttend is a modern web-based attendance management system designed
          for educational institutions. It helps administrators and teachers track
          student attendance efficiently with real-time insights and analytics.
        </p>
        <p className="text-gray-600 text-lg mt-4">
          Built with React.js and Tailwind CSS, it ensures speed, simplicity,
          and user-friendly interaction for both students and staff. Our goal is
          to eliminate manual paperwork and bring digital accuracy to attendance
          tracking.
        </p>
      </div>
    </div>
  );
};

export default About;

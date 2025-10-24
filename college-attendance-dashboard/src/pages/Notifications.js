import React from "react";

const Notifications = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-[#132E6B] mb-4">Notifications</h2>
      <div className="bg-white p-4 rounded-lg shadow">
        <ul className="space-y-2">
          <li className="border-b pb-2">📢 Attendance report generated for MCA Batch A</li>
          <li className="border-b pb-2">👩‍🏫 New teacher profile added: Mr. Rajesh Kumar</li>
          <li className="border-b pb-2">📅 Timetable updated for MBA Semester 2</li>
          <li>⚙️ System maintenance scheduled for 20 Oct 2025</li>
        </ul>
      </div>
    </div>
  );
};

export default Notifications;

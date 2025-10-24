// src/components/WeeklySchedule.js
import React from "react";

const WeeklySchedule = () => {
  const schedule = [
    { day: "Monday", subject: "CS301 - Data Structures", time: "10 AM" },
    { day: "Tuesday", subject: "CS405 - Algorithms", time: "9 AM" },
    { day: "Wednesday", subject: "CS501 - OS", time: "11 AM" },
    { day: "Thursday", subject: "CS301 - Data Structures", time: "10 AM" },
    { day: "Friday", subject: "CS405 - Algorithms", time: "9 AM" },
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-xl font-semibold text-[#132E6B] mb-4">
        📅 Weekly Schedule
      </h2>
      <ul className="space-y-2">
        {schedule.map((item, index) => (
          <li
            key={index}
            className="flex justify-between items-center bg-blue-50 p-3 rounded-md hover:bg-blue-100 transition"
          >
            <span className="font-medium text-gray-700">{item.day}</span>
            <span className="text-sm text-[#132E6B]">
              {item.subject} - {item.time}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WeeklySchedule;

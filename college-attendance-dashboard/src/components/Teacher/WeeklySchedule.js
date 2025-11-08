// src/components/Teacher/WeeklySchedule.js
import React, { useContext } from "react";
import DataContext from '../../context/DataContext';
import UserContext from '../../context/UserContext';

// Displays the weekly schedule for the logged-in teacher.
// It reads schedule entries from DataContext (which admins can manage in ManageDepartments)
// and shows start and end times separately (parsed from the stored `time` field like "08:30 - 09:10").
const WeeklySchedule = () => {
  const { getWeeklyScheduleForTeacher } = useContext(DataContext);
  const { user } = useContext(UserContext);

  const teacherEmail = user?.email;
  const schedule = teacherEmail ? (getWeeklyScheduleForTeacher(teacherEmail) || []) : [];

  const parseTime = (timeStr) => {
    if(!timeStr) return { start: '-', end: '-' };
    // expected format: "HH:MM - HH:MM" (ManageDepartments uses this format), but be tolerant
    const parts = timeStr.split('-').map(p => p.trim());
    if(parts.length === 2) return { start: parts[0], end: parts[1] };
    return { start: timeStr, end: '' };
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-xl md:text-2xl font-semibold text-[#132E6B] mb-4">📅 Weekly Schedule</h2>

      {(!schedule || schedule.length === 0) ? (
        <p className="text-gray-600">No weekly schedule assigned. Contact admin.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {schedule.map((item) => {
            const { start, end } = parseTime(item.time);
            return (
              <div key={item.id} className="flex items-center gap-3 bg-gradient-to-br from-white to-blue-50 p-3 md:p-4 rounded-lg border border-gray-100 shadow-sm">
                <div className="flex-shrink-0 w-20 md:w-24 text-center">
                  <div className="bg-blue-800 text-white rounded-md px-2 py-2 font-semibold text-sm md:text-base">{item.day}</div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm md:text-base font-semibold text-gray-800 truncate">{item.subject}</div>
                  <div className="text-xs md:text-sm text-gray-500 truncate">{item.dept}</div>
                </div>

                <div className="flex flex-col items-end gap-1 w-28 md:w-32">
                  <div className="text-xs text-gray-500">Start</div>
                  <div className="text-sm font-medium text-[#132E6B]">{start}</div>
                  <div className="text-xs text-gray-500">End</div>
                  <div className="text-sm font-medium text-[#132E6B]">{end || '-'}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WeeklySchedule;

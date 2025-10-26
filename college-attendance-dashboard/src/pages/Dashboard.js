import React from "react";
import AttendanceOverviewClean from "./AttendanceOverviewClean";

function Dashboard() {
  // Render the Attendance Overview content inside Dashboard
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <AttendanceOverviewClean />
    </div>
  );
}

export default Dashboard;

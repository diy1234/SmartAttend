import React, { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard, BookOpen } from "lucide-react";
import UserContext from "../context/UserContext";
import DataContext from '../context/DataContext';
// slugify removed - not used in sidebar

const Sidebar = () => {
  // simplified sidebar: department toggle not needed for teacher view
  const { user, setUser } = useContext(UserContext);

  const dashboardPath = user?.role === 'teacher' ? '/teacher-dashboard' : user?.role === 'student' ? '/student-dashboard' : '/admin-dashboard';
  const { leaveRequests, departments } = useContext(DataContext);
  const pendingCount = (leaveRequests || []).filter(r => r.status === 'pending').length;

  

  // department list is available from DataContext when needed elsewhere

  return (
    <aside className="w-64 bg-[#132E6B] text-white p-4 flex flex-col fixed top-0 left-0 h-screen overflow-hidden">
      <h2 className="text-xl font-bold mb-8 text-center">SMARTATTEND</h2>
      {/** Show role badge */}
      {user && (
        <div className="text-sm text-gray-200 mb-4 text-center">Logged in as: {user.role}</div>
      )}

      <ul className="space-y-4">
        {/* Dashboard */}
        <li className="flex items-center space-x-2 hover:text-blue-300">
          <LayoutDashboard size={18} />
          <Link to={dashboardPath}>Dashboard</Link>
        </li>

        {user?.role === 'teacher' ? (
          <>
            {/* Put My Profile at top for easier access */}
            <li className="flex items-center space-x-2 hover:text-blue-300">
              <BookOpen size={18} />
              <Link to="/teacher-about">My Profile</Link>
            </li>
            <li className="flex items-center space-x-2 hover:text-blue-300">
              <BookOpen size={18} />
              <Link to="/attendance-requests">Attendance Requests ({pendingCount})</Link>
            </li>
            <li className="flex items-center space-x-2 hover:text-blue-300">
              <BookOpen size={18} />
              <Link to="/attendance-analytics">Attendance Analytics</Link>
            </li>
            <li className="flex items-center space-x-2 hover:text-blue-300 cursor-pointer" onClick={()=>{ setUser(null); localStorage.removeItem('user'); }}>
              <BookOpen size={18} />
              <span>Log out</span>
            </li>
          </>
        ) : user?.role === 'admin' ? (
          <>
            {/* Admin: expose Attendance Requests and overview */}
              <li className="flex items-center space-x-2 hover:text-blue-300">
                <BookOpen size={18} />
                <Link to="/attendance-requests">Attendance Requests ({pendingCount})</Link>
              </li>
            <li className="flex items-center space-x-2 hover:text-blue-300">
              <BookOpen size={18} />
              <Link to="/attendance-history">Attendance History</Link>
            </li>
            <li className="flex items-center space-x-2 hover:text-blue-300">
              <BookOpen size={18} />
              <Link to="/manage-departments">Manage Departments & Subjects</Link>
            </li>
          </>
        ) : (
          <>
            {/* Student view: put My Profile near the top, remove Mark Attendance (Face) link, add My Requests */}
            <li className="flex items-center space-x-2 hover:text-blue-300">
              <BookOpen size={18} />
              <Link to="/student-about">My Profile</Link>
            </li>
            <li className="flex items-center space-x-2 hover:text-blue-300">
              <BookOpen size={18} />
              <Link to="/attendance-history">Attendance History</Link>
            </li>

            <li className="flex items-center space-x-2 hover:text-blue-300">
              <BookOpen size={18} />
              <Link to="/student-report">Subject-wise Report</Link>
            </li>

            <li className="flex items-center space-x-2 hover:text-blue-300">
              <BookOpen size={18} />
              <Link to="/my-requests">My Attendance Requests</Link>
            </li>

            {/* Quick link to main student dashboard removed (duplicate) */}
          </>
        )}
      </ul>
    </aside>
  );
};

export default Sidebar;

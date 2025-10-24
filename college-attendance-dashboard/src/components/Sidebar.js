import React, { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import UserContext from "../context/UserContext";
import DataContext from '../context/DataContext';
import slugify from '../utils/slugify';

const Sidebar = () => {
  // simplified sidebar: department toggle not needed for teacher view
  const { user, setUser } = useContext(UserContext);

  const dashboardPath = user?.role === 'teacher' ? '/teacher-dashboard' : user?.role === 'student' ? '/student-dashboard' : '/admin-dashboard';
  const { leaveRequests } = useContext(DataContext);
  const pendingCount = (leaveRequests || []).filter(r => r.status === 'pending').length;

  const [openDept, setOpenDept] = useState(null);
  const toggleDept = (dept) => setOpenDept(openDept === dept ? null : dept);

  const { departments } = useContext(DataContext);

  return (
    <aside className="w-64 bg-[#132E6B] text-white p-4 flex flex-col">
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
            <li className="flex items-center space-x-2 hover:text-blue-300">
              <BookOpen size={18} />
              <Link to="/attendance-requests">Leave Requests ({pendingCount})</Link>
            </li>
            <li className="flex items-center space-x-2 hover:text-blue-300">
              <BookOpen size={18} />
              <Link to="/apply-leave">Apply for Leave</Link>
            </li>
            <li className="flex items-center space-x-2 hover:text-blue-300 cursor-pointer" onClick={()=>{ setUser(null); localStorage.removeItem('user'); }}>
              <BookOpen size={18} />
              <span>Log out</span>
            </li>
          </>
        ) : user?.role === 'admin' ? (
          <>
            {/* Admin: show departments */}
            <li className="flex items-center space-x-2 hover:text-blue-300">
              <BookOpen size={18} />
              <Link to="/attendance-overview">Attendance Overview</Link>
            </li>
            <h3 className="text-sm font-semibold uppercase text-gray-300 mt-6 mb-2">Departments</h3>
            {departments.map(d => (
              <li key={d.name}>
                <div onClick={() => toggleDept(d.name)} className="flex justify-between items-center cursor-pointer hover:text-blue-300">
                  <div className="flex items-center space-x-2">
                    <BookOpen size={18} />
                    <span>{d.name}</span>
                    <span className="ml-2 bg-blue-700 text-white text-xs px-2 py-0.5 rounded">{(d.subjects || []).length}</span>
                  </div>
                  {openDept === d.name ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
                {openDept === d.name && (
                  <ul className="ml-6 mt-2 space-y-2 text-sm">
                    {d.subjects.map(s => (
                      <li key={s}><Link to={`/departments/${slugify(d.name)}/${slugify(s)}`} className="hover:text-blue-300">{s}</Link></li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </>
        ) : (
          <>
            {/* Attendance Overview for other roles */}
            <li className="flex items-center space-x-2 hover:text-blue-300">
              <BookOpen size={18} />
              <Link to="/attendance-overview">Attendance Overview</Link>
            </li>
          </>
        )}
      </ul>
    </aside>
  );
};

export default Sidebar;

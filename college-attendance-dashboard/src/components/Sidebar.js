import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

  const navigate = useNavigate();
  const [showAttendanceFilters, setShowAttendanceFilters] = useState(false);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterSubject, setFilterSubject] = useState('');

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
              <Link to="/apply-leave">Attendance Request</Link>
            </li>
            <li className="flex items-center space-x-2 hover:text-blue-300 cursor-pointer" onClick={()=>{ setUser(null); localStorage.removeItem('user'); }}>
              <BookOpen size={18} />
              <span>Log out</span>
            </li>
          </>
        ) : user?.role === 'admin' ? (
          <>
            {/* Admin: expose Attendance Requests and overview */}
            <li className="flex flex-col">
              <div className="flex items-center space-x-2 hover:text-blue-300 cursor-pointer" onClick={()=> setShowAttendanceFilters(s=>!s)}>
                <BookOpen size={18} />
                <span>Attendance Requests ({pendingCount})</span>
              </div>
              {showAttendanceFilters && (
                <div className="mt-2 ml-6 p-2 bg-white text-black rounded shadow-sm">
                  <div className="flex flex-col space-y-2">
                    <input type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)} className="border p-1 rounded" />
                    <input type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)} className="border p-1 rounded" />
                    <select value={filterDept} onChange={e=>setFilterDept(e.target.value)} className="border p-1 rounded">
                      <option value="">All Depts</option>
                      {departments?.map(d=> <option key={d.name} value={d.name}>{d.name}</option>)}
                    </select>
                    <select value={filterSubject} onChange={e=>setFilterSubject(e.target.value)} className="border p-1 rounded">
                      <option value="">All Subjects</option>
                      {(departments.find(d=>d.name===filterDept)?.subjects || []).map(s=> <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <button onClick={()=>{
                        const qp = new URLSearchParams();
                        if(filterFrom) qp.set('from', filterFrom);
                        if(filterTo) qp.set('to', filterTo);
                        if(filterDept) qp.set('dept', filterDept);
                        if(filterSubject) qp.set('subject', filterSubject);
                        navigate(`/attendance-requests?${qp.toString()}`);
                        setShowAttendanceFilters(false);
                      }} className="px-2 py-1 bg-blue-800 text-white rounded">Go</button>
                      <button onClick={()=>{ setFilterFrom(''); setFilterTo(''); setFilterDept(''); setFilterSubject(''); }} className="px-2 py-1 bg-gray-200 rounded">Clear</button>
                    </div>
                  </div>
                </div>
              )}
            </li>
            <li className="flex items-center space-x-2 hover:text-blue-300">
              <BookOpen size={18} />
              <Link to="/attendance-overview">Attendance Overview</Link>
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

            {/* Quick link to main student dashboard */}
            <li className="flex items-center space-x-2 hover:text-blue-300 mt-4">
              <BookOpen size={18} />
              <Link to="/student-dashboard">Dashboard</Link>
            </li>
          </>
        )}
      </ul>
    </aside>
  );
};

export default Sidebar;

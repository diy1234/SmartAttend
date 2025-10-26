import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProfile from "./pages/AdminProfile";
import Settings from "./pages/Settings";
import SubjectDetails from "./pages/SubjectDetails";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import About from "./pages/About";
import Contact from "./pages/Contact";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherAboutMe from "./pages/TeacherAboutMe";
import StudentDashboard from "./pages/StudentDashboard";
import StudentReport from "./pages/StudentReport";
import StudentAttendance from "./pages/StudentAttendance";
import AttendanceHistory from "./pages/AttendanceHistory";
import StudentProfile from "./pages/StudentProfile";
import StudentAboutMe from "./pages/StudentAboutMe";
import AttendanceRequests from "./pages/AttendanceRequests";
import TakeAttendance from "./pages/TakeAttendance";
import TeacherApplyLeave from "./pages/TeacherApplyLeave";
import TeacherFacialAttendance from './pages/TeacherFacialAttendance';
import MyRequests from './pages/MyRequests';
import ManageDepartments from './pages/ManageDepartments';
import UserContext from "./context/UserContext";
import { DataProvider } from "./context/DataContext";
import { ToastProvider } from './context/ToastContext';
import ToastContainer from './components/ToastContainer';

// Protected route
function ProtectedRoute({ children, allowedRoles }) {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && Array.isArray(allowedRoles) && !allowedRoles.includes(user.role)) {
    // if user is logged in but not allowed, redirect to their dashboard
    if (user.role === "teacher") return <Navigate to="/teacher-dashboard" replace />;
    if (user.role === "student") return <Navigate to="/student-dashboard" replace />;
    return <Navigate to="/admin-dashboard" replace />;
  }
  return children;
}

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user")));

  useEffect(() => {
    const syncUser = () => setUser(JSON.parse(localStorage.getItem("user")));
    window.addEventListener("storage", syncUser);
    return () => window.removeEventListener("storage", syncUser);
  }, []);

  const handleLogin = (userData) => {
    const existing = JSON.parse(localStorage.getItem("user")) || {};
    const merged = { ...existing, ...userData };
    // ensure joinedAt is set for new signups
    if (!merged.joinedAt) merged.joinedAt = Date.now();
    localStorage.setItem("user", JSON.stringify(merged));
    setUser(merged);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <DataProvider>
      <ToastProvider>
      <Router>
        <ScrollToTop />
        {user ? (
          <div className="flex flex-col min-h-screen bg-gray-100">
            <Navbar onLogout={handleLogout} />
            <div className="flex flex-1">
              <Sidebar />
              <main className="flex-1 p-6 ml-64">
                <Routes>
                  <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/teacher-dashboard" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherDashboard /></ProtectedRoute>} />
                  <Route path="/teacher-about" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherAboutMe /></ProtectedRoute>} />
                  <Route path="/student-dashboard" element={<ProtectedRoute allowedRoles={["student"]}><StudentDashboard /></ProtectedRoute>} />
                  <Route path="/student-attendance" element={<ProtectedRoute allowedRoles={["student"]}><StudentAttendance /></ProtectedRoute>} />
                  <Route path="/attendance-history" element={<ProtectedRoute allowedRoles={["student"]}><AttendanceHistory /></ProtectedRoute>} />
                  <Route path="/student-profile" element={<ProtectedRoute allowedRoles={["student"]}><StudentProfile /></ProtectedRoute>} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/student-about" element={<ProtectedRoute allowedRoles={["student"]}><StudentAboutMe /></ProtectedRoute>} />
                  <Route path="/apply-leave" element={<ProtectedRoute allowedRoles={["teacher","student"]}><TeacherApplyLeave /></ProtectedRoute>} />
                  <Route path="/student-report" element={<ProtectedRoute><StudentReport /></ProtectedRoute>} />
                  <Route path="/attendance-requests" element={<ProtectedRoute><AttendanceRequests /></ProtectedRoute>} />
                  <Route path="/manage-departments" element={<ProtectedRoute allowedRoles={["admin"]}><ManageDepartments /></ProtectedRoute>} />
                  <Route path="/my-requests" element={<ProtectedRoute allowedRoles={["student"]}><MyRequests /></ProtectedRoute>} />
                  <Route path="/take-attendance" element={<ProtectedRoute><TakeAttendance /></ProtectedRoute>} />
                  <Route path="/teacher-face" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherFacialAttendance /></ProtectedRoute>} />
                  <Route path="/admin-profile" element={<ProtectedRoute><AdminProfile /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/departments/:dept/:subject" element={<ProtectedRoute><SubjectDetails /></ProtectedRoute>} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
            <Footer />
          </div>
        ) : (
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/signup" element={<Signup onSignup={handleLogin} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
      <ToastContainer />
      </Router>
      </ToastProvider>
      </DataProvider>
    </UserContext.Provider>
  );
}

export default App;

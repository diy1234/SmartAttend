import React from "react";
import { Outlet, Link } from "react-router-dom";

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-800 text-white flex flex-col justify-between">
        <div>
          <h1 className="text-2xl font-bold p-4">SMARTATTEND</h1>
          <nav className="space-y-2 px-4">
            <Link to="/" className="block hover:bg-blue-700 p-2 rounded">
              Dashboard
            </Link>
            <Link to="/users" className="block hover:bg-blue-700 p-2 rounded">
              Users Management
            </Link>
            <Link to="/system" className="block hover:bg-blue-700 p-2 rounded">
              System Management
            </Link>
            <Link to="/admins" className="block hover:bg-blue-700 p-2 rounded">
              Admins
            </Link>
            <Link to="/logs" className="block hover:bg-blue-700 p-2 rounded">
              Logs
            </Link>
          </nav>
        </div>

        <div className="p-4 text-sm opacity-70">© 2025 SMARTATTEND</div>
      </aside>

      {/* Main section */}
      <main className="flex-1 bg-gray-100 flex flex-col">
        {/* Navbar */}
        <header className="bg-white shadow p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-blue-900">
            Class Attendance Monitoring
          </h2>
          <nav className="space-x-4">
            <Link to="/about" className="text-blue-600 hover:underline">
              About Us
            </Link>
            <Link to="/contact" className="text-blue-600 hover:underline">
              Contact Us
            </Link>
          </nav>
        </header>

        {/* Main content area */}
        <div className="flex-grow p-6">
          <Outlet />
        </div>

        {/* Footer */}
        <footer className="bg-blue-900 text-white text-center p-3 text-sm">
          © 2025 SMARTATTEND | All Rights Reserved
        </footer>
      </main>
    </div>
  );
}

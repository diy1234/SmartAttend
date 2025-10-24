import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

function Dashboard() {
  const summary = [
    { title: "Total Students", value: 256, color: "bg-blue-500" },
    { title: "Total Teachers", value: 18, color: "bg-green-500" },
    { title: "Departments", value: 4, color: "bg-yellow-500" },
    { title: "Courses", value: 12, color: "bg-purple-500" },
    { title: "Avg Attendance", value: "82.5%", color: "bg-pink-500" },
  ];

  const attendanceData = [
    { name: "MCA", attendance: 85 },
    { name: "BCA", attendance: 80 },
    { name: "BBA", attendance: 78 },
    { name: "MBA", attendance: 90 },
  ];

  const pieData = [
    { name: "Above 75%", value: 80 },
    { name: "Below 75%", value: 20 },
  ];

  const COLORS = ["#4F46E5", "#F59E0B"];

  const recentActivities = [
    {
      date: "17 Oct 2025",
      activity: "Attendance Updated",
      user: "Admin",
      details: "MCA Semester 1",
    },
    {
      date: "16 Oct 2025",
      activity: "New Student Added",
      user: "Prof. Sharma",
      details: "Roll No: MCA23_05",
    },
    {
      date: "15 Oct 2025",
      activity: "Report Generated",
      user: "Admin",
      details: "BCA Department",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-blue-700 mb-6">
        🏫 Admin Dashboard
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {summary.map((item, idx) => (
          <div
            key={idx}
            className={`${item.color} text-white p-4 rounded-xl shadow-md`}
          >
            <h3 className="text-lg font-semibold">{item.title}</h3>
            <p className="text-2xl font-bold mt-2">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-blue-700">
            Department Attendance
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={attendanceData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="attendance" fill="#4F46E5" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-blue-700">
            Attendance Distribution
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-blue-700">
          Recent Activities
        </h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-100 text-left">
              <th className="p-3 border-b">Date</th>
              <th className="p-3 border-b">Activity</th>
              <th className="p-3 border-b">User</th>
              <th className="p-3 border-b">Details</th>
            </tr>
          </thead>
          <tbody>
            {recentActivities.map((item, idx) => (
              <tr
                key={idx}
                className="hover:bg-gray-50 transition-colors border-b"
              >
                <td className="p-3">{item.date}</td>
                <td className="p-3">{item.activity}</td>
                <td className="p-3">{item.user}</td>
                <td className="p-3">{item.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="text-center mt-10 text-gray-600 border-t pt-6">
        <p>
          © 2025 <span className="font-semibold text-blue-700">SmartAttend</span>{" "}
          | Designed by <span className="font-semibold">JIMS MCA</span> Students
        </p>
      </footer>
    </div>
  );
}

export default Dashboard;

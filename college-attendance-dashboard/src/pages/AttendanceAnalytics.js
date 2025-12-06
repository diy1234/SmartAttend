import React, { useContext, useState, useEffect } from 'react';
import UserContext from '../context/UserContext';
import ToastContext from '../context/ToastContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AttendanceAnalytics() {
  const { user } = useContext(UserContext);
  const { showToast } = useContext(ToastContext);
  const [selectedPeriod, setSelectedPeriod] = useState('all'); // all, week, month
  const [selectedView, setSelectedView] = useState('subject'); // subject, daily, trend
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    overall: { total_records: 0, present_count: 0, absent_count: 0 },
    subject_wise: [],
    daily: []
  });

  // Fetch analytics data from backend
  const fetchAnalytics = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://127.0.0.1:5000/api/attendance/analytics?teacher_id=${user.id}&period=${selectedPeriod}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      showToast('Failed to load analytics data', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedPeriod, showToast]);

  // Fetch data when component mounts or period changes
  useEffect(() => {
    if (user?.id) {
      fetchAnalytics();
    }
  }, [user, selectedPeriod, fetchAnalytics]);

  // Calculate statistics from analytics data
  const totalRecords = analytics.overall.total_records;
  const presentCount = analytics.overall.present_count;
  const absentCount = analytics.overall.absent_count;
  const attendanceRate = totalRecords ? ((presentCount / totalRecords) * 100).toFixed(1) : 0;

  // Prepare data for subject-wise chart
  const subjectData = analytics.subject_wise.map(stat => ({
    name: `${stat.department_name} - ${stat.subject_name}`,
    present: stat.present_count,
    absent: stat.absent_count
  }));

  // Prepare data for daily attendance chart
  const dailyData = analytics.daily.map(stat => ({
    name: `${new Date(stat.date).toLocaleDateString()} - ${stat.subject_name}`,
    present: stat.present_count,
    absent: stat.absent_count,
    date: new Date(stat.date).toLocaleDateString(),
    subject: stat.subject_name
  }));

  // Prepare data for pie chart
  const pieData = [
    { name: 'Present', value: presentCount },
    { name: 'Absent', value: absentCount }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#132E6B]">Attendance Analytics</h1>
        <div className="flex gap-4">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="all">All Time</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>
          <select 
            value={selectedView} 
            onChange={(e) => setSelectedView(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="subject">Subject-wise</option>
            <option value="daily">Daily View</option>
            <option value="trend">Attendance Trend</option>
          </select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-gray-500 text-sm">Total Records</h3>
          <p className="text-3xl font-bold text-[#132E6B]">{totalRecords}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-gray-500 text-sm">Present</h3>
          <p className="text-3xl font-bold text-green-600">{presentCount}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-gray-500 text-sm">Absent</h3>
          <p className="text-3xl font-bold text-red-600">{absentCount}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-gray-500 text-sm">Attendance Rate</h3>
          <p className="text-3xl font-bold text-blue-600">{attendanceRate}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-bold text-[#132E6B] mb-4">
            {selectedView === 'subject' ? 'Subject-wise Attendance' : 'Daily Attendance'}
          </h3>
          {selectedView === 'daily' && (
            <p className="text-sm text-gray-500 mb-2">Y-axis: number of students. Each bar represents Subject — Date — Time. Hover a bar for full details.</p>
          )}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={selectedView === 'subject' ? Object.values(subjectData) : Object.values(dailyData)}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis label={{ value: 'Students', angle: 0, position: 'left' }} />
                {/* custom tooltip shows subject, date and time for daily bars */}
                <Tooltip content={function CustomTooltip({ active, payload, label }) {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload || {};
                    return (
                      <div className="bg-white p-2 rounded shadow-md border">
                        <div className="font-bold">{d.subject || 'Subject'} </div>
                        <div className="text-sm text-gray-600">Date: {d.date || '—'}</div>
                        {d.time ? <div className="text-sm text-gray-600">Time: {d.time}</div> : null}
                        <div className="text-sm mt-1">Present: {d.present || 0}</div>
                        <div className="text-sm">Absent: {d.absent || 0}</div>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Legend />
                <Bar dataKey="present" fill="#00C49F" name="Present" />
                <Bar dataKey="absent" fill="#FF8042" name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-bold text-[#132E6B] mb-4">Overall Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Records */}
      <div className="mt-6 bg-white p-6 rounded-xl shadow-md">
        <h3 className="text-lg font-bold text-[#132E6B] mb-4">Recent Records</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-3 border-b">Date</th>
                <th className="p-3 border-b">Subject</th>
                <th className="p-3 border-b">Present</th>
                <th className="p-3 border-b">Absent</th>
                <th className="p-3 border-b text-center">Attendance Rate</th>
              </tr>
            </thead>
            <tbody>
              {analytics.daily.slice(0, 10).map((record, index) => {
                const total = record.present_count + record.absent_count;
                const rate = total ? ((record.present_count / total) * 100).toFixed(1) : 0;
                
                return (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-3">{new Date(record.date).toLocaleDateString()}</td>
                    <td className="p-3">{record.subject_name}</td>
                    <td className="p-3 text-green-600">{record.present_count}</td>
                    <td className="p-3 text-red-600">{record.absent_count}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                        rate >= 75
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {rate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}




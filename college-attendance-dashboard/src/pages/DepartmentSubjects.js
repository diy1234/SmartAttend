import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function DepartmentsPage() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const selectedDept = queryParams.get("dept");

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/departments")
      .then(res => res.json())
      .then(data => {
        setDepartments(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load departments:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="p-5">Loading...</p>;

  // When a department was clicked in AdminDashboard
  if (selectedDept) {
    const dept = departments.find(d => d.name === selectedDept);

    if (!dept)
      return <p className="p-5 text-red-500">Department not found.</p>;

    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">{dept.name} — Subjects</h2>

        {dept.subjects.length === 0 ? (
          <p>No subjects found for this department.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {dept.subjects.map((subj) => (
              <div key={subj.id} className="p-4 border rounded">
                <h4 className="font-semibold">{subj.name}</h4>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // If no dept selected → show list of departments
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">All Departments</h2>
      {departments.map((d) => (
        <div key={d.id} className="p-3 border rounded mb-3">
          {d.name}
        </div>
      ))}
    </div>
  );
}

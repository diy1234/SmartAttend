import React, { useState } from "react";
import { motion } from "framer-motion";

const AttendanceForm = ({ course, onClose }) => {
  const [students, setStudents] = useState([
    { id: 1, name: "John Doe", status: "Present" },
    { id: 2, name: "Aisha Singh", status: "Present" },
    { id: 3, name: "Rahul Verma", status: "Absent" },
  ]);

  const toggleStatus = (id) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: s.status === "Present" ? "Absent" : "Present" } : s
      )
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50"
    >
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-[500px]">
        <h2 className="text-xl font-bold mb-4 text-indigo-800">
          Attendance for {course}
        </h2>
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {students.map((student) => (
            <div
              key={student.id}
              className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded-lg"
            >
              <p>{student.name}</p>
              <button
                onClick={() => toggleStatus(student.id)}
                className={`px-3 py-1 rounded-lg text-sm ${
                  student.status === "Present"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {student.status}
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-6 space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Submit & Lock
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AttendanceForm;

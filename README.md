# SmartAttend — AI-Powered Attendance Management System 🎓

SmartAttend is a web-based, AI-powered attendance management system designed to automate and modernize attendance tracking in academic institutions. By integrating **facial recognition technology**, the system ensures **accurate, secure, and proxy-free** attendance marking, replacing traditional manual methods with a reliable digital solution.

---

## Key Features

* Face registration and facial recognition based attendance
* Proxy-free, secure attendance marking
* Role-based dashboards for **Admin**, **Teacher**, and **Student**
* Manual attendance approval and absentee marking by teachers
* Attendance request system for recognition failures
* Subject-wise and overall attendance analytics
* Automatic identification of students below 75% attendance
* Centralized monitoring and reporting for administrators

---

## User Roles & Functionalities

### Student

* Register facial data
* Mark attendance using facial recognition
* View subject-wise attendance analytics
* Submit attendance correction requests

### Teacher

* Verify and approve attendance records
* Mark absentees manually
* Monitor class attendance analytics

### Admin

* Manage teachers, students, and schedules
* Access consolidated attendance reports
* Monitor overall system activity

---

## Technology Stack

| Layer     | Technology                |
| --------- | ------------------------- |
| Frontend  | React.js                  |
| Backend   | Python (Flask)            |
| Database  | SQLite (SQL)              |
| AI Module | OpenCV Facial Recognition |
| Dashboard | React + Chart Libraries   |

---

## Analytics & Monitoring

The system provides graphical insights into:

* Overall attendance percentage
* Subject-wise attendance performance
* Students below attendance threshold (75%)
* Class-level attendance trends

---

## Security & Reliability

* Facial recognition eliminates proxy attendance
* Role-based access control
* Secure data handling and storage
* Manual override and correction mechanism

---

## Problem It Solves

Traditional attendance systems are:

* Time-consuming
* Error-prone
* Vulnerable to proxy marking
* Difficult to analyze at scale

SmartAttend addresses these issues through automation, AI integration, and centralized monitoring.

---

## Project Structure

```
backend/                     → Python Flask APIs & facial recognition
college-attendance-dashboard → React frontend dashboard
```

---

## Getting Started

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend

```bash
cd college-attendance-dashboard
npm install
npm start
```

---

## Future Enhancements

* Cloud deployment
* Real-time camera integration
* Email/SMS attendance alerts
* Advanced analytics dashboard

---

## Contributors

This project was developed collaboratively as part of an academic team effort.

| Name                 | Contribution                                                                      | GitHub                                                                                   |
| -------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Diya Jain**        | Login/Signup UI, Admin & Teacher Frontend, Facial Recognition Logic               | [https://github.com/diy1234](https://github.com/diy1234)                                 |
| **Ridhima Tripathi** | Student Dashboard Frontend, Documentation                                               | [https://github.com/ridhimatripathi2005-ops](https://github.com/ridhimatripathi2005-ops) |
| **Ishika Jindal**    | Teacher Backend, Student Backend, API Integration, Facial Recognition Integration | [https://github.com/Ishi1912](https://github.com/Ishi1912)                               |
| **Pallak Anand**     | Admin Backend, Student Backend, API Integration                                   | [https://github.com/PAnand04](https://github.com/PAnand04)                               |


# SmartAttend Backend API Integration Guide

## 🚀 Base URL
`http://127.0.0.1:5000/api`

## ✅ Verified & Working Endpoints

### Teacher Profiles API
- `GET /teachers/profile?user_id={id}` - Get teacher profile
- `POST /teachers/profile` - Create/update teacher profile
- `POST /teachers/profile/photo` - Update profile photo

### Class Scheduling API
- `GET /schedules/departments` - Get all departments
- `GET /schedules/subjects` - Get all subjects
- `GET /schedules/teachers` - Get all teachers
- `GET /schedules/schedules` - Get all class schedules
- `POST /schedules/schedules` - Create new schedule
- `GET /schedules/schedules/teacher/{id}` - Get teacher's schedule

## 📊 Available Data

### Departments (7)
- Computer Science, Mathematics, Physics, Chemistry, Electrical Engineering, Mechanical Engineering, Civil Engineering

### Subjects (15)
- Data Structures, Algorithms, Database Systems, Web Development, Calculus, Linear Algebra, Differential Equations, Quantum Mechanics, Classical Mechanics, Thermodynamics, Organic Chemistry, Circuit Analysis, Digital Electronics, Strength of Materials, Fluid Mechanics

### Teachers (2)
- abc (abc.ai.mca@jims.com) - ID: 3
- user (user.ml.mca@jims.com) - ID: 4

## 🔧 Example Usage

### Get Teacher Profile
```javascript
const response = await fetch('http://127.0.0.1:5000/api/teachers/profile?user_id=3');
const profile = await response.json();



## Attendance Requests API

### Base URL: `http://127.0.0.1:5000/api/attendance-requests`

### Endpoints:

#### 1. Create Attendance Request (Student)
`POST /requests`
```json
{
  "student_id": 5,
  "teacher_id": 3,
  "department": "Computer Science",
  "subject": "Data Structures",
  "request_date": "2024-01-15",
  "reason": "Medical appointment"
}

Approve Request (Teacher - Auto marks attendance)
POST /attendance-requests/requests/2/approve

json
// Response:
{
  "message": "Attendance request approved and student marked as present",
  "attendance_marked": true
}

Get Statistics (Teacher Dashboard)
GET /attendance-requests/requests/stats/3

json
// Response:
{
  "approved": 2,
  "today_pending": 0
}


## 🔔 Notification System - ✅ AUTOMATED

# 🚀 SmartAttend Backend API - PRODUCTION READY

## Base URL
`http://127.0.0.1:5000/api`

## ✅ VERIFIED & WORKING SYSTEMS

### 🔔 Notification System - ✅ FULLY AUTOMATED

**Base URL:** `http://127.0.0.1:5000/api`

#### Automated Notifications (No action needed from frontend):
- **Class Scheduled**: When admin schedules class → Teacher notified automatically
- **Attendance Request**: When student submits request → Teacher notified automatically

#### Endpoints:

1. **Get Notifications**
   `GET /notifications?user_id=3&unread_only=true&limit=20`
   ```json
   // Response:
   [
     {
       "id": 1,
       "title": "New Class Scheduled",
       "message": "Class scheduled for Wednesday at 14:00 - Data Structures",
       "type": "class_scheduled",
       "is_read": false,
       "created_at": "2025-10-29 19:15:00"
     },
     {
       "id": 2, 
       "title": "New Attendance Request",
       "message": "stu from Computer Science - Data Structures requests attendance",
       "type": "attendance_request", 
       "is_read": false,
       "created_at": "2025-10-29 19:15:30"
     }
   ]

   Mark as Read
POST /notifications/1/read

Mark All as Read
POST /notifications/read-all
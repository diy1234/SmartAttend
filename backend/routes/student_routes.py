from flask import Blueprint, request, jsonify
from models.database import get_db_connection

student_bp = Blueprint('student', __name__)

# --------------------------------------------------------
# 1️⃣ STUDENT DASHBOARD (PROFILE + ATTENDANCE + REQUESTS)
# --------------------------------------------------------
@student_bp.route('/dashboard/<int:user_id>', methods=['GET'])
def dashboard(user_id):
    conn = get_db_connection()
    cur = conn.cursor()

    # ---- Student Profile ----
    cur.execute("""
        SELECT u.id as user_id, u.name, u.email,
               s.id as student_id, s.enrollment_no, s.course, s.semester
        FROM users u
        JOIN students s ON u.id = s.user_id
        WHERE u.id = ?
    """, (user_id,))
    profile = cur.fetchone()

    if not profile:
        return jsonify({"error": "Student not found"}), 404

    # ---- Attendance Summary ----
    cur.execute("""
        SELECT subject,
               COUNT(*) AS total_classes,
               SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) AS present_classes
        FROM attendance
        WHERE student_id = ?
        GROUP BY subject
    """, (profile["student_id"],))
    attendance_summary = [dict(r) for r in cur.fetchall()]

    # ---- Leave / Attendance Requests ----
    cur.execute("""
        SELECT id, subject, department, request_date, reason, status, created_at
        FROM attendance_requests
        WHERE student_id = ?
        ORDER BY created_at DESC
    """, (profile["student_id"],))
    leave_requests = [dict(r) for r in cur.fetchall()]

    # ---- Enrolled Classes ----
    cur.execute("""
        SELECT class_id, subject, department
        FROM enrollment
        WHERE student_id = ?
    """, (profile["student_id"],))
    classes = [dict(r) for r in cur.fetchall()]

    conn.close()

    return jsonify({
        "profile": dict(profile),
        "attendance_summary": attendance_summary,
        "leave_requests": leave_requests,
        "classes": classes
    })


# --------------------------------------------------------
# 2️⃣ STUDENT ATTENDANCE RECORDS
# --------------------------------------------------------
@student_bp.route('/attendance/<int:user_id>', methods=['GET'])
def attendance_records(user_id):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT a.subject, a.attendance_date AS date, a.status
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        WHERE s.user_id = ?
        ORDER BY a.attendance_date DESC
    """, (user_id,))
    rows = cur.fetchall()

    conn.close()
    return jsonify({"attendances": [dict(r) for r in rows]})


# --------------------------------------------------------
# 3️⃣ ENROLLED CLASSES (used for dropdown in request form)
# --------------------------------------------------------
@student_bp.route('/enrolled-classes/<int:user_id>', methods=['GET'])
def enrolled_classes(user_id):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT e.class_id, c.teacher_id, e.subject, e.department
        FROM enrollment e
        JOIN students s ON e.student_id = s.id
        JOIN classes c ON e.class_id = c.id
        WHERE s.user_id = ?
    """, (user_id,))
    classes = [dict(r) for r in cur.fetchall()]

    conn.close()
    return jsonify({"classes": classes})


# --------------------------------------------------------
# 4️⃣ ALL DEPARTMENTS AND SUBJECTS (for form dropdowns)
# --------------------------------------------------------
@student_bp.route('/departments-subjects', methods=['GET'])
def get_departments_subjects():
    """Get all departments and their subjects for attendance request form"""
    conn = get_db_connection()
    cur = conn.cursor()

    # Get all departments with their subjects
    cur.execute("""
        SELECT d.id, d.name as department, 
               GROUP_CONCAT(s.name, ', ') as subjects
        FROM departments d
        LEFT JOIN subjects s ON d.id = s.department_id
        GROUP BY d.id, d.name
        ORDER BY d.name
    """)
    
    departments = []
    for row in cur.fetchall():
        dept_dict = dict(row)
        # Convert comma-separated subjects back to a list
        dept_dict['subjects'] = [s.strip() for s in dept_dict['subjects'].split(', ')] if dept_dict['subjects'] else []
        departments.append(dept_dict)
    
    conn.close()
    return jsonify({"departments": departments})
@student_bp.route('/profile/<int:user_id>', methods=['GET'])
def get_student_profile(user_id):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT 
            u.id AS user_id,
            u.name,
            u.email,
            u.photo,
            s.id AS student_id,
            s.enrollment_no,
            s.course,
            s.department,
            s.semester,
            s.phone,
            s.emergency_contact_name,
            s.emergency_contact_phone,
            s.address,
            s.headline,
            s.about_text
        FROM users u
        JOIN students s ON u.id = s.user_id
        WHERE u.id = ?
    """, (user_id,))
    
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "Student not found"}), 404

    return jsonify({"profile": dict(row)})

@student_bp.route('/profile/<int:user_id>', methods=['PUT'])
def update_student_profile(user_id):
    data = request.json

    conn = get_db_connection()
    cur = conn.cursor()

    # UPDATE users table
    cur.execute("""
        UPDATE users
        SET name = ?
        WHERE id = ?
    """, (data.get("name"), user_id))

    # UPDATE students table
    cur.execute("""
        UPDATE students
        SET 
            phone = ?, 
            emergency_contact_name = ?, 
            emergency_contact_phone = ?, 
            address = ?, 
            headline = ?, 
            about_text = ?
        WHERE user_id = ?
    """, (
        data.get("phone"),
        data.get("emergency_contact_name"),
        data.get("emergency_contact_phone"),
        data.get("address"),
        data.get("headline"),
        data.get("about_text"),
        user_id
    ))

    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Profile updated"})

import json

@student_bp.route('/about/<int:user_id>', methods=['GET'])
def get_about_me(user_id):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT *
        FROM student_about
        WHERE user_id = ?
    """, (user_id,))
    
    row = cur.fetchone()

    conn.close()

    if not row:
        # return an empty structure if not created yet
        return jsonify({
            "about": {
                "headline": "",
                "about_text": "",
                "education": [],
                "experience": [],
                "projects": [],
                "skills": [],
                "certifications": [],
                "achievements": [],
                "links": [],
                "activity": []
            }
        })

    # Convert JSON strings to arrays
    about = {key: row[key] for key in row.keys()}
    
    for field in ["education", "experience", "projects", "skills", "certifications", "achievements", "links", "activity"]:
        about[field] = json.loads(about[field] or "[]")

    return jsonify({ "about": about })

@student_bp.route('/about/<int:user_id>', methods=['PUT'])
def update_about_me(user_id):
    data = request.json

    import json

    # Convert arrays to JSON strings
    fields = {
        "headline": data.get("headline", ""),
        "about_text": data.get("about_text", ""),
        "education": json.dumps(data.get("education", [])),
        "experience": json.dumps(data.get("experience", [])),
        "projects": json.dumps(data.get("projects", [])),
        "skills": json.dumps(data.get("skills", [])),
        "certifications": json.dumps(data.get("certifications", [])),
        "achievements": json.dumps(data.get("achievements", [])),
        "links": json.dumps(data.get("links", [])),
        "activity": json.dumps(data.get("activity", [])),
    }

    conn = get_db_connection()
    cur = conn.cursor()

    # UPSERT logic
    cur.execute("SELECT id FROM student_about WHERE user_id = ?", (user_id,))
    exists = cur.fetchone()

    if exists:
        cur.execute("""
            UPDATE student_about
            SET headline = ?, about_text = ?, education = ?, experience = ?, projects = ?, 
                skills = ?, certifications = ?, achievements = ?, links = ?, activity = ?, 
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        """, (
            fields["headline"], fields["about_text"], fields["education"],
            fields["experience"], fields["projects"], fields["skills"],
            fields["certifications"], fields["achievements"], fields["links"],
            fields["activity"], user_id
        ))
    else:
        cur.execute("""
            INSERT INTO student_about
            (user_id, headline, about_text, education, experience, projects, skills,
             certifications, achievements, links, activity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id, fields["headline"], fields["about_text"], fields["education"],
            fields["experience"], fields["projects"], fields["skills"],
            fields["certifications"], fields["achievements"], fields["links"],
            fields["activity"]
        ))

    conn.commit()
    conn.close()

    return jsonify({ "success": True, "message": "About Me updated" })

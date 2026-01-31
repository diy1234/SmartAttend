import sqlite3

conn = sqlite3.connect('smartattend.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# ================= ADMIN USERS =================
print('=== Admin users ===')
cur.execute("""
    SELECT id, name, email, role, created_at
    FROM users
    WHERE role = 'admin'
""")
for row in cur.fetchall():
    print(dict(row))


# ================= SAMPLE STUDENTS =================
print('\n=== Sample student profiles (joined with users) ===')
cur.execute("""
    SELECT 
        u.id AS user_id,
        u.name AS student_name,
        u.email,
        u.role,
        s.id AS student_id,
        s.enrollment_no,
        s.course,
        s.semester
    FROM users u
    JOIN students s ON u.id = s.user_id
    LIMIT 5
""")
for row in cur.fetchall():
    print(dict(row))


# ================= SAMPLE TEACHERS =================
print('\n=== Sample teacher profiles (joined with users & departments) ===')
cur.execute("""
    SELECT 
        u.id AS user_id,
        u.name AS teacher_name,
        u.email,
        u.role,
        tp.id AS teacher_profile_id,
        tp.faculty_id,
        tp.designation,
        d.name AS department
    FROM users u
    JOIN teacher_profiles tp ON u.id = tp.user_id
    LEFT JOIN departments d ON tp.department_id = d.id
    LIMIT 5
""")
for row in cur.fetchall():
    print(dict(row))

conn.close()

import sqlite3

conn = sqlite3.connect('smartattend.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print('=== Admin users ===')
cur.execute("SELECT id, name, email, role, created_at FROM users WHERE role = 'admin'")
for row in cur.fetchall():
    print(dict(row))

print('\n=== Sample student profiles (joined with users) ===')
cur.execute('''
SELECT u.id as user_id, u.name as user_name, u.email, u.role, s.id as student_id, s.enrollment_no, s.course, s.semester
FROM users u
JOIN students s ON u.id = s.user_id
LIMIT 5
''')
for row in cur.fetchall():
    print(dict(row))

print('\n=== Sample teacher profiles (joined with users) ===')
cur.execute('''
SELECT u.id as user_id, u.name as user_name, u.email, u.role, tp.id as teacher_profile_id, tp.full_name
FROM users u
JOIN teacher_profiles tp ON u.id = tp.user_id
LIMIT 5
''')
for row in cur.fetchall():
    print(dict(row))

conn.close()

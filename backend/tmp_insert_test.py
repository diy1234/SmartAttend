from backend.models.database import get_db_connection
from datetime import date
conn = get_db_connection()
cur = conn.cursor()
# find a student and class to test
cur.execute('SELECT id FROM students LIMIT 1')
stu = cur.fetchone()
cur.execute('SELECT id FROM classes LIMIT 1')
cls = cur.fetchone()
if not stu or not cls:
    print('No student or class found; abort')
else:
    sid = stu['id']
    cid = cls['id']
    d = date.today().isoformat()
    # Insert two present rows
    cur.execute('INSERT INTO attendance (student_id, class_id, attendance_date, status, marked_by, subject, department, course) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', (sid, cid, d, 'present', 1, 'Test Subject', 'Test Dept', 'Test Course'))
    cur.execute('INSERT INTO attendance (student_id, class_id, attendance_date, status, marked_by, subject, department, course) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', (sid, cid, d, 'present', 1, 'Test Subject', 'Test Dept', 'Test Course'))
    conn.commit()
    cur.execute('SELECT id, student_id, class_id, attendance_date, status, created_at FROM attendance WHERE student_id=? AND class_id=? AND attendance_date=?', (sid, cid, d))
    rows = cur.fetchall()
    print('Rows found:', len(rows))
    for r in rows:
        # sqlite3.Row -> dict
        print(dict(r))
conn.close()

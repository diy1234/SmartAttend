import sqlite3

conn = sqlite3.connect('backend/smartattend.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print('=== TEACHERS (teacher_profiles) ===')
cursor.execute('SELECT id, user_id FROM teacher_profiles')
for row in cursor.fetchall():
    print(f'Profile ID: {row[0]}, User ID: {row[1]}')

print('\n=== CLASSES ===')
cursor.execute('SELECT id, class_name, teacher_id, subject_id FROM classes')
for row in cursor.fetchall():
    print(f'Class ID: {row[0]}, Name: {row[1]}, Teacher ID: {row[2]}, Subject ID: {row[3]}')

print('\n=== SUBJECTS ===')
cursor.execute('SELECT id, name FROM subjects')
for row in cursor.fetchall():
    print(f'Subject ID: {row[0]}, Name: {row[1]}')

print('\n=== STUDENT 1 ENROLLMENTS ===')
cursor.execute('''SELECT e.id, e.class_id, e.student_id, c.class_name, c.teacher_id FROM enrollment e 
                  JOIN classes c ON e.class_id = c.id 
                  WHERE e.student_id = 1''')
for row in cursor.fetchall():
    print(f'Enrollment: {row[0]}, Class ID: {row[1]}, Student: {row[2]}, Class Name: {row[3]}, Teacher ID: {row[4]}')

conn.close()

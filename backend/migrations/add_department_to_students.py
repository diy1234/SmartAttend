import sqlite3

def add_department_to_students():
    """Add department column to students table"""
    conn = sqlite3.connect('smartattend.db')
    cursor = conn.cursor()
    
    try:
        # Check if department column exists in students table
        cursor.execute("PRAGMA table_info(students)")
        columns = cursor.fetchall()
        department_exists = any(col[1] == 'department' for col in columns)
        
        if not department_exists:
            # Add department column
            cursor.execute('''
                ALTER TABLE students
                ADD COLUMN department TEXT
            ''')
            print("✅ Added department column to students table")
            
            # Update existing students with department from users table
            cursor.execute('''
                UPDATE students
                SET department = (
                    SELECT department
                    FROM users
                    WHERE users.id = students.user_id
                )
            ''')
            print("✅ Updated existing students with department information")
        else:
            print("ℹ️ Department column already exists in students table")
            
        conn.commit()
        
    except Exception as e:
        print(f"❌ Error modifying students table: {e}")
        conn.rollback()
        
    finally:
        conn.close()

if __name__ == '__main__':
    add_department_to_students()
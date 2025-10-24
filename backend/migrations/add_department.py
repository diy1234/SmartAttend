import sqlite3

def add_department_column():
    """Add department column to users table"""
    conn = sqlite3.connect('smartattend.db')
    cursor = conn.cursor()
    
    try:
        # Check if department column exists
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        department_exists = any(col[1] == 'department' for col in columns)
        
        if not department_exists:
            # Add department column
            cursor.execute('''
                ALTER TABLE users
                ADD COLUMN department TEXT
            ''')
            print("✅ Added department column to users table")
        else:
            print("ℹ️ Department column already exists")
            
        conn.commit()
        
    except Exception as e:
        print(f"❌ Error adding department column: {e}")
        conn.rollback()
        
    finally:
        conn.close()

if __name__ == '__main__':
    add_department_column()
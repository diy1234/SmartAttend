import sqlite3

def update_faculty_table():
    """Update faculty table with new fields"""
    conn = sqlite3.connect('smartattend.db')
    cursor = conn.cursor()
    
    try:
        # Get existing columns
        cursor.execute("PRAGMA table_info(faculty)")
        columns = {col[1] for col in cursor.fetchall()}
        
        # Add new columns if they don't exist
        new_columns = {
            'faculty_id': 'TEXT',  # F2025CS01 format
            'designation': 'TEXT',
            'gender': 'TEXT',
            'contact_number': 'TEXT',
            'profile_photo': 'TEXT',  # Store file path or URL
            'full_name': 'TEXT'  # Separate from basic name for formal usage
        }
        
        # Create unique index for faculty_id after adding the column
        try:
            cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_faculty_id ON faculty(faculty_id)')
        except:
            pass
        
        for col_name, col_type in new_columns.items():
            if col_name not in columns:
                cursor.execute(f'''
                    ALTER TABLE faculty
                    ADD COLUMN {col_name} {col_type}
                ''')
                print(f"✅ Added {col_name} column to faculty table")
        
        # Generate faculty_id for existing records if needed
        cursor.execute('''
            UPDATE faculty 
            SET faculty_id = 'F' || substr('2025', 1, 4) || 
                CASE 
                    WHEN department LIKE '%Computer%' THEN 'CS'
                    WHEN department LIKE '%Electronic%' THEN 'EC'
                    WHEN department LIKE '%Mechanical%' THEN 'ME'
                    WHEN department LIKE '%Civil%' THEN 'CE'
                    ELSE 'OT'
                END || 
                substr('00' || faculty.id, -2)
            WHERE faculty_id IS NULL
        ''')
        
        print("✅ Generated faculty IDs for existing records")
        conn.commit()
        
    except Exception as e:
        print(f"❌ Error updating faculty table: {e}")
        conn.rollback()
        
    finally:
        conn.close()

if __name__ == '__main__':
    update_faculty_table()
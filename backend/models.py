import sqlite3
import hashlib

def init_db(app=None):
    """Compatibility function - database is already initialized in app.py"""
    print("Database initialization handled in app.py")
    pass

def get_db():
    """Get SQLite database connection"""
    conn = sqlite3.connect('smartattend.db')
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password):
    """Simple password hashing using SHA-256 with salt"""
    salt = "smartattend_salt_2024"
    return hashlib.sha256((password + salt).encode()).hexdigest()

def check_password(hashed_password, password):
    """Check if password matches the hash"""
    return hashed_password == hash_password(password)
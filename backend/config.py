import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'smartattend-secret-key-2024')
    DATABASE = os.getenv('DATABASE', 'smartattend.db')
    # Remove MySQL configurations since we're using SQLite
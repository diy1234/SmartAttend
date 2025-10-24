import os
import sqlite3
import logging
from datetime import datetime, timedelta
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
import smtplib
from email.message import EmailMessage

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'smartattend.db')

# Token TTL in seconds (default 1 hour)
TOKEN_TTL_SECONDS = int(os.environ.get('PASSWORD_RESET_TOKEN_TTL', '3600'))


def _get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_tables():
    conn = _get_connection()
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            token TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used INTEGER DEFAULT 0
        )
    ''')
    conn.commit()
    conn.close()


def _get_serializer():
    # Use SECRET_KEY from environment if present, else default for dev
    secret = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    return URLSafeTimedSerializer(secret)


def generate_token(email):
    s = _get_serializer()
    return s.dumps({'email': email})


def verify_token(token, max_age=TOKEN_TTL_SECONDS):
    s = _get_serializer()
    try:
        data = s.loads(token, max_age=max_age)
        return True, data
    except SignatureExpired:
        return False, 'Token expired'
    except BadSignature:
        return False, 'Invalid token'
    except Exception as e:
        logger.error('Token verification error: %s', e)
        return False, 'Invalid token'


def send_reset_link(email, token, phone=None):
    """Dev helper: print the reset link and write a small HTML redirect file for convenience."""
    try:
        reset_url = f"http://localhost:3000/reset-password?token={token}"
        
        # Always print to console for development
        lines = []
        lines.append('\n' + '═' * 60)
        lines.append('SMARTATTEND - PASSWORD RESET LINK (DEV MODE)')
        lines.append(f'To: {email}')
        if phone:
            lines.append(f'Phone: {phone} (SMS not implemented in dev)')
        lines.append(f'Reset URL: {reset_url}')
        lines.append('This link expires in {} seconds.'.format(TOKEN_TTL_SECONDS))
        lines.append('═' * 60 + '\n')
        print('\n'.join(lines))
        logger.info('Password reset link displayed in console for: %s', email)

        # Fallback: print to console and write local HTML for dev convenience
        lines = []
        lines.append('\n' + '═' * 60)
        lines.append('SMARTATTEND - PASSWORD RESET LINK (DEV)')
        lines.append(f'To: {email}')
        if phone:
            lines.append(f'Phone: {phone} (SMS not implemented in dev)')
        lines.append(f'Reset URL: {reset_url}')
        lines.append('This link expires in {} seconds.'.format(TOKEN_TTL_SECONDS))
        lines.append('═' * 60 + '\n')
        print('\n'.join(lines))

        # Write a tiny HTML file in backend for manual clicking during dev
        try:
            html_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'password_reset_redirect.html')
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(f"<html><head><meta charset=\"utf-8\"><title>Password Reset</title></head><body>")
                f.write(f"<h3>Password reset link for {email}</h3>")
                f.write(f"<p><a href=\"{reset_url}\">Click to reset password</a></p>")
                f.write('</body></html>')
        except Exception as e:
            logger.debug('Could not write HTML redirect file: %s', e)

        return True
    except Exception as e:
        logger.error('Failed to send reset link: %s', e)
        return False


def create_and_send_reset_link(email, phone=None):
    _ensure_tables()
    try:
        token = generate_token(email)
        conn = _get_connection()
        cur = conn.cursor()
        cur.execute('INSERT INTO password_reset_tokens (email, token) VALUES (?, ?)', (email, token))
        conn.commit()
        conn.close()
        send_reset_link(email, token, phone=phone)
        return True
    except Exception as e:
        logger.error('Error creating reset token: %s', e)
        return False


def mark_token_used(token):
    try:
        conn = _get_connection()
        cur = conn.cursor()
        cur.execute('UPDATE password_reset_tokens SET used = 1 WHERE token = ?', (token,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        logger.error('Error marking token used: %s', e)
        return False


def cleanup_expired_tokens(hours=24):
    # We rely on itsdangerous TTL, but keep DB tidy by removing tokens older than given hours
    try:
        cutoff = datetime.now() - timedelta(hours=hours)
        conn = _get_connection()
        cur = conn.cursor()
        cur.execute('DELETE FROM password_reset_tokens WHERE created_at < ?', (cutoff,))
        deleted = cur.rowcount
        conn.commit()
        conn.close()
        if deleted:
            logger.info('Cleaned up %d old password reset tokens', deleted)
        return True
    except Exception as e:
        logger.error('Error cleaning old tokens: %s', e)
        return False

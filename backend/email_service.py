"""email_service.py

Provides a small helper to send verification emails for password reset.
This version explicitly loads the `.env` file located next to this module,
trims credentials, and returns clear True/False for callers. If credentials
are missing it will return False so the caller can handle the fallback.
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import logging

# Load the .env file located in the same directory as this module
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(BASE_DIR, '.env')
load_dotenv(env_path)

logger = logging.getLogger(__name__)


def send_verification_email(email, verification_code):
    """Send verification code via SMTP.

    Returns True on success, False on failure.
    """
    try:
        SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com').strip()
        SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
        EMAIL_USER = os.environ.get('EMAIL_USER', '').strip()
        EMAIL_PASSWORD = os.environ.get('EMAIL_PASS', '')

        logger.info('Attempting to send email with server: %s:%s, from: %s', SMTP_SERVER, SMTP_PORT, EMAIL_USER)

        if not EMAIL_USER or not EMAIL_PASSWORD:
            logger.error('Email credentials are not set in .env (EMAIL_USER/EMAIL_PASS).')
            return False

        # Create message
        msg = MIMEMultipart()
        msg['From'] = EMAIL_USER
        msg['To'] = email
        msg['Subject'] = 'SmartAttend - Password Reset Verification Code'

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #2563eb; color: white; padding: 20px; text-align: center; }}
                .code {{ font-size: 32px; font-weight: bold; text-align: center; color: #2563eb; 
                        padding: 15px; background: #f3f4f6; margin: 20px 0; letter-spacing: 5px; }}
                .footer {{ margin-top: 20px; font-size: 12px; color: #666; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>SmartAttend</h1>
                    <h2>Password Reset Verification</h2>
                </div>

                <p>Hello,</p>
                <p>You requested to reset your password for your SmartAttend account. Use the verification code below:</p>

                <div class="code">{verification_code}</div>

                <p>This code will expire in <strong>10 minutes</strong>.</p>
                <p>If you didn't request this password reset, please ignore this email.</p>

                <div class="footer">
                    <p>This is an automated message from SmartAttend System.</p>
                    <p>Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """

        msg.attach(MIMEText(html, 'html'))

        # Send email via SMTP
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            logger.info('Connecting to SMTP server...')
            server.starttls()
            logger.info('STARTTLS enabled, attempting login...')
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            logger.info('Login successful, sending message...')
            server.send_message(msg)
            logger.info('Message sent successfully')

        logger.info('Verification code sent to %s', email)
        return True

    except smtplib.SMTPAuthenticationError as e:
        logger.error('SMTP Authentication failed. Please check EMAIL_USER and EMAIL_PASS: %s', str(e))
        return False
    except smtplib.SMTPConnectError as e:
        logger.error('Failed to connect to SMTP server. Please check SMTP_SERVER and SMTP_PORT: %s', str(e))
        return False
    except smtplib.SMTPException as e:
        logger.error('SMTP error occurred: %s', str(e))
        return False
    except Exception as e:
        logger.exception('Unexpected error sending verification email to %s: %s', email, str(e))
        return False
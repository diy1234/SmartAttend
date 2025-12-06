from flask import Blueprint, request, jsonify
from models.database import get_db_connection
from services.notification_service import NotificationService

contact_bp = Blueprint('contact_bp', __name__)

# ===============================================
# 1️⃣ SUBMIT CONTACT MESSAGE
# ===============================================
@contact_bp.route('/submit', methods=['POST'])
def submit_contact():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    message = data.get('message')

    if not name or not email or not message:
        return jsonify({"error": "All fields are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Save to DB
        cursor.execute('''
            INSERT INTO contact_messages (name, email, message)
            VALUES (?, ?, ?)
        ''', (name, email, message))

        conn.commit()
        message_id = cursor.lastrowid

        # Notify all admins
        NotificationService.notify_admins(
            title="New Contact Message",
            message=f"{name} sent a new message.",
            notification_type="contact_message",
            related_id=message_id
        )

        return jsonify({"message": "Message sent successfully!"}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


# ===============================================
# 2️⃣ ADMIN – VIEW ALL CONTACT MESSAGES
# ===============================================
@contact_bp.route('/messages', methods=['GET'])
def get_all_messages():
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            SELECT * FROM contact_messages
            ORDER BY created_at DESC
        ''')
        messages = [dict(row) for row in cursor.fetchall()]
        return jsonify(messages)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


# ===============================================
# 3️⃣ ADMIN — MARK MESSAGE AS READ
# ===============================================
@contact_bp.route('/messages/<int:msg_id>/read', methods=['PATCH'])
def mark_message_read(msg_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            UPDATE contact_messages
            SET status = 'read'
            WHERE id = ?
        ''', (msg_id,))
        conn.commit()

        return jsonify({"message": "Message marked as read"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

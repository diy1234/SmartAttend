from flask import Blueprint, request, jsonify
from models.database import get_db_connection
from datetime import datetime

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('/notifications', methods=['GET'])
def get_notifications():
    """Get notifications for a user"""
    user_id = request.args.get('user_id')
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    limit = request.args.get('limit', 50)
    
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = '''
            SELECT 
                id,
                title,
                message,
                type,
                related_id,
                is_read,
                created_at
            FROM notifications 
            WHERE user_id = ?
        '''
        
        params = [user_id]
        
        if unread_only:
            query += ' AND is_read = FALSE'
        
        query += ' ORDER BY created_at DESC LIMIT ?'
        params.append(limit)
        
        cursor.execute(query, params)
        notifications = cursor.fetchall()
        
        result = []
        for notification in notifications:
            result.append(dict(notification))
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@notifications_bp.route('/notifications/<int:notification_id>/read', methods=['POST'])
def mark_as_read(notification_id):
    """Mark a notification as read"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            UPDATE notifications 
            SET is_read = TRUE 
            WHERE id = ?
        ''', (notification_id,))
        
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Notification not found'}), 404
            
        return jsonify({'message': 'Notification marked as read'})
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@notifications_bp.route('/notifications/read-all', methods=['POST'])
def mark_all_as_read():
    """Mark all notifications as read for a user"""
    user_id = request.json.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            UPDATE notifications 
            SET is_read = TRUE 
            WHERE user_id = ? AND is_read = FALSE
        ''', (user_id,))
        
        conn.commit()
        affected_rows = cursor.rowcount
        
        return jsonify({
            'message': f'Marked {affected_rows} notifications as read',
            'marked_count': affected_rows
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@notifications_bp.route('/notifications/stats', methods=['GET'])
def get_notification_stats():
    """Get notification statistics for a user"""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get total unread count
        cursor.execute('''
            SELECT COUNT(*) as unread_count 
            FROM notifications 
            WHERE user_id = ? AND is_read = FALSE
        ''', (user_id,))
        unread_count = cursor.fetchone()['unread_count']
        
        # Get unread count by type
        cursor.execute('''
            SELECT type, COUNT(*) as count
            FROM notifications 
            WHERE user_id = ? AND is_read = FALSE
            GROUP BY type
        ''', (user_id,))
        
        type_counts = cursor.fetchall()
        type_stats = {item['type']: item['count'] for item in type_counts}
        
        # Get today's notifications
        cursor.execute('''
            SELECT COUNT(*) as today_count
            FROM notifications 
            WHERE user_id = ? AND DATE(created_at) = DATE('now')
        ''', (user_id,))
        today_count = cursor.fetchone()['today_count']
        
        return jsonify({
            'unread_count': unread_count,
            'type_stats': type_stats,
            'today_count': today_count
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@notifications_bp.route('/notifications/<int:notification_id>', methods=['DELETE'])
def delete_notification(notification_id):
    """Delete a notification"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('DELETE FROM notifications WHERE id = ?', (notification_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Notification not found'}), 404
            
        return jsonify({'message': 'Notification deleted successfully'})
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
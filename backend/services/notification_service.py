from models.database import get_db_connection

class NotificationService:
    @staticmethod
    def create_notification(user_id, title, message, notification_type, related_id=None):
        """Create a new notification"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO notifications 
                (user_id, title, message, type, related_id)
                VALUES (?, ?, ?, ?, ?)
            ''', (user_id, title, message, notification_type, related_id))
            
            conn.commit()
            return cursor.lastrowid
        except Exception as e:
            conn.rollback()
            print(f"Error creating notification: {e}")
            return None
        finally:
            conn.close()
    
    @staticmethod
    def notify_class_scheduled(teacher_id, class_schedule_data):
        """Notify teacher about new class schedule"""
        title = "New Class Scheduled"
        message = f"Class scheduled for {class_schedule_data['day_of_week']} at {class_schedule_data['start_time']} - {class_schedule_data['subject_name']}"
        
        return NotificationService.create_notification(
            user_id=teacher_id,
            title=title,
            message=message,
            notification_type='class_scheduled',
            related_id=class_schedule_data.get('id')
        )
    
    @staticmethod
    def notify_attendance_request(teacher_id, request_data):
        """Notify teacher about new attendance request"""
        title = "New Attendance Request"
        message = f"{request_data['student_name']} from {request_data['department']} - {request_data['subject']} requests attendance for {request_data['request_date']}"
        
        return NotificationService.create_notification(
            user_id=teacher_id,
            title=title,
            message=message,
            notification_type='attendance_request',
            related_id=request_data.get('id')
        )
    
        @staticmethod
        def notify_teacher_subject_assignment(teacher_user_id, assignment_data):
            """Notify teacher about new subject assignment"""
            title = "New Subject Assignment"
            message = f"You have been assigned to teach {assignment_data['subject_name']} in {assignment_data['department_name']}"
        
            return NotificationService.create_notification(
                user_id=teacher_user_id,
                title=title,
                message=message,
                notification_type='alert',
                related_id=assignment_data.get('id')
            )
    
    
    @staticmethod
    def notify_system_alert(teacher_id, title, message):
        """Send system alert to teacher"""
        return NotificationService.create_notification(
            user_id=teacher_id,
            title=title,
            message=message,
            notification_type='system'
        )
    
    @staticmethod
    def get_user_notifications(user_id, limit=10):
        """Get notifications for a user"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT * FROM notifications 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            ''', (user_id, limit))
            
            notifications = cursor.fetchall()
            return [dict(notification) for notification in notifications]
        except Exception as e:
            print(f"Error getting notifications: {e}")
            return []
        finally:
            conn.close()
    
    @staticmethod
    def notify_admins(title, message, notification_type="system", related_id=None):
        """Notify all admins by creating a notification per-admin using create_notification

        Uses the central `create_notification` so format, related_id, and created_at
        are handled consistently with other notification creators.
        """
        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("SELECT id FROM users WHERE role = 'admin'")
            admins = cursor.fetchall()

            for admin in admins:
                NotificationService.create_notification(
                    user_id=admin['id'],
                    title=title,
                    message=message,
                    notification_type=notification_type,
                    related_id=related_id
                )

        except Exception as e:
            print(f"Error notifying admins: {e}")
        finally:
            conn.close()


    @staticmethod
    def mark_notification_as_read(notification_id):
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
            return cursor.rowcount > 0
        except Exception as e:
            conn.rollback()
            print(f"Error marking notification as read: {e}")
            return False
        finally:
            conn.close()
    
    @staticmethod
    def mark_all_notifications_as_read(user_id):
        """Mark all notifications for a user as read"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                UPDATE notifications 
                SET is_read = TRUE 
                WHERE user_id = ? AND is_read = FALSE
            ''', (user_id,))
            
            conn.commit()
            return cursor.rowcount
        except Exception as e:
            conn.rollback()
            print(f"Error marking all notifications as read: {e}")
            return 0
        finally:
            conn.close()
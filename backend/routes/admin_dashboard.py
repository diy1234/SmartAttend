# backend/routes/admin_dashboard.py
from flask import Blueprint, request, jsonify
from models.database import get_db_connection
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/admin/stats', methods=['GET'])
def get_dashboard_summary():
    """Get comprehensive dashboard summary for admin dashboard"""
    try:
        logger.debug('Attempting to fetch dashboard summary')
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Total Students
        # Total Students
        cursor.execute('SELECT COUNT(*) FROM users WHERE role = ?', ('student',))
        total_students = cursor.fetchone()[0]
        logger.debug(f'Total students: {total_students}')
        
        # Total Teachers
        cursor.execute('SELECT COUNT(*) FROM users WHERE role = ?', ('faculty',))
        total_teachers = cursor.fetchone()[0]
        logger.debug(f'Total teachers: {total_teachers}')
        
        # Total Departments
        cursor.execute('SELECT COUNT(*) FROM departments')
        total_departments = cursor.fetchone()[0]
        logger.debug(f'Total departments: {total_departments}')
        
        # Total Subjects
        cursor.execute('SELECT COUNT(*) FROM subjects')
        total_subjects = cursor.fetchone()[0]
        logger.debug(f'Total subjects: {total_subjects}')
        
        # Average Attendance Percentage
        cursor.execute('''
            SELECT 
                ROUND((SUM(CASE WHEN status = "Present" THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 1) as avg_attendance
            FROM attendance 
            WHERE date >= date('now', '-30 days')
        ''')
        avg_attendance_result = cursor.fetchone()
        avg_attendance = avg_attendance_result[0] if avg_attendance_result[0] else 0
        
        conn.close()
        
        return jsonify({
            'total_students': total_students,
            'total_teachers': total_teachers,
            'total_departments': total_departments,
            'total_subjects': total_subjects,
            'avg_attendance': avg_attendance
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/admin/department-attendance', methods=['GET'])
def get_department_attendance():
    """Get attendance data by department for the bar chart"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                d.name as department,
                COUNT(*) as total_records,
                SUM(CASE WHEN a.status = "Present" THEN 1 ELSE 0 END) as present_count
            FROM attendance a
            JOIN departments d ON a.department = d.name
            WHERE a.date >= date('now', '-30 days')
            GROUP BY d.name
            ORDER BY d.name
        ''')
        
        department_data = []
        for row in cursor.fetchall():
            percentage = round((row[2] / row[1] * 100), 1) if row[1] > 0 else 0
            department_data.append({
                'dept': row[0],
                'percent': percentage,
                'total': row[1],
                'present': row[2]
            })
        
        conn.close()
        return jsonify({'department_attendance': department_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/admin/attendance-distribution', methods=['GET'])
def get_attendance_distribution():
    """Get attendance distribution for pie chart"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get department attendance percentages
        cursor.execute('''
            SELECT 
                d.name as department,
                ROUND((SUM(CASE WHEN a.status = "Present" THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 1) as attendance_rate
            FROM attendance a
            JOIN departments d ON a.department = d.name
            WHERE a.date >= date('now', '-30 days')
            GROUP BY d.name
        ''')
        
        departments = cursor.fetchall()
        
        # Calculate distribution
        above_75 = 0
        below_75 = 0
        
        for dept in departments:
            if dept[1] >= 75:
                above_75 += 1
            else:
                below_75 += 1
        
        total_depts = len(departments) if departments else 1
        above_percentage = round((above_75 / total_depts) * 100, 1)
        below_percentage = round((below_75 / total_depts) * 100, 1)
        
        conn.close()
        return jsonify({
            'above_75': above_percentage,
            'below_75': below_percentage,
            'total_departments': total_depts
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/admin/pending-requests-count', methods=['GET'])
def get_pending_requests_count():
    """Get count of pending attendance requests"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM attendance_requests WHERE status = "pending"')
        pending_count = cursor.fetchone()[0]
        
        conn.close()
        return jsonify({'pending_requests': pending_count}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
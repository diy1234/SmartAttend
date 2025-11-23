from flask import Blueprint, jsonify, request
from models.database import get_db_connection

departments_bp = Blueprint('departments_bp', __name__)

# ======================================================
# 1️⃣ Get all departments + subjects
# ======================================================
@departments_bp.route('/', methods=['GET'])
def get_departments():
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id, name, created_at FROM departments ORDER BY name ASC")
        departments = cursor.fetchall()

        result = []

        for dept in departments:
            dept_id = dept["id"]

            # Fetch subjects for each department
            cursor.execute("""
                SELECT id, name
                FROM subjects
                WHERE department_id = ?
            """, (dept_id,))
            subjects = cursor.fetchall()

            result.append({
                "id": dept_id,
                "name": dept["name"],
                "created_at": dept["created_at"],
                "subjects": [dict(s) for s in subjects]
            })

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()


# ======================================================
# 2️⃣ Add a new department
# ======================================================
@departments_bp.route('/add', methods=['POST'])
def add_department():
    data = request.get_json()
    dept_name = data.get("name")

    if not dept_name:
        return jsonify({"error": "Department name is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Prevent duplicate
    cursor.execute("SELECT id FROM departments WHERE name = ?", (dept_name,))
    if cursor.fetchone():
        conn.close()
        return jsonify({"error": "Department already exists"}), 409

    cursor.execute("INSERT INTO departments (name) VALUES (?)", (dept_name,))
    conn.commit()
    conn.close()

    return jsonify({"message": f"Department '{dept_name}' added successfully"}), 201


# ======================================================
# 3️⃣ Remove a department
# ======================================================
@departments_bp.route('/remove', methods=['POST'])
def remove_department():
    data = request.get_json()
    dept_name = data.get("name")

    if not dept_name:
        return jsonify({"error": "Department name is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Get department id
    cursor.execute("SELECT id FROM departments WHERE name = ?", (dept_name,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Department not found"}), 404

    dept_id = row["id"]

    # Delete subjects first, then department
    cursor.execute("DELETE FROM subjects WHERE department_id = ?", (dept_id,))
    cursor.execute("DELETE FROM departments WHERE id = ?", (dept_id,))

    conn.commit()
    conn.close()

    return jsonify({"message": f"Department '{dept_name}' removed successfully"}), 200


# ======================================================
# 4️⃣ Add subject to a department
# ======================================================
@departments_bp.route('/<dept_name>/subjects/add', methods=['POST'])
def add_subject(dept_name):
    data = request.get_json()
    subject_name = data.get("subject")

    if not subject_name:
        return jsonify({"error": "Subject name is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Find department ID
    cursor.execute("SELECT id FROM departments WHERE name = ?", (dept_name,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Department not found"}), 404

    dept_id = row["id"]

    # Check duplicate
    cursor.execute("SELECT id FROM subjects WHERE name = ? AND department_id = ?", (subject_name, dept_id))
    if cursor.fetchone():
        conn.close()
        return jsonify({"error": "Subject already exists in this department"}), 409

    # Insert subject
    cursor.execute("INSERT INTO subjects (name, department_id) VALUES (?, ?)", (subject_name, dept_id))
    conn.commit()
    conn.close()

    return jsonify({"message": f"Subject '{subject_name}' added to '{dept_name}'"}), 201


# ======================================================
# 5️⃣ Remove subject from a department
# ======================================================
@departments_bp.route('/<dept_name>/subjects/remove', methods=['POST'])
def remove_subject(dept_name):
    data = request.get_json()
    subject_name = data.get("subject")

    if not subject_name:
        return jsonify({"error": "Subject name is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        DELETE FROM subjects
        WHERE name = ? 
        AND department_id = (SELECT id FROM departments WHERE name = ?)
    """, (subject_name, dept_name))

    if cursor.rowcount == 0:
        conn.close()
        return jsonify({"error": "Subject not found for this department"}), 404

    conn.commit()
    conn.close()

    return jsonify({"message": f"Subject '{subject_name}' removed from '{dept_name}'"}), 200


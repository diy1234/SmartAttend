from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from models.database import init_db

# Import blueprints
from routes.auth import auth_bp
from routes.users import users_bp
from routes.classes import classes_bp
from routes.attendance import attendance_bp

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(users_bp, url_prefix='/api/users')
app.register_blueprint(classes_bp, url_prefix='/api/classes')
app.register_blueprint(attendance_bp, url_prefix='/api/attendance')

@app.route('/')
def api_info():
    return jsonify({
        'message': 'SmartAttend Backend API',
        'version': '1.0.0',
        'endpoints': {
            'auth': [
                'POST /api/auth/signup',
                'POST /api/auth/login', 
                'POST /api/auth/forgot-password',
                'POST /api/auth/reset-password',
                'POST /api/auth/verify-reset-token'
            ],
            'users': ['GET /api/users/profile'],
            'classes': ['GET /api/classes', 'POST /api/classes'],
            'attendance': ['POST /api/attendance', 'GET /api/attendance']
        }
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'SmartAttend API is running',
        'database': 'connected'
    })

if __name__ == '__main__':
    init_db()
    print("🚀 SmartAttend Backend Starting...")
    print("📍 API Running on: http://127.0.0.1:5000")
    print("🔑 Default Admin: admin@smartattend.com / admin123")
    app.run(debug=Config.DEBUG, port=5000)
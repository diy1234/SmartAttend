import re
from collections import defaultdict

# Common academic email patterns and their roles
ACADEMIC_PATTERNS = {
    r'(faculty|prof|teacher|instructor|lecturer)': 'faculty',
    r'(student|learner)': 'student',
    r'(admin|administrator|staff)': 'admin',
    r'(hod|head|dean|director)': 'admin'
}

# Department keywords and their normalized names
DEPARTMENT_KEYWORDS = {
    'cs': 'Computer Science',
    'cse': 'Computer Science',
    'it': 'Information Technology',
    'ece': 'Electronics',
    'eee': 'Electrical',
    'mech': 'Mechanical',
    'civil': 'Civil',
    'bio': 'Biotechnology',
    'chem': 'Chemical',
    'math': 'Mathematics',
    'phy': 'Physics'
}

def extract_role_from_email(email):
    """
    Detect likely role from email address using pattern matching
    """
    email_lower = email.lower()
    
    # Check for role indicators in the email
    for pattern, role in ACADEMIC_PATTERNS.items():
        if re.search(pattern, email_lower):
            return role
            
    # Default role based on email domain
    if '.edu' in email_lower:
        # Assume student if no specific role indicator
        return 'student'
    elif '.ac.' in email_lower:
        # Academic staff for .ac domains without specific role
        return 'faculty'
        
    return None

def extract_department_from_input(text):
    """
    Detect department from input text using keyword matching
    """
    text_lower = text.lower()
    words = set(re.findall(r'\w+', text_lower))
    
    # Check for department keywords
    for keyword, dept in DEPARTMENT_KEYWORDS.items():
        if keyword in words:
            return dept
            
    # Look for common department patterns
    dept_patterns = {
        r'computer|computing|software': 'Computer Science',
        r'electronic|telecommunication': 'Electronics',
        r'electric|power': 'Electrical',
        r'mechanical|machine|mech': 'Mechanical',
        r'civil|structure|construction': 'Civil',
        r'biology|biotech': 'Biotechnology',
        r'chemistry|chemical': 'Chemical',
        r'mathematics|maths': 'Mathematics',
        r'physics|physical': 'Physics'
    }
    
    for pattern, dept in dept_patterns.items():
        if re.search(pattern, text_lower):
            return dept
            
    return None

def suggest_categories(email, form_data=None):
    """
    Main function to suggest user categories based on email and form data
    Returns a dict with suggested role and department
    """
    result = {
        'role': None,
        'department': None,
        'confidence': 'low'
    }
    
    # Try to detect role from email
    role = extract_role_from_email(email)
    if role:
        result['role'] = role
        result['confidence'] = 'medium'
    
    # If form data is provided, try to detect department
    if form_data:
        # Combine relevant form fields for department detection
        relevant_fields = [
            form_data.get('department', ''),
            form_data.get('specialization', ''),
            form_data.get('course', ''),
            form_data.get('subject', '')
        ]
        text = ' '.join(filter(None, relevant_fields))
        
        if text:
            dept = extract_department_from_input(text)
            if dept:
                result['department'] = dept
                result['confidence'] = 'high'
    
    return result
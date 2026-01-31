class EmailDomainParser:
    def __init__(self):
        # Domain mapping for departments
        self.domain_mapping = {
            'smartattend': 'Computer Science',
            'jims': 'Computer Science', 
            'edu': 'General Education',
            'academy': 'General Education'
        }
        
        # Course mapping for students
        self.course_mapping = {
            'mca': 'MCA',
            'btech': 'BTech',
            'mtech': 'MTech', 
            'bca': 'BCA',
            'mba': 'MBA',
            'bsc': 'BSc',
            'msc': 'MSc'
        }
    
    def parse_email(self, email, selected_role=None):
        """
        Smart email analysis that RESPECTS the selected_role from form
        Only provides additional info like department/course, doesn't override role
        """
        try:
            local_part = email.split('@')[0].lower()
            domain = email.split('@')[1].split('.')[0].lower()
            
            print(f"EMAIL PARSER: Analyzing {email}, selected_role: {selected_role}")
            
            # ALWAYS respect the selected role from the form
            # Only use auto-detection if no role was provided
            if selected_role:
                role = selected_role
                print(f"Using selected role: {role}")
            else:
                # Auto-detect only if no role provided (fallback)
                if 'teacher' in local_part or 'faculty' in local_part or 'prof' in local_part:
                    role = 'teacher'
                elif 'student' in local_part or 'learn' in local_part:
                    role = 'student'
                else:
                    # Default based on common patterns
                    role = 'student'
                print(f"Auto-detected role: {role}")
            
            # Get domain-based department
            department = self.domain_mapping.get(domain, 'Computer Science')
            
            # Prepare result based on role
            if role == 'teacher':
                result = {
                    'role': role,  # Keep the selected role
                    'domain': department,
                    'department': department,
                    'designation': 'Assistant Professor',
                    'full_name': local_part.replace('.', ' ').title()  # Extract name from email
                }
            else:
                # For students, try to detect course from email pattern
                course = 'BCA'  # Default course
                for course_key, course_name in self.course_mapping.items():
                    if course_key in local_part:
                        course = course_name
                        break
                
                result = {
                    'role': role,  # Keep the selected role
                    'course': course,
                    'department': course  # For students, department = course
                }
            
            print(f"EMAIL PARSER RESULT: {result}")
            return result
                
        except Exception as e:
            print(f"EMAIL PARSER ERROR: {e}")
            # Default fallback that respects selected role
            if selected_role == 'teacher':
                return {
                    'role': 'teacher',
                    'domain': 'Computer Science',
                    'department': 'Computer Science',
                    'designation': 'Assistant Professor'
                }
            else:
                return {
                    'role': 'student',
                    'course': 'BCA',
                    'department': 'BCA'
                }

email_parser = EmailDomainParser()
class EmailDomainParser:
    def __init__(self):
        self.domain_mapping = {
            'ai': 'Artificial Intelligence',
            'ml': 'Machine Learning',
            'ds': 'Data Science',
            'cs': 'Computer Science',
            'it': 'Information Technology'
        }
        
        self.course_mapping = {
            'mca': 'MCA',
            'btech': 'BTech',
            'mtech': 'MTech',
            'bca': 'BCA',
            'mba': 'MBA'
        }
    
    def parse_email(self, email):
        """Smart email analysis for automatic role/course detection"""
        try:
            local_part = email.split('@')[0].lower()
            parts = local_part.split('.')
            
            # Teacher pattern: name.ai.mca@domain.com
            if len(parts) >= 3:
                return {
                    'role': 'teacher',
                    'domain': self.domain_mapping.get(parts[-2], parts[-2].upper()),
                    'department': self.course_mapping.get(parts[-1], parts[-1].upper())
                }
            else:
                # Student pattern: name.mca@domain.com
                return {
                    'role': 'student',
                    'course': self.course_mapping.get(parts[-1], parts[-1].upper()),
                    'department': self.course_mapping.get(parts[-1], parts[-1].upper())
                }
        except:
            return {'role': 'student', 'course': 'General', 'department': 'General'}

email_parser = EmailDomainParser()
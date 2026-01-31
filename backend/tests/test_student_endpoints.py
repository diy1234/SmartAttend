# Simple integration checks for student endpoints
from app import app

def test_attendance_and_requests():
    client = app.test_client()

    # Ensure student attendance endpoint returns success for known student
    r = client.get('/api/attendance/student/7')
    assert r.status_code == 200
    assert 'attendances' in r.json

    # Ensure attendance-requests listing works (both when passing student_id and when passing user_id)
    r2 = client.get('/api/attendance-requests/student/7')
    assert r2.status_code == 200
    assert 'requests' in r2.json

    # When passing a user_id instead of student_id it should also return the student's requests
    r_user = client.get('/api/attendance-requests/student/4')  # user_id for Student One
    assert r_user.status_code == 200
    # Accept either the blueprint array route or the JSON wrapper depending on which endpoint wins
    assert (isinstance(r_user.json, dict) and 'requests' in r_user.json) or isinstance(r_user.json, list)

    # Also check the other listing endpoint used by the frontend
    r3 = client.get('/api/attendance-requests/requests/student/4')
    assert r3.status_code == 200
    assert isinstance(r3.json, list)

    # Try creating a sample request (class_id must exist)
    payload = {'student_id': 7, 'class_id': 4, 'request_date': '2026-01-15', 'reason': 'Test'}
    r4 = client.post('/api/attendance-requests', json=payload)
    assert r4.status_code in (200, 201)
    json4 = r4.json
    # Some endpoints return {'message':...}, others return {'success': True}
    assert 'message' in json4 or json4.get('success') is True

if __name__ == '__main__':
    test_attendance_and_requests()
    print('Student endpoint checks passed')

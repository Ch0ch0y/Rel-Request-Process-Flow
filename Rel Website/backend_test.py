import requests
import json
import sys
from datetime import datetime

class RelRequestAPITester:
    def __init__(self, base_url="https://rel-request-steps.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{self.base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_user_ids = []
        self.created_request_ids = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        req_headers = {'Content-Type': 'application/json'}
        if self.token:
            req_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            req_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=req_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=req_headers)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=req_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=req_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    result = response.json()
                    return success, result
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test("Root Endpoint", "GET", "", 200)
        return success

    def test_register_user(self, username, email, password, role):
        """Test user registration"""
        success, response = self.run_test(
            f"Register {role} User",
            "POST",
            "auth/register",
            200,
            data={
                "username": username,
                "email": email,
                "password": password,
                "role": role
            }
        )
        if success and 'id' in response:
            self.created_user_ids.append(response['id'])
            return True, response['id']
        return False, None

    def test_login(self, email, password):
        """Test user login and get token"""
        success, response = self.run_test(
            "Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Token obtained for user: {response.get('user', {}).get('username', 'Unknown')}")
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test("Get Current User", "GET", "auth/me", 200)
        return success

    def test_create_request(self, unit_package_info):
        """Create a request (Reliability Engineer only)"""
        success, response = self.run_test(
            "Create Request",
            "POST",
            "requests",
            200,
            data={"unit_package_info": unit_package_info}
        )
        if success and 'id' in response:
            self.created_request_ids.append(response['id'])
            return response['id']
        return None

    def test_get_requests(self):
        """Get all requests"""
        success, response = self.run_test("Get Requests", "GET", "requests", 200)
        return success, response if success else []

    def test_get_request_by_id(self, request_id):
        """Get a specific request by ID"""
        success, response = self.run_test(
            "Get Request by ID",
            "GET",
            f"requests/{request_id}",
            200
        )
        return success, response if success else {}

    def test_update_step(self, request_id, step_number, update_data):
        """Update a step (Failure Analysis/Operator only)"""
        success, response = self.run_test(
            f"Update Step {step_number}",
            "PATCH",
            f"requests/{request_id}/steps/{step_number}",
            200,
            data=update_data
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)
        return success, response if success else {}

    def test_get_users(self):
        """Test get users (Admin only)"""
        success, response = self.run_test("Get Users", "GET", "users", 200)
        return success, response if success else []

    def test_delete_user(self, user_id):
        """Test delete user (Admin only)"""
        success, response = self.run_test(
            "Delete User",
            "DELETE",
            f"users/{user_id}",
            200
        )
        return success

    def test_delete_request(self, request_id):
        """Test delete request (Admin only)"""
        success, response = self.run_test(
            "Delete Request",
            "DELETE",
            f"requests/{request_id}",
            200
        )
        return success

def main():
    print("🚀 Starting Rel Request Process Flow API Testing...")
    tester = RelRequestAPITester()
    
    # Test basic connectivity
    print("\n" + "="*50)
    print("🌐 CONNECTIVITY TESTS")
    print("="*50)
    
    if not tester.test_root_endpoint():
        print("❌ Root endpoint failed - stopping tests")
        return 1
    
    # Test user registration and authentication
    print("\n" + "="*50)
    print("👤 AUTHENTICATION TESTS")
    print("="*50)
    
    timestamp = datetime.now().strftime('%H%M%S')
    admin_email = f"admin_{timestamp}@test.com"
    fa_email = f"fa_{timestamp}@test.com"
    operator_email = f"operator_{timestamp}@test.com"
    requestor_email = f"requestor_{timestamp}@test.com"
    
    # Register users with different roles
    admin_success, admin_id = tester.test_register_user("Admin Test", admin_email, "TestPass123!", "Reliability Engineer")
    fa_success, fa_id = tester.test_register_user("FA Test", fa_email, "TestPass123!", "Failure Analysis")
    operator_success, operator_id = tester.test_register_user("Operator Test", operator_email, "TestPass123!", "Operator")
    requestor_success, requestor_id = tester.test_register_user("Requestor Test", requestor_email, "TestPass123!", "Requestor")
    
    if not admin_success:
        print("❌ Admin registration failed - stopping tests")
        return 1
    
    # Login as admin
    if not tester.test_login(admin_email, "TestPass123!"):
        print("❌ Admin login failed - stopping tests")
        return 1
    
    # Test current user endpoint
    tester.test_get_current_user()
    
    # Test request operations
    print("\n" + "="*50)
    print("📋 REQUEST MANAGEMENT TESTS (Admin)")
    print("="*50)
    
    # Create a request
    request_id = tester.test_create_request("Test Unit Package - Microprocessor XYZ-123")
    if not request_id:
        print("❌ Request creation failed")
        return 1
    
    # Get all requests
    success, requests = tester.test_get_requests()
    if success:
        print(f"   Found {len(requests)} requests")
    
    # Get specific request
    success, request_detail = tester.test_get_request_by_id(request_id)
    if success:
        print(f"   Request has {len(request_detail.get('steps', []))} steps")
    
    # Test dashboard stats
    print("\n" + "="*50)
    print("📊 DASHBOARD TESTS")
    print("="*50)
    
    success, stats = tester.test_dashboard_stats()
    if success:
        print(f"   Total requests: {stats.get('total_requests', 0)}")
        print(f"   Active requests: {stats.get('active_requests', 0)}")
        print(f"   Completed requests: {stats.get('completed_requests', 0)}")
        print(f"   Pending requests: {stats.get('pending_requests', 0)}")
    
    # Test user management
    print("\n" + "="*50)
    print("👥 USER MANAGEMENT TESTS (Admin)")
    print("="*50)
    
    success, users = tester.test_get_users()
    if success:
        print(f"   Found {len(users)} users")
    
    # Test step updates with Failure Analysis user
    print("\n" + "="*50)
    print("🔧 STEP UPDATE TESTS (Failure Analysis)")
    print("="*50)
    
    if fa_success:
        # Login as Failure Analysis user
        if tester.test_login(fa_email, "TestPass123!"):
            # Update first step
            step_update_data = {
                "status": "in_progress",
                "machine_no": "M-001",
                "operator_id": "OP-FA-123",
                "tray_no": "TR-001",
                "notes": "Starting incoming inspection process"
            }
            tester.test_update_step(request_id, 1, step_update_data)
            
            # Complete first step
            step_complete_data = {
                "status": "completed",
                "machine_no": "M-001",
                "operator_id": "OP-FA-123",
                "tray_no": "TR-001",
                "notes": "Incoming inspection completed successfully"
            }
            tester.test_update_step(request_id, 1, step_complete_data)
            
            # Check updated request
            success, updated_request = tester.test_get_request_by_id(request_id)
            if success:
                current_step = updated_request.get('current_step', 1)
                print(f"   Request now at step: {current_step}")
    
    # Test step updates with Operator user
    print("\n" + "="*50)
    print("🔧 STEP UPDATE TESTS (Operator)")
    print("="*50)
    
    if operator_success:
        # Login as Operator user
        if tester.test_login(operator_email, "TestPass123!"):
            # Update second step
            step_update_data = {
                "status": "in_progress",
                "machine_no": "M-002",
                "operator_id": "OP-TECH-456",
                "tray_no": "TR-002",
                "notes": "Visual inspection in progress"
            }
            tester.test_update_step(request_id, 2, step_update_data)
    
    # Test role-based access control
    print("\n" + "="*50)
    print("🔒 ROLE-BASED ACCESS TESTS")
    print("="*50)
    
    if requestor_success:
        # Login as Requestor (should not be able to create requests)
        if tester.test_login(requestor_email, "TestPass123!"):
            # Try to create request (should fail with 403)
            success, response = tester.run_test(
                "Create Request (should fail)",
                "POST",
                "requests",
                403,  # Expecting 403 Forbidden
                data={"unit_package_info": "Should fail - Requestor cannot create"}
            )
            if success:
                print("✅ Requestor correctly cannot create requests (403 Forbidden)")
            else:
                print("❌ Expected 403 Forbidden for requestor creating requests")
            
            # Check if can only see own requests (should see none since requestor didn't create any)
            success, requestor_requests = tester.test_get_requests()
            if success:
                print(f"   Requestor sees {len(requestor_requests)} requests (should be 0)")
    
    # Login back as admin for cleanup
    tester.test_login(admin_email, "TestPass123!")
    
    # Cleanup tests
    print("\n" + "="*50)
    print("🧹 CLEANUP TESTS")
    print("="*50)
    
    # Delete the test request
    if request_id:
        tester.test_delete_request(request_id)
    
    # Delete test users (except admin who is doing the deletion)
    for user_id in [fa_id, operator_id, requestor_id]:
        if user_id:
            tester.test_delete_user(user_id)
    
    # Print final results
    print("\n" + "="*50)
    print("📊 FINAL RESULTS")
    print("="*50)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
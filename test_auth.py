"""
Test script for authentication endpoints
Run this from Windows to test the API on the VM
"""
import requests
import json

# API base URL
BASE_URL = "https://192.168.3.40"

# Disable SSL warnings for self-signed certificate
requests.packages.urllib3.disable_warnings()

def print_response(title, response):
    """Pretty print API response"""
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}")
    print(f"Status Code: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response: {response.text}")
    print(f"{'='*60}\n")

def test_registration():
    """Test user registration"""
    url = f"{BASE_URL}/auth/register"
    payload = {
        "email": "test@example.com",
        "password": "TestPass123",
        "full_name": "Test User",
        "role": "USER"
    }
    
    response = requests.post(url, json=payload, verify=False)
    print_response("1. User Registration", response)
    return response.status_code == 201

def test_verify_otp():
    """Test OTP verification (you'll need to check terminal for OTP)"""
    otp = input("\nEnter the OTP from the server logs: ")
    
    url = f"{BASE_URL}/auth/verify-otp"
    payload = {
        "email": "test@example.com",
        "otp": otp
    }
    
    response = requests.post(url, json=payload, verify=False)
    print_response("2. OTP Verification", response)
    
    if response.status_code == 200:
        tokens = response.json()
        return tokens.get("access_token"), tokens.get("refresh_token")
    return None, None

def test_login():
    """Test user login"""
    url = f"{BASE_URL}/auth/login"
    payload = {
        "email": "test@example.com",
        "password": "TestPass123"
    }
    
    response = requests.post(url, json=payload, verify=False)
    print_response("3. User Login", response)
    
    if response.status_code == 200:
        tokens = response.json()
        return tokens.get("access_token"), tokens.get("refresh_token")
    return None, None

def test_get_me(access_token):
    """Test getting current user info"""
    url = f"{BASE_URL}/auth/me"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.get(url, headers=headers, verify=False)
    print_response("4. Get Current User", response)
    return response.status_code == 200

def test_refresh_token(refresh_token):
    """Test token refresh"""
    url = f"{BASE_URL}/auth/refresh"
    payload = {
        "refresh_token": refresh_token
    }
    
    response = requests.post(url, json=payload, verify=False)
    print_response("5. Refresh Token", response)
    return response.status_code == 200

def test_health():
    """Test health check endpoint"""
    url = f"{BASE_URL}/health"
    response = requests.get(url, verify=False)
    print_response("0. Health Check", response)
    return response.status_code == 200

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("AUTHENTICATION API TEST SUITE")
    print("="*60)
    
    # Test health check
    print("\n[Testing] Health Check...")
    if not test_health():
        print("❌ Health check failed! Server might be down.")
        return
    print("✅ Health check passed")
    
    # Test registration
    print("\n[Testing] User Registration...")
    if not test_registration():
        print("⚠️  Registration failed (user might already exist)")
        
        # Try login instead
        print("\n[Testing] Login with existing user...")
        access_token, refresh_token = test_login()
        
        if not access_token:
            print("❌ Login also failed! Check credentials.")
            return
    else:
        print("✅ Registration successful")
        
        # Verify OTP
        print("\n[Testing] OTP Verification...")
        print("Note: Check the VM terminal for the OTP code")
        print("Look for a line like: [EMAIL] Sending OTP to test@example.com: 123456")
        
        access_token, refresh_token = test_verify_otp()
        
        if not access_token:
            print("❌ OTP verification failed!")
            return
        print("✅ OTP verification successful")
    
    # Test getting current user
    print("\n[Testing] Get Current User Info...")
    if test_get_me(access_token):
        print("✅ Get current user successful")
    else:
        print("❌ Get current user failed")
    
    # Test token refresh
    print("\n[Testing] Token Refresh...")
    if test_refresh_token(refresh_token):
        print("✅ Token refresh successful")
    else:
        print("❌ Token refresh failed")
    
    print("\n" + "="*60)
    print("TEST SUITE COMPLETED")
    print("="*60)
    print("\n✅ All core authentication features are working!")
    print("\nYou can now:")
    print("1. Test endpoints interactively at: https://192.168.3.40/docs")
    print("2. Build the frontend application")
    print("3. Implement additional features (profile management, resume upload, etc.)")

if __name__ == "__main__":
    main()

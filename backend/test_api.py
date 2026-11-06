from fastapi.testclient import TestClient
from main import app
import json

client = TestClient(app)

def test_endpoints():
    print("Testing /providers...")
    response = client.get("/providers")
    assert response.status_code == 200
    providers = response.json()
    print(f"Success: Found {len(providers)} providers")

    print("Testing /agencies...")
    response = client.get("/agencies")
    assert response.status_code == 200
    agencies = response.json()
    print(f"Success: Found {len(agencies)} agencies")

    print("Testing /addresses...")
    response = client.get("/addresses")
    assert response.status_code == 200
    addresses = response.json()
    print(f"Success: Found {len(addresses)} addresses")

    print("Testing /waitlist POST...")
    payload = {
        "parent_names": "Test Parent",
        "email": "parent@example.com",
        "phone": "555-0199",
        "child_name": "Test Child",
        "child_age": "2 years",
        "dob_or_due_date": "2023-01-01",
        "desired_start_month": "September",
        "desired_start_year": 2025,
        "provider_id": 1
    }
    response = client.post("/waitlist", json=payload)
    assert response.status_code == 200
    print("Success: Waitlist entry created")

    print("Testing /waitlist GET...")
    response = client.get("/waitlist")
    assert response.status_code == 200
    waitlist = response.json()
    print(f"Success: Found {len(waitlist)} waitlist entries")

if __name__ == "__main__":
    try:
        test_endpoints()
        print("\nAll API tests passed successfully!")
    except Exception as e:
        print(f"\nTests failed: {e}")
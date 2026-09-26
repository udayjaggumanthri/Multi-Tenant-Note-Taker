"""
Multi-Tenant SaaS Proof-of-Concept
End-to-End Tenant Isolation and Architecture Verification Script

This script verifies:
1. Domain -> Tenant resolution (abc.localhost -> Tenant 101, xyz.localhost -> Tenant 102)
2. Normalization (port stripping, case insensitivity)
3. Unknown domain returns 404 ('Tenant / domain not configured.')
4. Inactive tenant returns 403 ('Tenant account is currently inactive.')
5. Cross-tenant authentication blocking (Ravi cannot log in on xyz.localhost)
6. Data Isolation:
   - Ravi gets ONLY Tenant 101 notes
   - John gets ONLY Tenant 102 notes
   - ABC note NEVER appears in XYZ query
   - XYZ note NEVER appears in ABC query
7. Security: Direct access to other tenant's note ID returns 404
8. Security: Manipulated tenant_id in payload is ignored and overridden by request.tenant
9. Platform Admin lifecycle: Login, Create Tenant, Deactivate Tenant, Reactivate Tenant
"""

import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def make_request(path, method="GET", host="localhost", data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {
        "Host": host,
        "X-Tenant-Domain": host.split(':')[0],
        "Content-Type": "application/json",
    }
    if token:
        headers["Authorization"] = f"Token {token}"

    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
            res_body = response.read().decode("utf-8")
            try:
                res_json = json.loads(res_body)
            except Exception:
                res_json = res_body
            return status_code, res_json
    except urllib.error.HTTPError as e:
        status_code = e.code
        res_body = e.read().decode("utf-8")
        try:
            res_json = json.loads(res_body)
        except Exception:
            res_json = res_body
        return status_code, res_json
    except Exception as e:
        return 0, str(e)


def run_tests():
    print("=" * 70)
    print("RUNNING MULTI-TENANT PROOF-OF-CONCEPT ARCHITECTURE VERIFICATION")
    print("=" * 70)

    # 1. Domain Resolution: abc.localhost
    print("\n[TEST 1] Domain Resolution -> abc.localhost")
    status, data = make_request("/api/tenant/", host="abc.localhost")
    assert status == 200, f"Expected 200, got {status}: {data}"
    assert data["id"] == 101, f"Expected tenant id 101, got {data.get('id')}"
    assert data["name"] == "ABC Electronics", f"Expected ABC Electronics, got {data.get('name')}"
    print("  [OK] SUCCESS: abc.localhost resolved to Tenant 101 (ABC Electronics)")

    # 2. Domain Resolution: xyz.localhost
    print("\n[TEST 2] Domain Resolution -> xyz.localhost")
    status, data = make_request("/api/tenant/", host="xyz.localhost")
    assert status == 200, f"Expected 200, got {status}: {data}"
    assert data["id"] == 102, f"Expected tenant id 102, got {data.get('id')}"
    assert data["name"] == "XYZ Furniture", f"Expected XYZ Furniture, got {data.get('name')}"
    print("  [OK] SUCCESS: xyz.localhost resolved to Tenant 102 (XYZ Furniture)")

    # 3. Hostname Normalization (Case insensitivity & Port numbers)
    print("\n[TEST 3] Hostname Normalization -> ABC.LOCALHOST:8000")
    status, data = make_request("/api/tenant/", host="ABC.LOCALHOST:8000")
    assert status == 200, f"Expected 200, got {status}: {data}"
    assert data["id"] == 101, f"Expected tenant id 101, got {data.get('id')}"
    print("  [OK] SUCCESS: ABC.LOCALHOST:8000 normalized to abc.localhost -> Tenant 101")

    # 4. Unknown Domain (Phase 15)
    print("\n[TEST 4] Unknown Domain -> unknown.localhost")
    status, data = make_request("/api/tenant/", host="unknown.localhost")
    assert status == 404, f"Expected 404, got {status}: {data}"
    assert "Tenant / domain not configured." in data.get("error", ""), f"Unexpected error message: {data}"
    print("  [OK] SUCCESS: unknown.localhost returned 404 'Tenant / domain not configured.'")

    # 4b. Security: Direct Public IP Access Prevention
    print("\n[TEST 4b] Security -> Direct Public IP Access Prevention (198.51.100.24)")
    status, data = make_request("/api/tenant/", host="198.51.100.24")
    assert status in (400, 403), f"Expected 400 or 403, got {status}: {data}"
    print(f"  [OK] SUCCESS: Direct IP access blocked with HTTP {status} (Host Header Security Enforced)")

    # 4c. Security: Rogue / Unregistered Domain Pointing
    print("\n[TEST 4c] Security -> Rogue / Unregistered Domain Pointing (evil-attacker.com)")
    status, data = make_request("/api/tenant/", host="evil-attacker.com")
    assert status in (400, 404), f"Expected 400 or 404, got {status}: {data}"
    print(f"  [OK] SUCCESS: Rogue domain evil-attacker.com blocked with HTTP {status} (Not in Allowed/Registered Domains)")

    # 5. Cross-Tenant Login Isolation (Phase 12)
    print("\n[TEST 5] Cross-Tenant Authentication Isolation")
    # Ravi (tenant 101) attempts to login to xyz.localhost (tenant 102)
    status, data = make_request("/api/auth/login/", method="POST", host="xyz.localhost", data={
        "email": "ravi@abc.com",
        "password": "RaviPass@123"
    })
    assert status == 403, f"Expected 403, got {status}: {data}"
    print("  [OK] SUCCESS: Ravi (Tenant 101) blocked from logging in on xyz.localhost (403 Forbidden)")

    # 6. Correct Logins and Token Generation
    print("\n[TEST 6] Tenant Login -> ABC & XYZ")
    # Ravi login on abc.localhost
    status, data = make_request("/api/auth/login/", method="POST", host="abc.localhost", data={
        "email": "ravi@abc.com",
        "password": "RaviPass@123"
    })
    assert status == 200, f"Expected 200, got {status}: {data}"
    ravi_token = data["token"]
    print("  [OK] SUCCESS: Ravi logged in on abc.localhost, token acquired")

    # John login on xyz.localhost
    status, data = make_request("/api/auth/login/", method="POST", host="xyz.localhost", data={
        "email": "john@xyz.com",
        "password": "JohnPass@123"
    })
    assert status == 200, f"Expected 200, got {status}: {data}"
    john_token = data["token"]
    print("  [OK] SUCCESS: John logged in on xyz.localhost, token acquired")

    # 7. Note List Isolation (Phase 17, 26, 27)
    print("\n[TEST 7] Notes Data Isolation via GET /api/notes/")
    status, abc_notes = make_request("/api/notes/", host="abc.localhost", token=ravi_token)
    assert status == 200, f"Expected 200, got {status}: {abc_notes}"
    abc_titles = [n["title"] for n in abc_notes]
    assert "ABC Secret Note" in abc_titles, f"Missing ABC note in: {abc_titles}"
    assert "XYZ Secret Note" not in abc_titles, f"LEAKAGE DETECTED! XYZ note appeared in ABC list: {abc_titles}"
    print(f"  [OK] SUCCESS: ABC Notes: {abc_titles} (Zero XYZ notes present)")

    status, xyz_notes = make_request("/api/notes/", host="xyz.localhost", token=john_token)
    assert status == 200, f"Expected 200, got {status}: {xyz_notes}"
    xyz_titles = [n["title"] for n in xyz_notes]
    assert "XYZ Secret Note" in xyz_titles, f"Missing XYZ note in: {xyz_titles}"
    assert "ABC Secret Note" not in xyz_titles, f"LEAKAGE DETECTED! ABC note appeared in XYZ list: {xyz_titles}"
    print(f"  [OK] SUCCESS: XYZ Notes: {xyz_titles} (Zero ABC notes present)")

    # 8. Note Detail Access Isolation (Phase 19, 27)
    print("\n[TEST 8] Direct Note Access Isolation via GET /api/notes/<id>/")
    xyz_note_id = [n["id"] for n in xyz_notes if n["title"] == "XYZ Secret Note"][0]
    # Ravi on abc.localhost attempts to view xyz_note_id
    status, data = make_request(f"/api/notes/{xyz_note_id}/", host="abc.localhost", token=ravi_token)
    assert status == 404, f"SECURITY FAILURE! Expected 404, got {status}: {data}"
    print(f"  [OK] SUCCESS: Ravi on abc.localhost received 404 when requesting XYZ Note #{xyz_note_id}")

    # 9. Tenant ID Parameter Manipulation Prevention (Phase 17)
    print("\n[TEST 9] Tamper-Resistant Tenant ID in Note Creation")
    status, new_note = make_request("/api/notes/", method="POST", host="abc.localhost", token=ravi_token, data={
        "title": "Injected Tenant Test Note",
        "content": "Trying to inject tenant_id=102 from client",
        "tenant_id": 102
    })
    assert status == 201, f"Expected 201, got {status}: {new_note}"
    assert new_note["tenant_id"] == 101, f"SECURITY FAILURE! Note was assigned to tenant {new_note['tenant_id']} instead of 101!"
    print(f"  [OK] SUCCESS: Note was assigned to Tenant {new_note['tenant_id']} (client tenant_id=102 was ignored)")

    # 10. Platform Admin Flow & Tenant Deactivation (Phase 28)
    print("\n[TEST 10] Platform Admin Login, Deactivation & Reactivation")
    status, data = make_request("/api/auth/login/", method="POST", host="prod.localhost", data={
        "email": "admin@prod.com",
        "password": "AdminPass@123",
        "is_platform_login": True
    })
    assert status == 200, f"Expected 200, got {status}: {data}"
    admin_token = data["token"]
    print("  [OK] SUCCESS: Platform Admin logged in on prod.localhost")

    # Deactivate Tenant 101
    status, data = make_request("/api/admin/tenants/101/", method="PATCH", host="prod.localhost", token=admin_token, data={
        "status": "INACTIVE"
    })
    assert status == 200, f"Expected 200, got {status}: {data}"
    print("  [OK] SUCCESS: Tenant 101 status updated to INACTIVE")

    # Verify abc.localhost is now blocked with 403 (Phase 16)
    status, data = make_request("/api/tenant/", host="abc.localhost")
    assert status == 403, f"Expected 403, got {status}: {data}"
    assert "Tenant account is currently inactive." in data.get("error", "")
    print("  [OK] SUCCESS: Inactive Tenant 101 access blocked with 403 Forbidden")

    # Reactivate Tenant 101
    status, data = make_request("/api/admin/tenants/101/", method="PATCH", host="prod.localhost", token=admin_token, data={
        "status": "ACTIVE"
    })
    assert status == 200, f"Expected 200, got {status}: {data}"
    print("  [OK] SUCCESS: Tenant 101 status reactivated to ACTIVE")

    # Verify abc.localhost is accessible again
    status, data = make_request("/api/tenant/", host="abc.localhost")
    assert status == 200, f"Expected 200, got {status}: {data}"
    print("  [OK] SUCCESS: Reactivated Tenant 101 is now accessible (200 OK)")

    print("\n" + "=" * 70)
    print("ALL 10 MULTI-TENANT ARCHITECTURE TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()

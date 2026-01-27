# Audemic API Integration: Status & Blockers

**Last Updated**: 2026-01-27

## 🚀 Status Overview
The **Client Logic** for DSA Automation is essentially **complete**.
The **Backend API** is currently **missing** the required implementation to accept DSA metadata.

| Component | Status | Notes |
| :--- | :--- | :--- |
| **Authentication** | ✅ **DONE** | Bypassed CSRF using `x-client: audemic-scholar-mobile`. Verified. |
| **User Sign Up** | ✅ **DONE** | Validated `POST /users` creates users (when email is unique). |
| **Client Code** | ✅ **DONE** | `lib/audemic-api.ts` implements the full DSA payload spec. |
| **Automation Logic**| ✅ **DONE** | `lib/automation.ts` now passes PO/Provider to the API client. |
| **Backend API** | 🛑 **BLOCKED** | API currently ignores or rejects DSA fields (`dsa_eligible`, etc.). |

---

## 🛠 Active Blockers

### 1. Backend: Missing DSA Payload Support
**Issue**: The `POST /users` endpoint currently creates a "Standard/Expired" user regardless of the payload. It does not yet process the DSA flags.
**Impact**: Automated subscriptions cannot be created.
**Requirement for Backend Team**:
- Update `POST /users` to accept:
  - `dsa_eligible` (bool)
  - `dsa_duration_years` (int)
  - `dsa_provider` (string)
  - `po_number` (string)
- Ensure the response includes:
  - `data.subscription.stripe_id`

### 2. Backend: "User Already Exists" Error Handling
**Issue**: Using an existing email returns `500 Internal Server Error` instead of `422` or `409 Conflict`.
**Impact**: Makes debugging harder and error handling in the dashboard generic ("Internal Error" instead of "User already registered").
**Recommendation**: Return `422 Unprocessable Entity` with `{"email": ["has already been taken"]}`.

---

## ✅ Resolutions Implemented

- **500 Error Fix**: Confirmed that the 500 error was due to duplicate emails. Automation logic must ensure unique emails or handle existing users (future work).
- **Dependency Update**: Updated `lib/automation.ts` to accept `poNumber` and `provider` from the parsing layer, ensuring no data is dropped before reaching the API client.
- **Spec Defined**: Provided the backend team with the exact JSON contract required for the integration.

## 📝 Backend Requirements Specification

### 1. Extension: Signup Endpoint
**Endpoint**: `POST /users`

#### Required Extra Fields (in `user` object)
| Field Name | Type | Example | Description |
| :--- | :--- | :--- | :--- |
| `dsa_eligible` | Boolean | `true` | **Trigger flag**. If true, bypasses payment. |
| `dsa_duration_years` | Integer | `2` | Duration of the funded license. |
| `dsa_provider` | String | `"Remtek"` | The DSA provider name. |
| `po_number` | String | `"PO-12345"` | Purchase Order number. |

#### Proposed Payload
```json
{
  "user": {
    "email": "student@university.ac.uk",
    "password": "SecurePassword123",
    "action": "signup",
    "dsa_eligible": true,
    "dsa_duration_years": 4,
    "dsa_provider": "Remtek",
    "po_number": "PO-998877"
  }
}
```

### 2. Extension: Subscription Response
**Endpoint**: `GET /api/v2/subscription` (or via Signup response)

#### Required Response Fields
| Field Name | Type | Example | Description |
| :--- | :--- | :--- | :--- |
| `stripe_subscription_id` | String | `"sub_1Pk..."` | Critical for future updates/cancellations. |

#### Proposed Response
```json
{
  "data": {
    "token": "...",
    "subscription": {
       "stripe_id": "sub_1Pk...",
       "status": "active"
    }
  }
}
```

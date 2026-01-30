# DSA Automation System - Documentation

## Overview

A web dashboard that automates the DSA (Disabled Students' Allowance) student onboarding process for Audemic. It monitors Gmail for DSA provider emails, extracts student information, and provisions Audemic Scholar subscriptions.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DSA AUTOMATION DASHBOARD                      │
│                   https://dsa-automation-three.vercel.app            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│   GMAIL API   │          │   AI PARSER   │          │  AUDEMIC API  │
│               │          │               │          │               │
│ • Fetch emails│          │ • Claude/     │          │ • Create user │
│ • Filter DSA  │          │   Gemini      │          │ • Profile     │
│ • Read PDFs   │          │ • Extract:    │          │ • Subscription│
│               │          │   - Name      │          │               │
└───────────────┘          │   - Email     │          └───────────────┘
        │                  │   - PO#       │                  │
        │                  │   - Years     │                  │
        ▼                  └───────────────┘                  ▼
┌───────────────┐                  │                 ┌───────────────┐
│ DSA PROVIDERS │                  ▼                 │    AUDEMIC    │
│               │          ┌───────────────┐         │    BACKEND    │
│ • Remtek      │          │  NAME EXTRACT │         │               │
│ • Invate      │          │   (Fallback)  │         │ • Ruby/Rails  │
│ • Barry B.    │          │               │         │ • PostgreSQL  │
│ • Assistive   │          │ Regex-based   │         │ • Stripe      │
└───────────────┘          │ extraction    │         └───────────────┘
                           └───────────────┘
```

---

## Current Progress

| Component | Status | Notes |
|-----------|--------|-------|
| **Dashboard UI** | ✅ Complete | Next.js app with task cards |
| **Gmail Integration** | ✅ Complete | OAuth, fetch, filter by provider |
| **PDF Extraction** | ✅ Complete | Extracts text from PO attachments |
| **AI Parser** | ✅ Complete | Claude/Gemini extracts structured data |
| **Name Extraction** | ✅ Complete | Robust regex with blacklist filtering |
| **Audemic User Creation** | ✅ Complete | Verified with `Test dsa` provider |
| **Profile Update** | ➖ Merged | Handled in User Creation |
| **Subscription Creation** | ✅ Complete | Verified with `PATCH` method |
| **Email Templates** | ✅ Complete | Welcome emails ready |

---

## Project Structure

```
dsa-automation/
├── app/
│   ├── api/
│   │   ├── admin/automate/     # Main automation endpoint
│   │   ├── auth/               # NextAuth OAuth
│   │   ├── debug/              # Testing endpoints
│   │   ├── gmail/              # Fetch & send emails
│   │   └── sheets/             # Google Sheets logging
│   ├── page.tsx                # Main dashboard UI
│   └── layout.tsx              # App layout
├── lib/
│   ├── audemic-api.ts          # Audemic API calls (WIP)
│   ├── auth.ts                 # NextAuth config
│   ├── automation.ts           # Browser automation (deprecated)
│   ├── gmail.ts                # Gmail API helpers
│   ├── parser.ts               # AI + regex parsing
│   ├── sheets.ts               # Google Sheets API
│   └── templates.ts            # Email templates
└── components/
    └── TaskCard.tsx            # Student request cards
├── scripts/
│   └── postman/                # Postman integration tools
│       ├── list_workspaces.js  # List available workspaces
│       └── list_endpoints.js   # List endpoints in workspace
```

---

## Data Flow

### Step 1: Email Fetching (✅ COMPLETE)
```
Gmail Inbox → Filter by provider domains → Extract PDF text → Return tasks
```

### Step 2: Parsing (✅ COMPLETE)
```
Email body + PDF → AI Parser (Claude/Gemini) → Structured data:
{
  userName: "John Smith",
  userEmail: "john@gmail.com",
  licenseYears: 2,
  poNumber: "PO12345",
  provider: "Remtek"
}
```

### Step### 3. User Provisioning (✅ VERIFIED)
```
Structured data → Audemic API (Production) → Create user (✅) → Create subscription (✅ PATCH)
```

---

## What Works Today

1. **Dashboard** - View all pending DSA requests at https://dsa-automation-three.vercel.app
2. **Email Parsing** - Correctly extracts student name, email, PO number, license years
3. **Provider Detection** - Identifies Remtek, Invate, Barry Bennett, Assistive
4. **Name Extraction** - Fixed to handle all email formats

---

## ✅ API Reference (Verified Production)

### 1. Create User
**Endpoint**: `POST https://www.audemic.app/api/v2/dsa/users/`
**Headers**: `Content-Type: application/json`

**Request Body**:
```json
{
  "dsa_provider": "Test dsa",
  "user": {
    "email": "admin@audemic.io9001",
    "password": "Audemic123",
    "po_number": "PO-12345",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

**Success Response (200 OK)**:
```json
{
  "user_id": 44256,
  "email": "admin@audemic.io9001"
}
```

### 2. Create Subscription
**Endpoint**: `PATCH https://www.audemic.app/api/v2/dsa/subscriptions/`
**Headers**:
- `Content-Type: application/json`
- `x-client: audemic-scholar-mobile`

**Request Body**:
```json
{
  "user_id": "44256",
  "end_date": "10-12-2026"
}
```

**Success Response (200 OK)**:
```json
{
  "subscription": {
    "id": 3745,
    "end_date": "2026-12-10"
  }
}
```

---

## Next Steps

1. **Get API documentation** from developer
2. **Test each endpoint** with curl/Postman
3. **Implement `lib/audemic-api.ts`** with verified endpoints
4. **Wire up "Run Automation" button** to call the API
5. **Add error handling and logging**
6. **Test end-to-end with a real DSA request**

---

## Environment Variables

```env
# Gmail OAuth (✅ Configured)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# AI Parser (✅ Configured)
ANTHROPIC_API_KEY=xxx
# OR
GEMINI_API_KEY=xxx

# Audemic API (❌ NEEDS CONFIG)
AUDEMIC_API_URL=https://www.audemic.app
AUDEMIC_API_KEY=???
AUDEMIC_ADMIN_EMAIL=???
AUDEMIC_ADMIN_PASSWORD=???

# Postman Integration (✅ Configured)
POSTMAN_API_KEY=xxx
POSTMAN_WORKSPACE_ID=xxx
DEFAULT_USER_PASSWORD=xxx
```

---

## Live URLs

- **Dashboard**: https://dsa-automation-three.vercel.app
- **GitHub**: https://github.com/mrmiscellaneous91/dsa-automation

---

## Test User Tracking
To avoid "500 Internal Server Error" (User already exists) during testing, we increment the integer `X` in `X@audemic.io`.

**Current Test User ID**: `3`

---

## Agentic Tools Available

These tools are designed to help AI agents (like Antigravity) understand and interact with external systems.

### Postman Integration
 Located in `scripts/postman/`.

- **`node scripts/postman/list_workspaces.js`**
  - **Purpose**: JSON-formatted list of all available Postman workspaces observable by the API Key.
  - **Usage**: Run this to find the `POSTMAN_WORKSPACE_ID` if it changes or if setting up a new environment.

- **`node scripts/postman/list_endpoints.js`**
  - **Purpose**: Lists all available API endpoints (Method + URL) in the configured workspace.
  - **Usage**: Use this to discover API capabilities, verify endpoint URLs, or check for new API additions without needing to leave the coding environment.
  - **Prerequisites**: Requires `POSTMAN_API_KEY` and `POSTMAN_WORKSPACE_ID` in `.env`.

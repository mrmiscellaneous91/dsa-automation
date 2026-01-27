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
| **Audemic User Creation** | ⚠️ Partial | Endpoint exists, needs verification |
| **Profile Update** | ❌ Not started | Waiting for API details |
| **Subscription Creation** | ❌ Not started | Waiting for API details |
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

### Step 3: User Provisioning (⚠️ BLOCKED)
```
Structured data → Audemic API → Create user + subscription
                      ↑
              WAITING FOR API DETAILS
```

---

## What Works Today

1. **Dashboard** - View all pending DSA requests at https://dsa-automation-three.vercel.app
2. **Email Parsing** - Correctly extracts student name, email, PO number, license years
3. **Provider Detection** - Identifies Remtek, Invate, Barry Bennett, Assistive
4. **Name Extraction** - Fixed to handle all email formats

---

## What's Blocked

### Audemic API Integration

We need these API details to complete the automation:

| Action | Endpoint | Body | Headers | Response |
|--------|----------|------|---------|----------|
| Create User | `???` | `email, password` | `???` | `user_id` |
| Update Profile | `???` | `first_name, last_name, dsa` | `???` | Success |
| Create Subscription | `???` | `user_id, plan, duration` | `???` | `subscription_id` |

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
```

---

## Live URLs

- **Dashboard**: https://dsa-automation-three.vercel.app
- **GitHub**: https://github.com/mrmiscellaneous91/dsa-automation

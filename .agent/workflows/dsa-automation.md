---
description: How to work on the DSA Automation project
---

# DSA Automation Project Context

## What This Project Does
This is an internal tool for Audemic that automates processing DSA (Disabled Students' Allowance) purchase orders. It:
1. Fetches emails from DSA providers (Remtek, Invate, Barry Bennett, etc.)
2. Extracts student info (name, email, PO number, license duration) using AI
3. Creates Audemic Scholar accounts via API
4. Logs transactions to Google Sheets
5. Sends welcome/confirmation emails

## Key Files to Know

| File | Purpose |
|------|---------|
| `lib/parser.ts` | Extracts student info from emails - AI parsing + regex fallbacks |
| `lib/templates.ts` | Email templates (welcome email, confirmation to provider) |
| `lib/audemic-api.ts` | API calls to create users and subscriptions |
| `lib/sheets.ts` | Google Sheets integration for logging |
| `app/api/gmail/` | Gmail API routes for fetching/sending emails |
| `components/TaskCard.tsx` | UI component for each DSA request |

## Running Locally
```bash
cd /Users/joshuamitcham/.gemini/antigravity/scratch/dsa-automation
npm run dev
```
Then open http://localhost:3000

## Deploying Changes
Push to `main` branch - Vercel auto-deploys in ~1-2 minutes.

## Common Tasks

### Adding a New DSA Provider
1. Add email domain to filter in `app/api/gmail/route.ts`
2. Add provider name detection in `lib/parser.ts`
3. Test email extraction with sample emails

### Fixing Name/PO Extraction Issues
1. Check `lib/parser.ts` - look at `extractPONumber()` and `extractStudentNameInternal()`
2. Add new regex patterns for the provider's format
3. Test with `scripts/test_barry_bennett_regex.js` or similar

### Updating Email Templates
Edit `lib/templates.ts` - contains `WELCOME_EMAIL_TEMPLATE` and `CONFIRMATION_EMAIL_TEMPLATE`

### Google Sheets Issues
Check `lib/sheets.ts` - uses `valueInputOption: "USER_ENTERED"` for proper number formatting

## Live URLs
- **Dashboard**: https://dsa-automation-three.vercel.app
- **GitHub**: https://github.com/mrmiscellaneous91/dsa-automation

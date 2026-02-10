# DSA Automation Dashboard

**An internal tool for Audemic that automatically processes DSA (Disabled Students' Allowance) purchase orders and creates student accounts.**

---

## What Does This Do?

When a DSA provider (like Remtek, Invate, or Barry Bennett) emails Audemic with a student's purchase order, this tool:

1. **Reads the email** - Fetches new emails from the Audemic Gmail inbox
2. **Extracts the information** - Uses AI to pull out student name, email, PO number, and license duration
3. **Creates the account** - Automatically provisions an Audemic Scholar subscription
4. **Logs to Google Sheets** - Records the transaction for tracking
5. **Sends emails** - Welcome email to the student, confirmation to the provider

---

## How to Use It

### Daily Use

1. Go to **https://dsa-automation-three.vercel.app**
2. Sign in with the Audemic Google account
3. Click **"Check for New Requests"** to fetch pending DSA emails
4. Review each request card - verify the name, email, and PO are correct
5. Click through each step:
   - **Log to Spreadsheet** → Records the transaction
   - **Automated Provisioning** → Creates the user account
   - **Send Welcome Email** → Emails credentials to student
   - **Confirm to Provider** → Notifies the DSA provider

### If Something Looks Wrong

- **Wrong name?** The AI sometimes picks up extra text. You can manually edit before processing.
- **Missing PO number?** Check if the email format changed from the provider.
- **Error during provisioning?** The user may already exist in Audemic.

---

## Supported DSA Providers

| Provider | Email Domain | Status |
|----------|--------------|--------|
| Remtek | remtek.co.uk | ✅ Working |
| Invate | invate.co.uk | ✅ Working |
| Barry Bennett | barrybennett.co.uk | ✅ Working |
| Sight and Sound | sightandsound.co.uk | ✅ Working |
| Assistive | as-dsa.com | ✅ Working |

---

## Key Files (For Future Reference)

| File | What It Does |
|------|--------------|
| `lib/parser.ts` | Extracts student info from emails using AI + regex |
| `lib/templates.ts` | Email templates (welcome email, confirmation) |
| `lib/audemic-api.ts` | Connects to Audemic backend to create users |
| `lib/sheets.ts` | Logs transactions to Google Sheets |
| `app/api/gmail/` | Fetches and sends emails via Gmail API |

---

## Environment Variables

These are stored in `.env` (never commit this file):

```
GOOGLE_CLIENT_ID=...          # Gmail OAuth
GOOGLE_CLIENT_SECRET=...
GEMINI_API_KEY=...            # AI for parsing emails
SPREADSHEET_ID=...            # Google Sheets ID for logging
DEFAULT_USER_PASSWORD=...     # Default password for new users
```

---

## Deployment

- **Hosted on**: Vercel (auto-deploys from GitHub `main` branch)
- **GitHub**: https://github.com/mrmiscellaneous91/dsa-automation
- **Live URL**: https://dsa-automation-three.vercel.app

### To Deploy Changes

1. Push to `main` branch on GitHub
2. Vercel automatically builds and deploys (takes ~1-2 minutes)

### To Run Locally

```bash
cd dsa-automation
npm install
npm run dev
```

Then open http://localhost:3000

---

## Common Issues & Fixes

### "2" appearing before student names (Barry Bennett)
**Fixed**: The parser now strips leading numbers from PDF table extractions.

### Amounts showing as text in Google Sheets (with apostrophe)
**Fixed**: Changed `valueInputOption` from `RAW` to `USER_ENTERED`.

### Missing links in welcome email
**Fixed**: Added hyperlinks for schedule call and demo.

### Wrong PO number extracted
Check `lib/parser.ts` - the `extractPONumber` function has regex patterns for each provider format.

---

## Contact

For technical issues with this automation, contact the developer or reference the `DOCUMENTATION.md` file for detailed technical information.

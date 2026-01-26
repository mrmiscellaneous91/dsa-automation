// Test with actual Remtek format

function extractPONumber(fullEmailBody) {
    if (!fullEmailBody.includes('[PDF ATTACHMENT CONTENT]')) {
        console.log('[PO Extract] No PDF found in email')
        return ""
    }

    const pdfText = fullEmailBody.substring(fullEmailBody.indexOf('[PDF ATTACHMENT CONTENT]'))
    console.log('[PO Extract] PDF section length:', pdfText.length)

    const patterns = [
        // Pattern 1: Labeled with colon
        /(?:PURCHASE ORDER NO\.|PO NO\.|ORDER NO\.|PO|P\.O\.)\s*:\s*([A-Z0-9]{5,15})/i,

        // Pattern 2: Remtek's concatenated format
        /PO NUMBER.*?[\s\n]+(?:[\d]+\s*\/\s*)?1([0-9]{7})20\d{2}/i,

        // Pattern 3: Standalone alphanumeric codes
        /\b([A-Z]{2,}[0-9]{4,8})\b/,

        // Pattern 4: Standalone numbers 6-10 digits
        /\b([0-9]{6,10})\b/
    ]

    for (let i = 0; i < patterns.length; i++) {
        const match = pdfText.match(patterns[i])
        if (match && match[1]) {
            const po = match[1].trim()

            if (/^20[0-9]{6,}/.test(po)) {
                console.log(`[PO Extract] ⏭️  Pattern ${i + 1} skipped "${po}" (looks like date)`)
                continue
            }

            console.log(`[PO Extract] ✅ Pattern ${i + 1} found: "${po}"`)
            return po
        }
    }

    console.log('[PO Extract] ❌ No PO number found')
    return ""
}

// Actual Remtek email
const remtekEmail = `
Good morning,

Please could you assign the following student an Audemic licence:
Aydil Ganidagli
b.aydil@icloud.com

[PDF ATTACHMENT CONTENT]:

Sub Total258.30
Tax51.66
Grand Total309.96
 
PURCHASE ORDER
Remtek Systems Ltd

PAGEPPO NUMBERPO Date
1 / 150353502026-01-19 09:29:44
`;

console.log("=== TEST: Remtek Format ===");
console.log("Email preview:", remtekEmail.substring(0, 200));
const result = extractPONumber(remtekEmail);
console.log("\nExpected: 5035350");
console.log("Got:", result);
console.log("Pass:", result === "5035350" ? "✅" : "❌");

// Test Invate format still works
const invateEmail = `
Email body
[PDF ATTACHMENT CONTENT]:
PURCHASE ORDER NO.: IPO51565
DATE: 21/01/2026
`;

console.log("\n\n=== TEST: Invate Format ===");
const result2 = extractPONumber(invateEmail);
console.log("Expected: IPO51565");
console.log("Got:", result2);
console.log("Pass:", result2 === "IPO51565" ? "✅" : "❌");

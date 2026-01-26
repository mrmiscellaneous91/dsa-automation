// Test with EXACT Amal email content

function extractPONumber(fullEmailBody) {
    if (!fullEmailBody.includes('[PDF ATTACHMENT CONTENT]')) {
        console.log('[PO Extract] No PDF found in email')
        return ""
    }

    const pdfText = fullEmailBody.substring(fullEmailBody.indexOf('[PDF ATTACHMENT CONTENT]'))
    console.log('[PO Extract] PDF section length:', pdfText.length)
    console.log('[PO Extract] First 300 chars:', pdfText.substring(0, 300))

    const patterns = [
        // Pattern 1: Labeled with colon
        /(?:PURCHASE ORDER NO\.|PO NO\.|ORDER NO\.|PO|P\.O\.)\s*:\s*([A-Z0-9]{5,15})/i,

        // Pattern 2: Remtek format  
        /PO NUMBER.*?[\s\n]+(?:[\d]+\s*\/\s*)?1([0-9]{7})20\d{2}/i,

        // Pattern 3: Standalone alphanumeric codes
        /\b([A-Z]{2,}[0-9]{4,8})\b/,

        // Pattern 4: Standalone numbers starting with 5 or 6
        /\b([56][0-9]{5,9})\b/
    ]

    for (let i = 0; i < patterns.length; i++) {
        console.log(`[PO Extract] Testing pattern ${i + 1}...`)
        const match = pdfText.match(patterns[i])
        if (match && match[1]) {
            const po = match[1].trim()

            if (/^20[0-9]{6,}/.test(po)) {
                console.log(`[PO Extract] ⏭️  Pattern ${i + 1} skipped "${po}" (looks like date)`)
                continue
            }

            if (/^(44|07|01|02|03)[0-9]{8,}/.test(po)) {
                console.log(`[PO Extract] ⏭️  Pattern ${i + 1} skipped "${po}" (looks like phone number)`)
                continue
            }

            console.log(`[PO Extract] ✅ Pattern ${i + 1} found: "${po}"`)
            return po
        } else {
            console.log(`[PO Extract] Pattern ${i + 1} - no match`)
        }
    }

    console.log('[PO Extract] ❌ No PO number found')
    return ""
}

// EXACT content from Amal email
const amalEmail = `PSA and confirm when actioned with end user

Amal Ahmed
amal-ahmed@hotmail.co.uk

Click to chat on WhatsApp<https://api.whatsapp.com/send?phone=447787422427>

[PDF ATTACHMENT CONTENT]:

Invate Limited 
 
9 Apollo Court 
Koppers Way 
Monkton Business Park South 
Hebburn 
NE31 2ES 
 
Tel: 0191 2306680 
Email: accounts@invate.co.uk 
 
Send all invoices to accounts@invate.co.uk 
Quote purchase order number on all invoices 

Purchase Order 
 
   
PURCHASE ORDER NO.: IPO51565 
 
DATE: 21/01/2026 
 
SUPPLIER AUDEMIC Audemic 
`;

console.log("=== TEST: Amal Ahmed Email (Exact Content) ===\n");
const result = extractPONumber(amalEmail);
console.log("\n\nExpected: IPO51565");
console.log("Got:", result);
console.log("Pass:", result === "IPO51565" ? "✅" : "❌");

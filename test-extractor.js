// Test the new simple extractor

function extractPONumber(fullEmailBody) {
    // Step 1: Get just the PDF section
    if (!fullEmailBody.includes('[PDF ATTACHMENT CONTENT]')) {
        console.log('[PO Extract] No PDF found in email')
        return ""
    }

    const pdfText = fullEmailBody.substring(fullEmailBody.indexOf('[PDF ATTACHMENT CONTENT]'))
    console.log('[PO Extract] PDF section length:', pdfText.length)

    // Step 2: Try simple patterns in order of reliability
    const patterns = [
        // Pattern 1: "PURCHASE ORDER NO.: IPO51565" or "PO: 123456"
        /(?:PURCHASE ORDER|ORDER NUMBER|ORDER NO|PO|P\.O\.)[^:]*:\s*([A-Z0-9]+)/i,

        // Pattern 2: Standalone alphanumeric starting with letters (e.g., IPO51565)
        /\b([A-Z]{2,}[0-9]{4,})\b/,

        // Pattern 3: Long standalone number (7+ digits)
        /\b([0-9]{7,})\b/
    ]

    for (let i = 0; i < patterns.length; i++) {
        const match = pdfText.match(patterns[i])
        if (match && match[1]) {
            const po = match[1].trim()
            console.log(`[PO Extract] ✅ Pattern ${i + 1} found: "${po}"`)
            return po
        }
    }

    console.log('[PO Extract] ❌ No PO number found')
    return ""
}

// Test case 1: Invate email with IPO51565
const test1 = `
Some email content
[PDF ATTACHMENT CONTENT]:
PURCHASE ORDER NO.: IPO51565
DATE: 21/01/2026
`;

console.log("\n=== TEST 1: Invate Email ===");
const result1 = extractPONumber(test1);
console.log("Expected: IPO51565");
console.log("Got:", result1);
console.log("Pass:", result1 === "IPO51565" ? "✅" : "❌");

// Test case 2: Long numeric PO
const test2 = `
Email body
[PDF ATTACHMENT CONTENT]:
Order Number: 4477874224273
Some other text
`;

console.log("\n=== TEST 2: Numeric PO ===");
const result2 = extractPONumber(test2);
console.log("Expected: 4477874224273");
console.log("Got:", result2);
console.log("Pass:", result2 === "4477874224273" ? "✅" : "❌");

// Test case 3: Simple PO format
const test3 = `
Email
[PDF ATTACHMENT CONTENT]:
PO: 5078726
More text
`;

console.log("\n=== TEST 3: Simple PO ===");
const result3 = extractPONumber(test3);
console.log("Expected: 5078726");
console.log("Got:", result3);
console.log("Pass:", result3 === "5078726" ? "✅" : "❌");

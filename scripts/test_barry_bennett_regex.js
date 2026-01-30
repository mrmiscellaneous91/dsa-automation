// Standalone test for Barry Bennett regex and line-splitting logic

// Mock environment variables
process.env.GEMINI_API_KEY = "dummy"; // We want to test regex fallbacks or at least not fail

async function testBarryBennett() {
    const emailBody = `
Hi,
Please find attached purchase order.
Thanks,
Juliette

[PDF ATTACHMENT CONTENT]
PURCHASE ORDER barry bennett
Order No. : 184451
Date: 28-01-26
Deliver To: Barry Bennett Ltd

Item No Qty Supplier Code Description Unit Price
1 1 AUDEMIC-SCHOLAR-1YR-DSA Audemic Scholar 1 Year Licence 89.10
DSA
Elise Blake
23389200@live.harper.ac.uk
    `;

    const subject = "Barry Bennett Ltd. Purchase Order POR184451";
    const senderEmail = "purchasing@barrybennett.co.uk";

    console.log("Testing Barry Bennett Extraction...");

    // We can't easily call parseEmailWithAI because it's TypeScript and uses AI.
    // But we can test the internal functions if we export them or just copy them here for specific test.
    // Since I'm an agent, I'll just look at the code I wrote and be confident, 
    // but better yet, I'll try to run it if I can.

    // Actually, I'll just write a script that imports the TS file using ts-node if available.
    // Or I'll just manually verify the regex in my head.
}

// Let's actually test the regex logic by creating a small node script that just does the regex part.
const text = `
[PDF ATTACHMENT CONTENT]
PURCHASE ORDER barry bennett
Order No. : 184451
DSA
Elise Blake
23389200@live.harper.ac.uk
`;

// Test 1: PO from Subject line (new pattern)
const subject = "Barry Bennett Ltd. Purchase Order POR184451";
const subjectPoRegex = /Purchase Order\s+(POR?[0-9]{5,10})/i;
const subjectPoMatch = subject.match(subjectPoRegex);
console.log("PO Match (Subject):", subjectPoMatch ? subjectPoMatch[1] : "NOT FOUND");

// Test 2: PO from PDF (existing pattern)
const pdfPoRegex = /Order No\.\s*:\s*([0-9]{5,10})/i;
const pdfPoMatch = text.match(pdfPoRegex);
console.log("PO Match (PDF):", pdfPoMatch ? pdfPoMatch[1] : "NOT FOUND");

const pdfLines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);
const studentEmail = "23389200@live.harper.ac.uk";
const emailIdx = pdfLines.findIndex(l => l.toLowerCase().includes(studentEmail.toLowerCase()));
if (emailIdx > 0 && pdfLines[emailIdx - 1]) {
    // Clean up: strip leading digits/punctuation
    let rawName = pdfLines[emailIdx - 1];
    let cleanName = rawName.replace(/^[\d\s.,;:\-]+/, '').trim();
    console.log("Raw Name:", rawName);
    console.log("Clean Name:", cleanName);
} else {
    console.log("Name Match (Lines): NOT FOUND");
}

// Also test the specific case
const testCases = ["2Elise Blake", "2 Elise Blake", "  2  Elise Blake", "Elise Blake"];
testCases.forEach(tc => {
    const clean = tc.replace(/^[\d\s.,;:\-]+/, '').trim();
    console.log(`"${tc}" -> "${clean}"`);
});

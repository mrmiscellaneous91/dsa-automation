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

const poRegex = /Order No\.\s*:\s*([0-9]{5,10})/i;
const poMatch = text.match(poRegex);
console.log("PO Match:", poMatch ? poMatch[1] : "NOT FOUND");

const pdfLines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);
const studentEmail = "23389200@live.harper.ac.uk";
const emailIdx = pdfLines.findIndex(l => l.toLowerCase().includes(studentEmail.toLowerCase()));
if (emailIdx > 0 && pdfLines[emailIdx - 1]) {
    console.log("Name Match (Lines):", pdfLines[emailIdx - 1]);
} else {
    console.log("Name Match (Lines): NOT FOUND");
}

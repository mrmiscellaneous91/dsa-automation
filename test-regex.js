// Quick regex test to verify the pattern works

const testPDF = `
PURCHASE ORDER NO.: IPO51565

DATE: 21/01/2026

SUPPLIER AUDEMIC Audemic
`;

const pattern = /(?:PO|P\.O\.|Purchase Order|Order Number|Order No\.?|Order Reference)[^:]*:\s*([A-Z0-9]+)/gi;

console.log("Testing PO extraction regex...");
console.log("Test PDF:", testPDF);
console.log("\nPattern:", pattern);

const matches = [...testPDF.matchAll(pattern)];
console.log("\nMatches found:", matches.length);

matches.forEach((match, i) => {
    console.log(`\nMatch ${i + 1}:`);
    console.log("  Full match:", match[0]);
    console.log("  Captured PO:", match[1]);
});

if (matches.length === 0) {
    console.log("\n❌ NO MATCHES FOUND!");
} else {
    console.log(`\n✅ Successfully extracted: ${matches[0][1]}`);
}

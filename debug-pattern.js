// Debug the Remtek pattern specifically

const text = "PAGEPPO NUMBERPO Date\n1 / 150353502026-01-19 09:29:44";

console.log("Testing string:", text);
console.log("\n");

// Current pattern
const pattern = /PO NUMBER.*?[\s\n]+(?:[\d]+\s*\/\s*)?1([0-9]{7})20\d{2}/i;

console.log("Pattern:", pattern);
const match = text.match(pattern);

if (match) {
    console.log("\nFull match:", match[0]);
    console.log("Captured group 1:", match[1]);
} else {
    console.log("\nNo match!");
}

// Let's try a simpler approach - just find the 7-digit number in the middle
const simpler = /1\s*\/\s*1([0-9]{7})20\d{2}/;
console.log("\n\nSimpler pattern:", simpler);
const match2 = text.match(simpler);

if (match2) {
    console.log("Full match:", match2[0]);
    console.log("Captured group 1:", match2[1]);
} else {
    console.log("No match!");
}

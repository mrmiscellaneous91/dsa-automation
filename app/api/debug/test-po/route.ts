import { NextResponse } from "next/server"

export async function GET() {
    // Test the exact PDF content from the Invate email
    const testPDF = `
PURCHASE ORDER NO.: IPO51565

DATE: 21/01/2026

SUPPLIER AUDEMIC Audemic
`;

    // Test PDF content that might have the 13-digit PO
    const testPDF2 = `
PO: 4477874224273
Order Number: 447787422427
Some other text
`;

    const pattern = /(?:PO|P\.O\.|Purchase Order|Order Number|Order No\.?|Order Reference)[^:]*:\s*([A-Z0-9]+)/gi;

    const results = {
        test1: {
            pdf: testPDF,
            matches: [...testPDF.matchAll(pattern)].map(m => ({
                full: m[0],
                captured: m[1]
            }))
        },
        test2: {
            pdf: testPDF2,
            matches: [...testPDF2.matchAll(pattern)].map(m => ({
                full: m[0],
                captured: m[1]
            }))
        }
    };

    return NextResponse.json(results, { status: 200 });
}

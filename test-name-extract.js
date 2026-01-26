// Test name extraction with actual email content

function extractStudentName(emailBody, studentEmail) {
    if (!studentEmail) {
        console.log('[Name Extract] No student email provided')
        return ""
    }

    // Get only the email body section (before PDF)
    const bodyOnly = emailBody.includes('[PDF ATTACHMENT CONTENT]')
        ? emailBody.substring(0, emailBody.indexOf('[PDF ATTACHMENT CONTENT]'))
        : emailBody

    console.log('[Name Extract] Looking for name near email:', studentEmail)
    console.log('[Name Extract] Body only length:', bodyOnly.length)

    // Find the email in the body
    const emailIndex = bodyOnly.indexOf(studentEmail)
    if (emailIndex === -1) {
        console.log('[Name Extract] Student email not found in body')
        console.log('[Name Extract] Body content:', bodyOnly)
        return ""
    }

    // Get text before the email (usually contains the name)
    const textBeforeEmail = bodyOnly.substring(Math.max(0, emailIndex - 200), emailIndex)
    console.log('[Name Extract] Text before email (full):', JSON.stringify(textBeforeEmail))

    // Look for name patterns in the text before email
    // Pattern 1: Standard capitalized name (e.g., "Amal Ahmed", "John Smith")
    const namePattern1 = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g
    const matches1 = [...textBeforeEmail.matchAll(namePattern1)]
    console.log('[Name Extract] Pattern 1 matches:', matches1.map(m => m[1]))

    // Pattern 2: ALL CAPS name (e.g., "AMAL AHMED")
    const namePattern2 = /([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})?)/g
    const matches2 = [...textBeforeEmail.matchAll(namePattern2)]
    console.log('[Name Extract] Pattern 2 matches:', matches2.map(m => m[1]))

    // Get the last match (closest to email) from either pattern
    const allMatches = [...matches1, ...matches2]
    if (allMatches.length > 0) {
        const lastMatch = allMatches[allMatches.length - 1][1].trim()

        // Filter out common false positives
        const invalidPatterns = ['PDF', 'ATTACHMENT', 'PURCHASE', 'ORDER', 'CONTENT', 'EMAIL', 'YEAR']
        if (invalidPatterns.some(invalid => lastMatch.toUpperCase().includes(invalid))) {
            console.log('[Name Extract] ⏭️  Rejected:', lastMatch, '(common false positive)')
            return ""
        }

        console.log('[Name Extract] ✅ Found name:', lastMatch)
        return lastMatch
    }

    console.log('[Name Extract] ❌ No name pattern found')
    return ""
}

// Actual Amal email from earlier debug
const amalEmail = `PSA and confirm when actioned with end user\r\n\r\nAmal Ahmed\r\namal-ahmed@hotmail.co.uk<mailto:amal-ahmed@hotmail.co.uk>\r\n\r\n[PDF ATTACHMENT CONTENT]:...`;

console.log("=== TEST: Amal Ahmed ===\n");
const result = extractStudentName(amalEmail, "amal-ahmed@hotmail.co.uk");
console.log("\n\nExpected: Amal Ahmed");
console.log("Got:", result);
console.log("Pass:", result === "Amal Ahmed" ? "✅" : "❌");

// Test with Remtek format
const remtekEmail = `Good morning,\n\nPlease could you assign the following student an Audemic licence:\nAydil Ganidagli\nb.aydil@icloud.com\n\n[PDF ATTACHMENT CONTENT]:...`;

console.log("\n\n=== TEST: Aydil Ganidagli ===\n");
const result2 = extractStudentName(remtekEmail, "b.aydil@icloud.com");
console.log("\n\nExpected: Aydil Ganidagli");
console.log("Got:", result2);
console.log("Pass:", result2 === "Aydil Ganidagli" ? "✅" : "❌");

// Test with actual Remtek email format - fixed version

function extractStudentName(emailBody, studentEmail) {
    const bodyOnly = emailBody.includes('[PDF ATTACHMENT CONTENT]')
        ? emailBody.substring(0, emailBody.indexOf('[PDF ATTACHMENT CONTENT]'))
        : emailBody

    console.log('[Name Extract] Looking for name near email:', studentEmail)

    let emailIndex = bodyOnly.indexOf(studentEmail)

    if (emailIndex === -1 && studentEmail.includes('@')) {
        const emailPart = studentEmail.split('<')[0].trim()
        emailIndex = bodyOnly.indexOf(emailPart)
    }

    if (emailIndex === -1) {
        console.log('[Name Extract] Email not found!')
        return ""
    }

    const textBeforeEmail = bodyOnly.substring(Math.max(0, emailIndex - 200), emailIndex)

    // Normalize text - replace newlines with spaces
    const normalizedText = textBeforeEmail.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ')
    console.log('[Name Extract] Normalized text:', normalizedText)

    // Pattern 1: Standard capitalized name (2-5 words)
    const namePattern1 = /([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,4})/g
    const matches1 = [...normalizedText.matchAll(namePattern1)]

    // Pattern 2: ALL CAPS name
    const namePattern2 = /([A-Z]{2,}(?:\s[A-Z]{2,}){1,3})/g
    const matches2 = [...normalizedText.matchAll(namePattern2)]

    // Get all matches as strings
    const allMatches = [...matches1.map(m => m[1]), ...matches2.map(m => m[1])]
    console.log('[Name Extract] Found', allMatches.length, 'potential names:', allMatches)

    // Filter out common labels
    const invalidPatterns = [
        'Student Name', 'Student Email', 'User Name', 'End User',
        'Operations Manager', 'Procurement', 'Best Regards', 'Kind Regards',
        'Good Morning', 'Good Afternoon', 'Hello Joshua', 'Dear Joshua',
        'Audemic Licence', 'Audemic Scholar', 'Please Joshua'
    ]

    const validMatches = allMatches.filter(match => {
        const upper = match.toUpperCase()
        return !invalidPatterns.some(invalid => upper.includes(invalid.toUpperCase()))
    })

    console.log('[Name Extract] Valid matches after filtering:', validMatches)

    if (validMatches.length > 0) {
        const longestMatch = validMatches.reduce((a, b) => a.length > b.length ? a : b)
        console.log('[Name Extract] ✅ Found name:', longestMatch)
        return longestMatch
    }

    return ""
}

// Actual Remtek email
const remtekEmail = `\r\n\r\nHello, Joshua\r\n\r\nPlease can you assign an Audemic Licence  to -\r\n\r\nStudent name -       Segilola Christianah Kikelomo Faleru\r\n\r\n\r\nStudent Email -         segilolaf@gmail.com\r\n\r\n\r\nThanks\r\n\r\nPaul\r\n\r\n[PDF ATTACHMENT CONTENT]:\n\nSub Total173.70`;

console.log("=== TEST: Segilola (Remtek Format) ===\n");
const result = extractStudentName(remtekEmail, "segilolaf@gmail.com");
console.log("\n\nExpected: Segilola Christianah Kikelomo Faleru");
console.log("Got:", result);
console.log("Pass:", result === "Segilola Christianah Kikelomo Faleru" ? "✅" : "❌");

// Test Amal format
const amalEmail = `Amal Ahmed\r\namal-ahmed@hotmail.co.uk<mailto:...>\r\n[PDF ATTACHMENT CONTENT]:`;
console.log("\n\n=== TEST: Amal Ahmed ===\n");
const result2 = extractStudentName(amalEmail, "amal-ahmed@hotmail.co.uk");
console.log("\n\nExpected: Amal Ahmed");
console.log("Got:", result2);
console.log("Pass:", result2 === "Amal Ahmed" ? "✅" : "❌");

// Test Aydil format
const aydilEmail = `Good morning,\n\nPlease could you assign the following student an Audemic licence:\nAydil Ganidagli\nb.aydil@icloud.com\n\n[PDF ATTACHMENT CONTENT]:`;
console.log("\n\n=== TEST: Aydil Ganidagli ===\n");
const result3 = extractStudentName(aydilEmail, "b.aydil@icloud.com");
console.log("\n\nExpected: Aydil Ganidagli");
console.log("Got:", result3);
console.log("Pass:", result3 === "Aydil Ganidagli" ? "✅" : "❌");

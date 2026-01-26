// Final Verification Test

function extractStudentName(emailBody, studentEmail) {
    const bodyOnly = emailBody.includes('[PDF ATTACHMENT CONTENT]')
        ? emailBody.substring(0, emailBody.indexOf('[PDF ATTACHMENT CONTENT]'))
        : emailBody

    const normalizedBody = bodyOnly.toLowerCase()
    const searchEmail = studentEmail.toLowerCase()
    let emailIndex = -1

    let anchor = ""
    if (searchEmail.includes('<') && searchEmail.includes('>')) {
        const match = searchEmail.match(/<([^>]+)>/)
        if (match) anchor = match[1].trim()
    } else if (searchEmail.includes('@') && !searchEmail.includes(' ')) {
        anchor = searchEmail
    } else if (searchEmail.includes('@')) {
        const match = searchEmail.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/)
        if (match) anchor = match[1]
    }

    if (anchor) {
        emailIndex = normalizedBody.indexOf(anchor.toLowerCase())
    }

    if (emailIndex === -1) {
        const personalEmailMatch = bodyOnly.match(/([a-zA-Z0-9._-]+@(?:gmail|hotmail|icloud|outlook|yahoo|live|student|ac\.uk|edu)[a-zA-Z0-9._-]*)/i)
        if (personalEmailMatch) {
            emailIndex = normalizedBody.indexOf(personalEmailMatch[0].toLowerCase())
        }
    }

    if (emailIndex === -1) return "Email not found"

    const textBeforeEmail = bodyOnly.substring(Math.max(0, emailIndex - 250), emailIndex)
    const normalizedText = textBeforeEmail.replace(/[\r\n\t\u2000-\u200B]+/g, ' ').replace(/\s+/g, ' ')

    const namePattern1 = /\b([A-Z][A-Za-z'-]+(?:\s[A-Z][A-Za-z'-]+)+)\b/g
    const matches1 = [...normalizedText.matchAll(namePattern1)]

    const namePattern2 = /\b([A-Z]{2,}(?:\s[A-Z]{2,})+)\b/g
    const matches2 = [...normalizedText.matchAll(namePattern2)]

    const allMatches = [...matches1.map(m => m[1]), ...matches2.map(m => m[1])]

    const invalidPatterns = [
        'Student Name', 'Student Email', 'User Name', 'End User',
        'Operations Manager', 'Procurement', 'Best Regards', 'Kind Regards',
        'Good Morning', 'Good Afternoon', 'Hello Joshua', 'Dear Joshua',
        'Audemic Licence', 'Audemic Scholar', 'Please Joshua', 'Joshua Please'
    ]

    const validMatches = allMatches
        .map(match => {
            let cleaned = match.trim()
            const labelPattern = /\s+(Student|Email|User|Status|Name|Licence|Scholar|Dear|Hello|Best|Regards|Morning|Afternoon|Joshua)$/i
            for (let i = 0; i < 3; i++) {
                if (labelPattern.test(cleaned)) {
                    cleaned = cleaned.replace(labelPattern, '').trim()
                } else {
                    break
                }
            }
            return cleaned
        })
        .filter(match => {
            const upper = match.toUpperCase()
            const wordCount = match.split(/\s+/).length
            if (wordCount < 2 || wordCount > 6) return false
            return !invalidPatterns.some(invalid => upper.includes(invalid.toUpperCase()))
        })

    if (validMatches.length > 0) {
        return validMatches[validMatches.length - 1]
    }

    return "No match"
}

// Case 1: Remtek with weird spaces
const remtekEmail = `\r\n\r\nHello, Joshua\r\n\r\nPlease can you assign an Audemic Licence  to -\r\n\r\nStudent name -       Segilola Christianah Kikelomo Faleru\r\n\r\n\r\nStudent Email -         segilolaf@gmail.com`;

console.log("=== FINAL TEST: Segilola ===\n");
const resultSeg = extractStudentName(remtekEmail, "segilolaf@gmail.com");
console.log("Expected: Segilola Christianah Kikelomo Faleru");
console.log("Got:", resultSeg);
console.log("Pass:", resultSeg === "Segilola Christianah Kikelomo Faleru" ? "✅" : "❌");

// Case 2: Buggy AI extraction
console.log("\n=== FINAL TEST: Bug Case (AI extracts Name <email>) ===\n");
const resultBug = extractStudentName(remtekEmail, "Segilola Christianah Kikelomo Faleru <segilolaf@gmail.com>");
console.log("Expected: Segilola Christianah Kikelomo Faleru");
console.log("Got:", resultBug);
console.log("Pass:", resultBug === "Segilola Christianah Kikelomo Faleru" ? "✅" : "❌");

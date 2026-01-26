import { NextResponse } from "next/server"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email') || 'amal-ahmed@hotmail.co.uk'

    // Simulate what our name extractor does
    const testBody = `PSA and confirm when actioned with end user\r\n\r\nAmal Ahmed\r\namal-ahmed@hotmail.co.uk<mailto:amal-ahmed@hotmail.co.uk>\r\n\r\n[cid:image001.png]\r\nVicki Ravensdale\r\nOperations Manager\r\n[PDF ATTACHMENT CONTENT]:\n\nInvate Limited...`

    const bodyOnly = testBody.includes('[PDF ATTACHMENT CONTENT]')
        ? testBody.substring(0, testBody.indexOf('[PDF ATTACHMENT CONTENT]'))
        : testBody

    const emailIndex = bodyOnly.indexOf(email)
    const textBeforeEmail = emailIndex > 0 ? bodyOnly.substring(Math.max(0, emailIndex - 200), emailIndex) : "Email not found"

    // Name patterns
    const namePattern1 = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g
    const matches1 = [...textBeforeEmail.matchAll(namePattern1)]

    const namePattern2 = /([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})?)/g
    const matches2 = [...textBeforeEmail.matchAll(namePattern2)]

    const allMatches = [...matches1.map(m => m[1]), ...matches2.map(m => m[1])]

    return NextResponse.json({
        inputEmail: email,
        bodyOnlyLength: bodyOnly.length,
        emailFoundAtIndex: emailIndex,
        textBeforeEmail: textBeforeEmail,
        pattern1Matches: matches1.map(m => m[1]),
        pattern2Matches: matches2.map(m => m[1]),
        allMatches: allMatches,
        finalName: allMatches.length > 0 ? allMatches[allMatches.length - 1] : "NO MATCH"
    })
}

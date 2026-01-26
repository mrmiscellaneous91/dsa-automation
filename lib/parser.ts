import Anthropic from "@anthropic-ai/sdk"
import { GoogleGenerativeAI } from "@google/generative-ai"

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "dummy",
})

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy")

export interface ParsedRequest {
    provider: "Remtek" | "Invate" | "Assistive" | "Barry Bennett" | "Unknown"
    providerContact: string
    userName: string
    firstName?: string
    lastName?: string
    userEmail: string
    licenseYears: number
    poNumber: string
}

/**
 * Simple PO number extractor - extracts from PDF section only
 */
function extractPONumber(fullEmailBody: string): string {
    // Step 1: Get just the PDF section
    const pdfMarker = /\[PDF ATTACHMENT CONTENT\]/i
    const markerMatch = fullEmailBody.match(pdfMarker)
    if (!markerMatch) {
        console.log('[PO Extract] No PDF found in email')
        return ""
    }

    const pdfText = fullEmailBody.substring(markerMatch.index!)
    console.log('[PO Extract] PDF section length:', pdfText.length)

    // Step 2: Try patterns in order of reliability
    const patterns = [
        /(?:PURCHASE ORDER NO\.|PO NO\.|ORDER NO\.|PO|P\.O\.)\s*:\s*([A-Z0-9]{5,15})/i,
        /PO NUMBER.*?[\s\n]+(?:[\d]+\s*\/\s*)?1([0-9]{7})20\d{2}/i,
        /\b([A-Z]{2,}[0-9]{4,8})\b/,
        /\b([56][0-9]{5,9})\b/
    ]

    for (let i = 0; i < patterns.length; i++) {
        const match = pdfText.match(patterns[i])
        if (match && match[1]) {
            const po = match[1].trim()
            if (/^20[0-9]{6,}/.test(po)) continue // Skip dates
            if (/^(44|07|01|02|03)[0-9]{8,}/.test(po)) continue // Skip phone numbers
            console.log(`[PO Extract] ✅ Found: "${po}"`)
            return po
        }
    }

    return ""
}

/**
 * Extract student name from email body by finding text near the student email
 */
function extractStudentName(emailBody: string, studentEmail: string): string {
    if (!studentEmail) {
        console.log('[Name Extract] No student email provided')
        return ""
    }

    // Get only the email body section (before PDF)
    const pdfMarker = /\[PDF ATTACHMENT CONTENT\]/i
    const markerMatch = emailBody.match(pdfMarker)
    const bodyOnly = markerMatch ? emailBody.substring(0, markerMatch.index) : emailBody

    console.log('[Name Extract] Looking for name near email:', studentEmail)
    console.log('[Name Extract] Body length:', bodyOnly.length)

    // Find the email in the body (case-insensitive)
    const normalizedBody = bodyOnly.toLowerCase()
    const searchEmail = studentEmail.toLowerCase()
    let emailIndex = -1

    // Try to find the most "email-like" part of searchEmail to use as anchor
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
        console.log('[Name Extract] Using anchor for search:', anchor)
        emailIndex = normalizedBody.indexOf(anchor.toLowerCase())
    }

    // if anchor not found, try finding ANY personal email in the body
    if (emailIndex === -1) {
        console.log('[Name Extract] No anchor match, trying fallback to find any personal email...')
        const personalEmailMatch = bodyOnly.match(/([a-zA-Z0-9._-]+@(?:gmail|hotmail|icloud|outlook|yahoo|live|student|ac\.uk|edu)[a-zA-Z0-9._-]*)/i)
        if (personalEmailMatch) {
            console.log('[Name Extract] Fallback to found personal email:', personalEmailMatch[0])
            emailIndex = normalizedBody.indexOf(personalEmailMatch[0].toLowerCase())
        }
    }

    // Helper to extract matches from any text block
    const invalidPatterns = [
        'Student Name', 'Student Email', 'User Name', 'End User',
        'Operations Manager', 'Procurement', 'Best Regards', 'Kind Regards',
        'Good Morning', 'Good Afternoon', 'Hello Joshua', 'Dear Joshua',
        'Audemic Licence', 'Audemic Scholar', 'Licence', 'Scholar', 'Please', 'Support', 'Audemic'
    ]

    const processMatches = (text: string) => {
        const normalizedText = text.replace(/[\r\n\t\u2000-\u200B]+/g, ' ').replace(/\s+/g, ' ')
        const namePattern1 = /\b([A-Z][A-Za-z'-]+(?:\s[A-Z][A-Za-z'-]+)+)\b/g
        const namePattern2 = /\b([A-Z]{2,}(?:\s[A-Z]{2,})+)\b/g

        const rawMatches = [...normalizedText.matchAll(namePattern1), ...normalizedText.matchAll(namePattern2)]
        const labelPattern = /\s+(Student|Email|User|Status|Name|Licence|Scholar|Dear|Hello|Best|Regards|Morning|Afternoon|Joshua)$/i

        return rawMatches
            .map(m => {
                let cleaned = m[1].trim()
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
    }

    if (emailIndex !== -1) {
        // Get text before the email (usually contains the name)
        const textBeforeEmail = bodyOnly.substring(Math.max(0, emailIndex - 250), emailIndex)
        const validMatches = processMatches(textBeforeEmail)

        if (validMatches.length > 0) {
            const bestMatch = validMatches[validMatches.length - 1]
            console.log('[Name Extract] ✅ Found name near email:', bestMatch)
            return bestMatch
        }
    }

    // FINAL FALLBACK: Search the entire body for any valid-looking name
    console.log('[Name Extract] Still no name, searching entire body for patterns...')
    const globalMatches = processMatches(bodyOnly)
    if (globalMatches.length > 0) {
        const bestFallback = globalMatches[0]
        console.log('[Name Extract] ✅ Global fallback found name:', bestFallback)
        return bestFallback
    }

    console.log('[Name Extract] ❌ No name found anywhere in body')
    return ""
}

export async function parseEmailWithAI(emailBody: string, subject: string, senderEmail: string): Promise<ParsedRequest> {
    const senderLower = senderEmail.toLowerCase()
    let identifiedProvider: ParsedRequest['provider'] = "Unknown"

    if (senderLower.includes("barrybennett.co.uk")) identifiedProvider = "Barry Bennett"
    else if (senderLower.includes("remtek-online.co.uk")) identifiedProvider = "Remtek"
    else if (senderLower.includes("invate.co.uk")) identifiedProvider = "Invate"
    else if (senderLower.includes("as-dsa.com") || senderLower.includes("unleashedsoftware.com")) identifiedProvider = "Assistive"

    const prompt = `
    You are extracting student information from a DSA provider email.
    
    IMPORTANT: This email has TWO sections:
    1. EMAIL BODY - contains student name and email
    2. [PDF ATTACHMENT CONTENT] - contains order details (ignore this section for name extraction)
    
    TASK: Extract the following from the EMAIL BODY section ONLY (the part BEFORE "[PDF ATTACHMENT CONTENT]"):
    
    1. STUDENT NAME: 
       - Find the name that appears near the student's email address
       - It's often in format: "Amal Ahmed" or "AMAL AHMED" 
       - This is usually 1-2 lines BEFORE the email address
       - DO NOT use "PDF ATTACHMENT CONTENT" as a name
       - DO NOT use the provider contact's name (${senderEmail})
    
    2. STUDENT EMAIL:
       - Personal email address (gmail, hotmail, outlook, university, etc.)
       - NOT the provider's email (${senderEmail})
    
    3. LICENSE YEARS:
       - Look for "3 year" or "three year" → return 3
       - Look for "2 year" → return 2
       - Default → return 1
    
    EMAIL CONTENT:
    ${emailBody}
    
    Return ONLY valid JSON (no markdown):
    {
      "provider": "${identifiedProvider}",
      "providerContact": "Sender first name",
      "userName": "Student Full Name",
      "firstName": "First",
      "lastName": "Last",
      "userEmail": "student@email.com",
      "licenseYears": 1,
      "poNumber": ""
    }
  `

    // Try Claude (Anthropic) if API key exists
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "dummy") {
        try {
            console.log("[Parser] Sending request to Claude 3.5 Sonnet...")
            const msg = await anthropic.messages.create({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 1024,
                messages: [{ role: "user", content: prompt }]
            })

            const text = (msg.content[0] as any).text
            console.log("[Parser] Claude Raw Response:", text)

            const jsonStart = text.indexOf("{")
            const jsonEnd = text.lastIndexOf("}") + 1

            if (jsonStart !== -1 && jsonEnd > jsonStart) {
                const jsonStr = text.substring(jsonStart, jsonEnd)
                const parsed = JSON.parse(jsonStr)
                if (!parsed.provider || parsed.provider === "Unknown") parsed.provider = identifiedProvider

                // ALWAYS use regex extraction for PO number
                parsed.poNumber = extractPONumber(emailBody) || "⚠️ NOT FOUND"

                // ALWAYS use proximity-based name extraction
                console.log('[Parser] Using proximity extraction...')
                const extractedName = extractStudentName(emailBody, parsed.userEmail)

                if (extractedName) {
                    parsed.userName = extractedName
                    const nameParts = extractedName.split(/\s+/)
                    parsed.firstName = nameParts[0]
                    parsed.lastName = nameParts.slice(1).join(' ') || nameParts[0]
                } else {
                    console.warn('[Parser] ⚠️  Name extraction failed completely')
                    parsed.userName = "⚠️ Name Not Found"
                }

                return parsed
            }
        } catch (error) {
            console.error("Claude Parsing Error:", error)
        }
    }

    // Fallback to Gemini 1.5 Flash if Claude fails or key is missing
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "dummy") {
        try {
            console.log("[Parser] Fallback to Gemini 1.5 Flash...")
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
            const result = await model.generateContent(prompt)
            const text = result.response.text()
            const jsonStart = text.indexOf("{")
            const jsonEnd = text.lastIndexOf("}") + 1
            if (jsonStart !== -1 && jsonEnd > jsonStart) {
                const jsonStr = text.substring(jsonStart, jsonEnd)
                const parsed = JSON.parse(jsonStr)
                if (!parsed.provider || parsed.provider === "Unknown") parsed.provider = identifiedProvider

                // ALWAYS use regex extraction for PO number
                parsed.poNumber = extractPONumber(emailBody) || "⚠️ NOT FOUND"

                // ALWAYS use proximity-based name extraction
                console.log('[Parser] Using proximity extraction...')
                const extractedName = extractStudentName(emailBody, parsed.userEmail)

                if (extractedName) {
                    parsed.userName = extractedName
                    const nameParts = extractedName.split(/\s+/)
                    parsed.firstName = nameParts[0]
                    parsed.lastName = nameParts.slice(1).join(' ') || nameParts[0]
                } else {
                    console.warn('[Parser] ⚠️  Name extraction failed completely')
                    parsed.userName = "⚠️ Name Not Found"
                }

                return parsed
            }
        } catch (e) {
            console.error("Gemini Fallback Error:", e)
        }
    }

    return fallbackParse(emailBody, subject, senderEmail, identifiedProvider)
}

function fallbackParse(body: string, subject: string, senderEmail: string, provider: ParsedRequest['provider']): ParsedRequest {
    console.log('[Fallback Parser] AI parsing failed, using fallback...')

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const emails = body.match(emailRegex) || []
    const senderAddress = senderEmail.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || ""
    const studentEmail = emails.find(e => e.toLowerCase() !== senderAddress.toLowerCase()) || emails[0] || ""

    const studentName = extractStudentName(body, studentEmail) || "⚠️ Name Not Found"
    const nameParts = studentName.includes('⚠️') ? [] : studentName.split(/\s+/)

    const bodyLower = body.toLowerCase()

    return {
        provider,
        providerContact: "Team",
        userName: studentName,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(' ') || nameParts[0] || "",
        userEmail: studentEmail,
        licenseYears: bodyLower.includes("3 year") ? 3 : bodyLower.includes("2 year") ? 2 : bodyLower.includes("4 year") ? 4 : 1,
        poNumber: extractPONumber(body) || "⚠️ NOT FOUND",
    }
}

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
    if (!fullEmailBody.includes('[PDF ATTACHMENT CONTENT]')) {
        console.log('[PO Extract] No PDF found in email')
        return ""
    }

    const pdfText = fullEmailBody.substring(fullEmailBody.indexOf('[PDF ATTACHMENT CONTENT]'))
    console.log('[PO Extract] PDF section length:', pdfText.length)
    console.log('[PO Extract] First 300 chars:', pdfText.substring(0, 300))

    // Step 2: Try patterns in order of reliability
    const patterns = [
        // Pattern 1: Labeled with colon "PURCHASE ORDER NO.: IPO51565" or "PO: 123456"
        /(?:PURCHASE ORDER NO\.|PO NO\.|ORDER NO\.|PO|P\.O\.)\s*:\s*([A-Z0-9]{5,15})/i,

        // Pattern 2: Remtek's concatenated format "PAGEPPO NUMBERPO Date\n1 / 150353502026"
        // Extracts exactly 7-digit PO from format like "1 / 150353502026"
        /PO NUMBER.*?[\s\n]+(?:[\d]+\s*\/\s*)?1([0-9]{7})20\d{2}/i,

        // Pattern 3: Standalone alphanumeric codes (e.g., IPO51565)
        /\b([A-Z]{2,}[0-9]{4,8})\b/,

        // Pattern 4: Standalone numbers 6-10 digits (avoid dates by limiting to 10 max)
        /\b([56][0-9]{5,9})\b/  // Must start with 5 or 6 (typical PO prefixes)
    ]

    for (let i = 0; i < patterns.length; i++) {
        console.log(`[PO Extract] Testing pattern ${i + 1}...`)
        const match = pdfText.match(patterns[i])
        if (match && match[1]) {
            const po = match[1].trim()

            // Skip if it looks like a date (contains typical date year like 2024-2026)
            if (/^20[0-9]{6,}/.test(po)) {
                console.log(`[PO Extract] ⏭️  Pattern ${i + 1} skipped "${po}" (looks like date)`)
                continue
            }

            // Skip if it looks like a phone number
            if (/^(44|07|01|02|03)[0-9]{8,}/.test(po)) {
                console.log(`[PO Extract] ⏭️  Pattern ${i + 1} skipped "${po}" (looks like phone number)`)
                continue
            }

            console.log(`[PO Extract] ✅ Pattern ${i + 1} found: "${po}"`)
            return po
        } else {
            console.log(`[PO Extract] Pattern ${i + 1} - no match`)
        }
    }

    console.log('[PO Extract] ❌ No PO number found')
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
    const bodyOnly = emailBody.includes('[PDF ATTACHMENT CONTENT]')
        ? emailBody.substring(0, emailBody.indexOf('[PDF ATTACHMENT CONTENT]'))
        : emailBody

    console.log('[Name Extract] Looking for name near email:', studentEmail)
    console.log('[Name Extract] Body length:', bodyOnly.length)

    // Find the email in the body
    let emailIndex = bodyOnly.indexOf(studentEmail)

    // If exact email not found, try finding without the mailto wrapper
    if (emailIndex === -1 && studentEmail.includes('@')) {
        const emailPart = studentEmail.split('<')[0].trim()
        emailIndex = bodyOnly.indexOf(emailPart)
        if (emailIndex !== -1) {
            console.log('[Name Extract] Found email variant:', emailPart)
        }
    }

    if (emailIndex === -1) {
        console.log('[Name Extract] Email not found in body, trying fallback to find any name pattern...')
        // Fallback: just find any name in the body
        const namePattern = /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/
        const match = bodyOnly.match(namePattern)
        if (match) {
            const name = match[1].trim()
            const invalidPatterns = ['PDF', 'ATTACHMENT', 'PURCHASE', 'ORDER', 'CONTENT', 'EMAIL', 'YEAR', 'Vicki', 'Operations', 'Manager']
            if (!invalidPatterns.some(invalid => name.includes(invalid))) {
                console.log('[Name Extract] ✅ Fallback found name:', name)
                return name
            }
        }
        console.log('[Name Extract] ❌ No valid name found in fallback')
        return ""
    }

    // Get text before the email (usually contains the name)
    const textBeforeEmail = bodyOnly.substring(Math.max(0, emailIndex - 200), emailIndex)
    console.log('[Name Extract] Text before email (last 100 chars):', textBeforeEmail.substring(Math.max(0, textBeforeEmail.length - 100)))

    // Look for name patterns in the text before email
    // First, normalize the text - replace multiple whitespace with single space
    const normalizedText = textBeforeEmail.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ')
    console.log('[Name Extract] Normalized text:', normalizedText)

    // Pattern 1: Standard capitalized name (2-5 words, letters only)
    const namePattern1 = /([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,4})/g
    const matches1 = [...normalizedText.matchAll(namePattern1)]

    // Pattern 2: ALL CAPS name (e.g., "AMAL AHMED")
    const namePattern2 = /([A-Z]{2,}(?:\s[A-Z]{2,}){1,3})/g
    const matches2 = [...normalizedText.matchAll(namePattern2)]

    // Get all matches as strings
    const allMatches = [...matches1.map(m => m[1]), ...matches2.map(m => m[1])]
    console.log('[Name Extract] Found', allMatches.length, 'potential names:', allMatches)

    // Filter out common labels/false positives
    const invalidPatterns = [
        'Student Name', 'Student Email', 'User Name', 'End User',
        'Operations Manager', 'Procurement', 'Best Regards', 'Kind Regards',
        'Good Morning', 'Good Afternoon', 'Hello Joshua', 'Dear Joshua',
        'Audemic Licence', 'Audemic Scholar', 'Please Joshua', 'Joshua Please'
    ]

    const validMatches = allMatches
        .map(match => {
            // Clean up: remove trailing "Student" or "Student Email" or "Email"
            return match
                .replace(/\s+Student\s+Email$/i, '')
                .replace(/\s+Student$/i, '')
                .replace(/\s+Email$/i, '')
                .trim()
        })
        .filter(match => {
            const upper = match.toUpperCase()
            // Names should usually be 2+ words and not be one of the labels
            const wordCount = match.split(/\s+/).length
            if (wordCount < 2) return false

            return !invalidPatterns.some(invalid => upper.includes(invalid.toUpperCase()))
        })

    console.log('[Name Extract] Valid matches after filtering:', validMatches)

    if (validMatches.length > 0) {
        // Pick the LONGEST match (actual names are usually longer than false positives)
        const longestMatch = validMatches.reduce((a, b) => a.length > b.length ? a : b)
        console.log('[Name Extract] ✅ Found name:', longestMatch)
        return longestMatch
    }

    console.log('[Name Extract] ❌ No name pattern found')
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

                // ALWAYS use regex extraction for PO number (don't trust AI for this)
                console.log('[Parser] Using regex to extract PO number...')
                parsed.poNumber = extractPONumber(emailBody)

                if (!parsed.poNumber) {
                    console.error('[Parser] ❌ PO extraction failed')
                    parsed.poNumber = "⚠️ NOT FOUND"
                }

                // ALWAYS use proximity-based name extraction (more reliable than AI)
                console.log('[Parser] Using proximity extraction for student name...')
                console.log('[Parser] AI extracted email:', parsed.userEmail)

                let extractedName = extractStudentName(emailBody, parsed.userEmail)

                // If that failed, try to find a personal email in the body and extract name near that
                if (!extractedName) {
                    console.log('[Parser] Primary extraction failed, trying fallback...')
                    // Find any personal email (gmail, hotmail, icloud, etc.) in the body before PDF
                    const bodyOnly = emailBody.includes('[PDF ATTACHMENT CONTENT]')
                        ? emailBody.substring(0, emailBody.indexOf('[PDF ATTACHMENT CONTENT]'))
                        : emailBody
                    const personalEmailMatch = bodyOnly.match(/([a-zA-Z0-9._-]+@(?:gmail|hotmail|icloud|outlook|yahoo|live|student|ac\.uk|edu)[a-zA-Z0-9._-]*)/i)
                    if (personalEmailMatch) {
                        console.log('[Parser] Found personal email in body:', personalEmailMatch[0])
                        extractedName = extractStudentName(emailBody, personalEmailMatch[0])
                    }
                }

                // Final assignment
                if (extractedName) {
                    parsed.userName = extractedName
                    const nameParts = extractedName.split(/\s+/)
                    parsed.firstName = nameParts[0]
                    parsed.lastName = nameParts.slice(1).join(' ') || nameParts[0]
                    console.log('[Parser] ✅ Final name:', extractedName)
                } else {
                    console.warn('[Parser] ⚠️  Name extraction failed completely')
                    parsed.userName = "⚠️ Name Not Found"
                }

                return parsed
            } else {
                throw new Error("No valid JSON found in AI response")
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
                console.log('[Parser] Using regex to extract PO number...')
                parsed.poNumber = extractPONumber(emailBody)

                if (!parsed.poNumber) {
                    console.error('[Parser] ❌ PO extraction failed')
                    parsed.poNumber = "⚠️ NOT FOUND"
                }

                // ALWAYS use proximity-based name extraction
                console.log('[Parser] Using proximity extraction for student name...')
                console.log('[Parser] AI extracted email:', parsed.userEmail)

                let extractedName = extractStudentName(emailBody, parsed.userEmail)

                // If that failed, try to find a personal email in the body
                if (!extractedName) {
                    console.log('[Parser] Primary extraction failed, trying fallback...')
                    const bodyOnly = emailBody.includes('[PDF ATTACHMENT CONTENT]')
                        ? emailBody.substring(0, emailBody.indexOf('[PDF ATTACHMENT CONTENT]'))
                        : emailBody
                    const personalEmailMatch = bodyOnly.match(/([a-zA-Z0-9._-]+@(?:gmail|hotmail|icloud|outlook|yahoo|live|student|ac\.uk|edu)[a-zA-Z0-9._-]*)/i)
                    if (personalEmailMatch) {
                        console.log('[Parser] Found personal email in body:', personalEmailMatch[0])
                        extractedName = extractStudentName(emailBody, personalEmailMatch[0])
                    }
                }

                if (extractedName) {
                    parsed.userName = extractedName
                    const nameParts = extractedName.split(/\s+/)
                    parsed.firstName = nameParts[0]
                    parsed.lastName = nameParts.slice(1).join(' ') || nameParts[0]
                    console.log('[Parser] ✅ Final name:', extractedName)
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

    // Extract only email body (before PDF section) for name extraction
    const emailBodyOnly = body.includes('[PDF ATTACHMENT CONTENT]')
        ? body.substring(0, body.indexOf('[PDF ATTACHMENT CONTENT]'))
        : body

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const emails = body.match(emailRegex) || []
    const senderAddress = senderEmail.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || ""
    const studentEmail = emails.find(e => e.toLowerCase() !== senderAddress.toLowerCase()) || emails[0] || ""

    // Look for name in email body only, exclude common non-names
    const nameMatch = emailBodyOnly.match(/[A-Z]{2,}\s[A-Z]{2,}(\s[A-Z]{2,})?/)
    const extractedName = nameMatch ? nameMatch[0] : ""

    // Filter out common false positives
    const invalidNames = ['PDF ATTACHMENT', 'ATTACHMENT CONTENT', 'PURCHASE ORDER']
    const isValidName = extractedName && !invalidNames.some(invalid => extractedName.includes(invalid))

    const studentName = isValidName ? extractedName : "⚠️ Name Not Found"
    const nameParts = isValidName ? extractedName.split(/\s+/) : []

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

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
 * Extracts PO number by searching Subject, Body, and PDF sections
 */
function extractPONumber(fullEmailBody: string, subject: string = ""): string {
    // 1. Combine searchable text
    const searchableText = (subject + "\n" + fullEmailBody).trim()
    console.log(`[PO Extract] Searching text (len: ${searchableText.length})`)

    // 2. High-reliability patterns
    const patterns = [
        // Labeled: "PO: 5107980" or "Purchase Order No: IPO51565"
        /(?:PURCHASE ORDER NO\.|PO NO\.|ORDER NO\.|PO|P\.O\.)\s*[:\-\s]\s*([A-Z]*[0-9]{5,15})/i,

        // Remtek Jammed Pattern in PDF: "1 / 151079802026" (Page 1/1, then PO, then Year)
        // We look for "1" + 7 digit PO starting with 5 or 6 + 2026
        /1([56][0-9]{6})20[2-3][0-9]/,

        // Standalone Alphanumeric (e.g. IPO51565)
        /\b(IPO[0-9]{5,8})\b/i,

        // Standalone 7-8 digit numbers starting with 5 or 6 (typical PO ranges)
        /\b([56][0-9]{6,8})\b/,

        // Barry Bennett specific: "Order No. : 184451"
        /Order No\.\s*:\s*([0-9]{5,10})/i
    ]

    for (let i = 0; i < patterns.length; i++) {
        const match = searchableText.match(patterns[i])
        if (match && match[1]) {
            const po = match[1].trim()
            // Validate: not a date, not a phone number
            if (/^20[0-9]{6}/.test(po)) continue // Date
            if (/^(44|07|01|02|03)[0-9]{8,}/.test(po)) continue // Phone
            console.log(`[PO Extract] ✅ Success with pattern ${i + 1}: ${po}`)
            return po
        }
    }

    console.log('[PO Extract] ❌ No match found')
    return ""
}

/**
 * Extracts license years from email body
 */
function extractLicenseYears(body: string): number {
    const text = body.toLowerCase()

    if (text.includes("4 year") || text.includes("four year")) return 4
    if (text.includes("3 year") || text.includes("three year")) return 3
    if (text.includes("2 year") || text.includes("two year")) return 2

    // Default to 1
    return 1
}

/**
 * Robust Student Name Extractor
 */
export function extractStudentName(emailBody: string, studentEmail: string): string {
    return extractStudentNameInternal(emailBody, studentEmail, "Unknown")
}

function extractStudentNameInternal(emailBody: string, studentEmail: string, identifiedProvider: string): string {
    if (!studentEmail) return ""

    // 1. Isolate Body from PDF for initial proximity check
    const marker = /\[PDF ATTACHMENT CONTENT\]/i
    const markerMatch = emailBody.match(marker)
    const bodyOnly = markerMatch ? emailBody.substring(0, markerMatch.index || 0) : emailBody
    const pdfContent = markerMatch ? emailBody.substring(markerMatch.index || 0) : ""

    const normalizedBody = emailBody.toLowerCase()

    // Blacklist / System Names
    const blacklist = [
        'Student Name', 'Student Email', 'Purchase Order', 'PDF Attachment',
        'Operations Manager', 'Procurement Specialist', 'Audemic Licence',
        'Audemic Scholar', 'Joshua Mitcham', 'Paul Williamson', 'Vicki Ravensdale',
        'Team Audemic', 'Support Team', 'Mimecast Ltd', 'Mimecast', 'Barry Bennett Ltd',
        'Barry Bennett', 'Juliette Gallacher'
    ]

    // Extraction Logic
    const process = (sourceText: string) => {
        const text = sourceText.replace(/[\r\n\t\u2000-\u200B]+/g, ' ').replace(/\s+/g, ' ')
        const p1 = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,4})\b/g
        const p2 = /\b([A-Z]{2,}(?:\s[A-Z]{2,}){1,3})\b/g

        const raw = [...text.matchAll(p1), ...text.matchAll(p2)]
        const suffixLabel = /\s+(Student|Email|User|Status|Name|Licence|Scholar|Dear|Hello|Best|Regards|Morning|Afternoon|PO|Order|Date|Ref)$/i

        return raw.map(m => {
            let n = m[1].trim()
            for (let i = 0; i < 3; i++) n = n.replace(suffixLabel, '').trim()
            return n
        }).filter(n => {
            const words = n.split(' ').length
            if (words < 2 || words > 5) return false
            const up = n.toUpperCase()
            return !blacklist.some(b => up.includes(b.toUpperCase()))
        })
    }

    // Try proximity in body first
    let anchor = studentEmail.toLowerCase()
    const emailIndex = bodyOnly.toLowerCase().indexOf(anchor)
    if (emailIndex !== -1) {
        const window = bodyOnly.substring(Math.max(0, emailIndex - 250), emailIndex)
        const matches = process(window)
        if (matches.length > 0) {
            console.log(`[Name Extract] ✅ Body Proximity Match: ${matches[matches.length - 1]}`)
            return matches[matches.length - 1]
        }
    }

    // Special Barry Bennett Pattern in PDF
    if (identifiedProvider === "Barry Bennett" && pdfContent) {
        // Look for "DSA \n Name \n Email" or similar.
        // Emails are great anchors. Look for the line above the email.
        const lines = pdfContent.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0)
        let anchor = studentEmail.toLowerCase()
        const emailIdx = lines.findIndex(l => l.toLowerCase().includes(anchor))

        if (emailIdx > 0 && lines[emailIdx - 1]) {
            const possibleName = lines[emailIdx - 1]
            // Basic validation: 2+ words, not blacklisted
            if (possibleName.split(' ').length >= 2 && !blacklist.some(b => possibleName.toUpperCase().includes(b.toUpperCase()))) {
                console.log(`[Name Extract] ✅ Barry Bennett PDF Email-Anchor Match: ${possibleName}`)
                return possibleName
            }
        }
    }

    // Global Search (Body + PDF)
    const globalMatches = process(emailBody)
    if (globalMatches.length > 0) {
        const best = globalMatches.find(m => emailBody.indexOf(m) > 10) || globalMatches[0]
        console.log(`[Name Extract] ✅ Global Search Match: ${best}`)
        return best
    }

    return ""
}

export async function parseEmailWithAI(emailBody: string, subject: string, senderEmail: string): Promise<ParsedRequest> {
    const senderLower = senderEmail.toLowerCase()
    let identifiedProvider: ParsedRequest['provider'] = "Unknown"

    if (senderLower.includes("barrybennett.co.uk")) identifiedProvider = "Barry Bennett"
    else if (senderLower.includes("remtek-online.co.uk")) identifiedProvider = "Remtek"
    else if (senderLower.includes("invate.co.uk")) identifiedProvider = "Invate"
    else if (senderLower.includes("as-dsa.com") || senderLower.includes("unleashedsoftware.com")) identifiedProvider = "Assistive"

    const prompt = `Extract DSA student info from this email. 
    Separate the body from the [PDF ATTACHMENT CONTENT]. 
    If the provider is "Barry Bennett", student details (name, email) are usually located inside the [PDF ATTACHMENT CONTENT] under the Description column, often right after "DSA".
    Return JSON: { "userName": "Full Name", "userEmail": "student@email.com", "licenseYears": 1, "poNumber": "", "providerContact": "Sender Name" }
    
    EMAIL:
    ${emailBody}
    `

    let parsed: any = null

    try {
        if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "dummy") {
            const msg = await anthropic.messages.create({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 1024,
                messages: [{ role: "user", content: prompt }]
            })
            const text = (msg.content[0] as any).text
            const m = text.match(/\{[\s\S]*\}/)
            if (m) parsed = JSON.parse(m[0])
        } else if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "dummy") {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
            const result = await model.generateContent(prompt)
            const text = result.response.text()
            const m = text.match(/\{[\s\S]*\}/)
            if (m) parsed = JSON.parse(m[0])
        }
    } catch (e) {
        console.error("[Parser] AI Error:", e)
    }

    // If AI failed completely, use fallback structure
    if (!parsed) parsed = { userName: "", userEmail: "", licenseYears: 1, poNumber: "", providerContact: "Team" }

    // ENHANCE WITH ROBUST REGEX
    parsed.poNumber = extractPONumber(emailBody, subject) || parsed.poNumber || "⚠️ NOT FOUND"

    // Extract Student Email if AI missed it
    if (!parsed.userEmail || !parsed.userEmail.includes('@')) {
        const emails = emailBody.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
        parsed.userEmail = emails.find(e => !e.toLowerCase().includes(senderLower.split('@')[0])) || emails[0] || ""
    }

    // Extract Student Name using our high-precision logic
    const robustName = extractStudentNameInternal(emailBody, parsed.userEmail, identifiedProvider)

    if (robustName) {
        parsed.userName = robustName
    } else if (parsed.userName && parsed.userName !== "Student Full Name" && parsed.userName.length > 3) {
        console.log(`[Parser] Robust extraction failed, sticking with AI name: ${parsed.userName}`)
    } else {
        parsed.userName = "⚠️ Name Not Found"
    }

    // Final cleanups
    parsed.provider = identifiedProvider

    // Use robust license years extraction to override or confirm AI result
    parsed.licenseYears = extractLicenseYears(emailBody)

    const parts = parsed.userName.split(' ')
    parsed.firstName = parts[0]
    parsed.lastName = parts.slice(1).join(' ') || parts[0]

    return parsed as ParsedRequest
}

async function fallbackParse(body: string, subject: string, senderEmail: string, provider: ParsedRequest['provider']): Promise<ParsedRequest> {
    // This is essentially redundant now as parseEmailWithAI has internal fallbacks, 
    // but we keep the signature for compatibility.
    return parseEmailWithAI(body, subject, senderEmail)
}

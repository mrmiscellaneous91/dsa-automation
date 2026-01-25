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
 * Helper function to extract PO number from PDF section
 * Looks for numbers/codes near PO-related keywords (no format restrictions)
 */
function extractPONumber(text: string): string {
    console.log(`\n========== PO EXTRACTOR DEBUG ==========`)

    const pdfSection = text.includes('[PDF ATTACHMENT CONTENT]')
        ? text.substring(text.indexOf('[PDF ATTACHMENT CONTENT]'))
        : text

    console.log(`[PO Extractor] PDF section length: ${pdfSection.length} chars`)
    console.log(`[PO Extractor] First 500 chars of PDF section:`)
    console.log(pdfSection.substring(0, 500))
    console.log(`========================================`)

    // Priority 1: Look for labeled PO numbers (most reliable)
    // Matches: "PO: 123456", "P.O. IP051665", "Order Number: 4477874224273", etc.
    const labeledPatterns = [
        /(?:PO|P\.O\.|Purchase Order|Order Number|Order No\.?|Order Reference)[:\s#-]*([A-Z0-9]+)/gi,
    ]

    console.log(`[PO Extractor] Testing labeled patterns...`)
    for (const pattern of labeledPatterns) {
        const matches = [...pdfSection.matchAll(pattern)]
        console.log(`[PO Extractor] Pattern ${pattern} found ${matches.length} matches`)

        for (const match of matches) {
            const candidate = match[1].trim()
            console.log(`[PO Extractor] Checking candidate: "${candidate}" (length: ${candidate.length})`)

            // Must be at least 3 characters and contain some digits
            if (candidate.length >= 3 && /\d/.test(candidate)) {
                console.log(`[PO Extractor] ✅ FOUND VALID LABELED PO: "${candidate}"`)
                return candidate
            } else {
                console.log(`[PO Extractor] ❌ Rejected: too short or no digits`)
            }
        }
    }

    // Priority 2: Look for standalone long numbers (fallback)
    console.log(`[PO Extractor] No labeled PO found, trying standalone patterns...`)
    const standalonePattern = /\b([A-Z]{2,}[0-9]{4,}|[0-9]{7,})\b/g
    const matches = [...pdfSection.matchAll(standalonePattern)]
    console.log(`[PO Extractor] Standalone pattern found ${matches.length} matches`)

    if (matches.length > 0) {
        const candidates = matches.map(m => m[1])
        console.log(`[PO Extractor] Standalone candidates:`, candidates)

        // Return the longest match
        const longest = candidates.sort((a, b) => b.length - a.length)[0]
        console.log(`[PO Extractor] ✅ FOUND STANDALONE PO: "${longest}"`)
        return longest
    }

    console.log(`[PO Extractor] ❌ NO PO NUMBER FOUND`)
    console.log(`========================================\n`)
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
    You are an expert data extractor for Audemic. 
    IMPORTANT: You are looking for a STUDENT'S license details in an email from an equipment PROVIDER.

    PROVIDER: ${identifiedProvider}
    SENDER EMAIL: ${senderEmail}
    EMAIL SUBJECT: ${subject}

    GUIDELINES:
    1. STUDENT NAME: Look for this PRIMARILY in the EMAIL BODY. It is often in ALL CAPS (e.g. "CADI HAF MURPHY") near the student email.
       - Do NOT use the string "[PDF ATTACHMENT CONTENT]" as a name.
       - Do NOT use the Provider's name (e.g., Nicola, Paul).
    2. STUDENT EMAIL: Look for this PRIMARILY in the EMAIL BODY. (e.g. outlook, hotmail, gmail, university address).
    3. PO NUMBER: **CRITICAL** - Extract this from the [PDF ATTACHMENT CONTENT] section ONLY.
       - Look for values labeled as "PO", "P.O.", "Purchase Order", "Order Number", "Order Reference", etc.
       - PO numbers can be ALPHANUMERIC (like "IP051665") or NUMERIC (like "4477874224273").
       - Can be ANY LENGTH - short or long, just needs to be labeled as a PO/Order number.
       - DO NOT extract random numbers from elsewhere - MUST be clearly labeled.
       - If you cannot find a clearly labeled PO/Order number, return an empty string.
    4. LICENSE YEARS: Check BOTH the Email Body and PDF. 
       - If you see "3 year" or "three year", licenseYears is 3. 
       - Default is 1, but look carefully for "3" or "renewal".

    CRITICAL: The email body has extra text appended labeled "[PDF ATTACHMENT CONTENT]". 
    - Use the EMAIL BODY section for Name and Email.
    - Use ONLY the [PDF ATTACHMENT CONTENT] section for PO Number.
    - The PO number MUST have a label like "PO:", "Order Number:", etc. Don't extract unlabeled numbers.

    EMAIL CONTENT:
    ${emailBody}

    Return JSON:
    {
      "provider": "${identifiedProvider}",
      "providerContact": "Sender First Name",
      "userName": "STUDENT FULL NAME",
      "firstName": "Student First Name",
      "lastName": "Student Last Name",
      "userEmail": "Student Email",
      "licenseYears": 3,
      "poNumber": "PO from PDF (can be alphanumeric, any length)"
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

                console.log(`[Parser] AI extracted PO number: "${parsed.poNumber}"`)

                // Validate PO number - should be at least 3 characters total
                const poDigitsOnly = parsed.poNumber ? parsed.poNumber.replace(/\D/g, '') : ''
                const poLength = parsed.poNumber ? parsed.poNumber.length : 0

                // Invalid if: empty, less than 3 chars total, or less than 3 digits
                if (!parsed.poNumber || poLength < 3 || poDigitsOnly.length < 3) {
                    console.warn(`[Parser] AI extracted suspicious PO "${parsed.poNumber}". Attempting regex extraction...`)
                    const regexPO = extractPONumber(emailBody)
                    if (regexPO) {
                        console.log(`[Parser] ✅ Regex found valid PO: ${regexPO}`)
                        parsed.poNumber = regexPO
                    } else {
                        console.error(`[Parser] ❌ No valid PO found. Flagging for manual review.`)
                        parsed.poNumber = parsed.poNumber ? `⚠️ ${parsed.poNumber}` : "⚠️ NOT FOUND"
                    }
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

                // Validate PO number - should be at least 3 characters total
                const poDigitsOnly = parsed.poNumber ? parsed.poNumber.replace(/\D/g, '') : ''
                const poLength = parsed.poNumber ? parsed.poNumber.length : 0

                // Invalid if: empty, less than 3 chars total, or less than 3 digits
                if (!parsed.poNumber || poLength < 3 || poDigitsOnly.length < 3) {
                    console.warn(`[Parser] AI extracted suspicious PO "${parsed.poNumber}". Attempting regex extraction...`)
                    const regexPO = extractPONumber(emailBody)
                    if (regexPO) {
                        console.log(`[Parser] ✅ Regex found valid PO: ${regexPO}`)
                        parsed.poNumber = regexPO
                    } else {
                        console.error(`[Parser] ❌ No valid PO found. Flagging for manual review.`)
                        parsed.poNumber = parsed.poNumber ? `⚠️ ${parsed.poNumber}` : "⚠️ NOT FOUND"
                    }
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
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const emails = body.match(emailRegex) || []
    const senderAddress = senderEmail.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || ""
    const studentEmail = emails.find(e => e.toLowerCase() !== senderAddress.toLowerCase()) || emails[0] || ""
    const nameMatch = body.match(/[A-Z]{2,}\s[A-Z]{2,}(\s[A-Z]{2,})?/)

    const bodyLower = body.toLowerCase()

    return {
        provider,
        providerContact: "Team",
        userName: nameMatch ? nameMatch[0] : "Unknown User",
        userEmail: studentEmail,
        licenseYears: bodyLower.includes("3 year") ? 3 : bodyLower.includes("2 year") ? 2 : bodyLower.includes("4 year") ? 4 : 1,
        poNumber: body.match(/PO\d+|[0-9]{5,}/)?.[0] || "",
    }
}

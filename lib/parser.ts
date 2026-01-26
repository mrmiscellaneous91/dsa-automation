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

export async function parseEmailWithAI(emailBody: string, subject: string, senderEmail: string): Promise<ParsedRequest> {
    const senderLower = senderEmail.toLowerCase()
    let identifiedProvider: ParsedRequest['provider'] = "Unknown"

    if (senderLower.includes("barrybennett.co.uk")) identifiedProvider = "Barry Bennett"
    else if (senderLower.includes("remtek-online.co.uk")) identifiedProvider = "Remtek"
    else if (senderLower.includes("invate.co.uk")) identifiedProvider = "Invate"
    else if (senderLower.includes("as-dsa.com") || senderLower.includes("unleashedsoftware.com")) identifiedProvider = "Assistive"

    const prompt = `
    Extract student license details from this DSA provider email.
    
    PROVIDER: ${identifiedProvider}
    
    Extract ONLY:
    1. STUDENT NAME - usually in ALL CAPS near their email (e.g. "AMAL AHMED")
    2. STUDENT EMAIL - student's personal email (NOT the provider's email)
    3. LICENSE YEARS - look for "3 year" or "three year" (default is 1)
    
    DO NOT extract PO number - leave it empty.
    
    EMAIL CONTENT:
    ${emailBody}
    
    Return JSON:
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

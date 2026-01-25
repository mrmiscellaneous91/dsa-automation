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
    userEmail: string
    licenseYears: number
    poNumber: string
}

export async function parseEmailWithAI(emailBody: string, subject: string, senderEmail: string, attachmentBase64?: string, mimeType?: string): Promise<ParsedRequest> {
    const senderLower = senderEmail.toLowerCase()
    let identifiedProvider: ParsedRequest['provider'] = "Unknown"

    if (senderLower.includes("barrybennett.co.uk")) identifiedProvider = "Barry Bennett"
    else if (senderLower.includes("remtek-online.co.uk")) identifiedProvider = "Remtek"
    else if (senderLower.includes("invate.co.uk")) identifiedProvider = "Invate"
    else if (senderLower.includes("as-dsa.com") || senderLower.includes("unleashedsoftware.com")) identifiedProvider = "Assistive"

    const promptText = `
    You are an expert data extractor for Audemic. 
    IMPORTANT: You are looking for a STUDENT'S license details in an email from an equipment PROVIDER.

    PROVIDER: ${identifiedProvider}
    SENDER EMAIL: ${senderEmail}
    EMAIL SUBJECT: ${subject}

    GUIDELINES:
    1. The STUDENT is NOT the person who sent the email (e.g., Nicola from Remtek).
    2. The STUDENT name is often in ALL CAPS (like CADI HAF MURPHY or AYDIL GANIDAGLI).
    3. The PO Number is usually a 7-digit number starting with 5. IT IS ALMOST CERTAINLY IN THE ATTACHED PDF.
    4. LICENSE YEARS: Be extremely precise. 
       - If you see "3 year" or "three year", licenseYears is 3. 
       - If you see "1 year" or "one year", licenseYears is 1.
       - CHECK THE PDF CAREFULLY. If the email implies a renewal or 3 years, trust that over a default.
    5. The STUDENT email is usually an outlook, icloud, or university address.
    
    CRITICAL: The PDF attachment contains the most accurate data. TRUST THE PDF over the email body if they conflict.

    EMAIL CONTENT:
    ${emailBody}

    Return JSON:
    {
      "provider": "${identifiedProvider}",
      "providerContact": "Sender First Name",
      "userName": "STUDENT FULL NAME",
      "userEmail": "Student Email",
      "licenseYears": 3,
      "poNumber": "7-digit PO"
    }
  `

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "dummy") {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

            const parts: any[] = [{ text: promptText }]

            // Add attachment if present (Native Gemini PDF support)
            if (attachmentBase64 && mimeType) {
                console.log(`[Parser] Attaching PDF (${attachmentBase64.length} chars) to Gemini request`)
                parts.push({
                    inlineData: {
                        data: attachmentBase64,
                        mimeType: mimeType
                    }
                })
            } else {
                console.log("[Parser] No PDF attachment found/passed")
            }

            const result = await model.generateContent(parts)
            const text = result.response.text()
            console.log("[Parser] Gemini Raw Response:", text)

            const jsonStart = text.indexOf("{")
            const jsonEnd = text.lastIndexOf("}") + 1

            if (jsonStart !== -1 && jsonEnd > jsonStart) {
                const jsonStr = text.substring(jsonStart, jsonEnd)
                const parsed = JSON.parse(jsonStr)
                if (!parsed.provider || parsed.provider === "Unknown") parsed.provider = identifiedProvider
                return parsed
            } else {
                console.error("No valid JSON found in AI response")
                throw new Error("No valid JSON found in AI response")
            }
        } catch (error) {
            console.error("Gemini Parsing Error:", error)
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

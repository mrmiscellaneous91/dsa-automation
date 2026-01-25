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

export async function parseEmailWithAI(emailBody: string, subject: string, senderEmail: string): Promise<ParsedRequest> {
    const senderLower = senderEmail.toLowerCase()
    let identifiedProvider: ParsedRequest['provider'] = "Unknown"

    if (senderLower.includes("barrybennett")) identifiedProvider = "Barry Bennett"
    else if (senderLower.includes("remtek")) identifiedProvider = "Remtek"
    else if (senderLower.includes("invate")) identifiedProvider = "Invate"
    else if (senderLower.includes("assistive")) identifiedProvider = "Assistive"

    const prompt = `
    You are an expert data extractor for Audemic. 
    IMPORTANT: You are looking for a STUDENT'S license details in an email from an equipment PROVIDER.

    PROVIDER: ${identifiedProvider}
    SENDER EMAIL: ${senderEmail}
    EMAIL SUBJECT: ${subject}

    GUIDELINES:
    1. The STUDENT is NOT the person who sent the email (e.g., Nicola from Remtek).
    2. The STUDENT name is often in ALL CAPS (like CADI HAF MURPHY or AYDIL GANIDAGLI).
    3. The PO Number is usually a 7-digit number (like 5078726) or starts with "PO".
    4. License years are 1, 2, 3, or 4. Look for "X year licence".
    5. The STUDENT email is usually an outlook, icloud, or university address.

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
            const result = await model.generateContent(prompt)
            const text = result.response.text()
            const jsonStart = text.indexOf("{")
            const jsonEnd = text.lastIndexOf("}") + 1
            const jsonStr = text.substring(jsonStart, jsonEnd)
            const parsed = JSON.parse(jsonStr)
            if (!parsed.provider || parsed.provider === "Unknown") parsed.provider = identifiedProvider
            return parsed
        } catch (error) {
            console.error("Gemini Error:", error)
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

    return {
        provider,
        providerContact: "Team",
        userName: nameMatch ? nameMatch[0] : "Unknown User",
        userEmail: studentEmail,
        licenseYears: body.includes("2 year") ? 2 : body.includes("3 year") ? 3 : body.includes("4 year") ? 4 : 1,
        poNumber: body.match(/PO\d+|[0-9]{5,}/)?.[0] || "",
    }
}

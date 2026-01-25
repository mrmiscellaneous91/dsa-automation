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
    You receive emails from student equipment providers regarding license assignments.

    PROVIDER: ${identifiedProvider} (Verified from sender email)
    SENDER: ${senderEmail}
    SUBJECT: ${subject}

    GOAL: Extract the STUDENT'S details for a new Audemic license.
    
    CRITICAL RULES:
    1. The SENDER (the person who sent the email) is NOT the student.
    2. The STUDENT name is the person getting the license (usually written in ALL CAPS).
    3. The STUDENT name is usually mentioned after phrases like "assign the following student" or "student name:".
    4. Provide the result in VALID JSON.

    EMAIL BODY:
    ${emailBody}

    Return JSON:
    {
      "provider": "${identifiedProvider}",
      "providerContact": "Name from signature",
      "userName": "Student Full Name",
      "userEmail": "Student Email Address",
      "licenseYears": 1,
      "poNumber": "PO12345"
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
            if (parsed.provider === "Unknown" || !parsed.provider) parsed.provider = identifiedProvider
            return parsed
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

    return {
        provider,
        providerContact: "Team",
        userName: nameMatch ? nameMatch[0] : "Unknown User",
        userEmail: studentEmail,
        licenseYears: body.includes("2 year") ? 2 : body.includes("3 year") ? 3 : body.includes("4 year") ? 4 : 1,
        poNumber: body.match(/PO\d+|[0-9]{5,}/)?.[0] || "",
    }
}

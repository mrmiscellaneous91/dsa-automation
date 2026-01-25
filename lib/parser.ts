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
    const prompt = `
    You are an expert data extractor for Audemic. 
    You receive emails from student equipment providers regarding license assignments.

    PROVDIER IDENTIFICATION:
    - If sender is "purchasing@barrybennett.co.uk" or contains "barrybennett" -> provider is "Barry Bennett"
    - If sender contains "remtek" -> provider is "Remtek"
    - If sender contains "invate" -> provider is "Invate"
    - If sender contains "assistive" -> provider is "Assistive"

    DATA TO EXTRACT:
    - provider: Exactly one of "Remtek", "Invate", "Assistive", "Barry Bennett"
    - providerContact: First name of the person who sent the email (look at signature).
    - userName: Full name of the student. Often written in ALL CAPS. It is NOT the sender's name. It is the person getting the license.
    - userEmail: The student's email address.
    - licenseYears: Number of years (1, 2, 3, or 4). Look for phrases like "year licence" or "3 year".
    - poNumber: The Purchase Order number (often starts with PO or is a long number).

    SENDER EMAIL: ${senderEmail}
    EMAIL SUBJECT: ${subject}
    EMAIL BODY:
    ${emailBody}

    Return ONLY a JSON object with these keys. Be extremely careful to distinguish the SENDER name from the STUDENT name.
  `

    // 1. Try Gemini first
    if (process.env.GEMINI_API_KEY) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })
            const result = await model.generateContent(prompt)
            const text = result.response.text()
            const jsonStart = text.indexOf("{")
            const jsonEnd = text.lastIndexOf("}") + 1
            const jsonStr = text.substring(jsonStart, jsonEnd)
            return JSON.parse(jsonStr)
        } catch (error) {
            console.error("Error parsing with Gemini:", error)
        }
    }

    // 2. Try Claude second
    if (process.env.ANTHROPIC_API_KEY) {
        try {
            const message = await anthropic.messages.create({
                model: "claude-3-5-sonnet-latest",
                max_tokens: 1000,
                messages: [{ role: "user", content: prompt }],
            })
            const content = message.content[0]
            if (content.type === "text") {
                return JSON.parse(content.text)
            }
        } catch (error) {
            console.error("Error parsing with Claude:", error)
        }
    }

    return fallbackParse(emailBody, subject, senderEmail)
}

function fallbackParse(body: string, subject: string, senderEmail: string): ParsedRequest {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    const poRegex = /PO\d+|[0-9]{5,}/

    let provider: ParsedRequest['provider'] = "Unknown"
    if (senderEmail.includes("barrybennett")) provider = "Barry Bennett"
    else if (senderEmail.includes("remtek")) provider = "Remtek"
    else if (senderEmail.includes("invate")) provider = "Invate"
    else if (senderEmail.includes("assistive")) provider = "Assistive"

    return {
        provider,
        providerContact: "Team",
        userName: "Unknown User",
        userEmail: body.match(emailRegex)?.[0] || "",
        licenseYears: body.includes("2 year") ? 2 : body.includes("3 year") ? 3 : body.includes("4 year") ? 4 : 1,
        poNumber: body.match(poRegex)?.[0] || "",
    }
}

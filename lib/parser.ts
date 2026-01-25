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

export async function parseEmailWithAI(emailBody: string, subject: string): Promise<ParsedRequest> {
    const prompt = `
    You are an expert data extractor for a company called Audemic. 
    You receive emails from student equipment providers (Remtek, Invate, Assistive Solutions, Barry Bennett).
    Your job is to extract specific information for creating a new user subscription.

    Target Data:
    - provider: One of "Remtek", "Invate", "Assistive", "Barry Bennett"
    - providerContact: The first name of the person sending the email
    - userName: Full name of the student being assigned a license
    - userEmail: Email of the student
    - licenseYears: Number of years for the license (usually 1, 2, 3, or 4)
    - poNumber: Purchase Order number

    Email Subject: ${subject}
    Email Body:
    ${emailBody}

    Return ONLY a JSON object with these keys. If you cannot find a piece of information, use an empty string or 1 for licenseYears.
  `

    // 1. Try Gemini first (as requested)
    if (process.env.GEMINI_API_KEY) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })
            const result = await model.generateContent(prompt)
            const text = result.response.text()
            // Gemini can sometimes wrap JSON in code blocks
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

    // 3. Last fallback: Regex
    console.warn("No AI API keys found or AI failed, using fallback parser")
    return fallbackParse(emailBody, subject)
}

function fallbackParse(body: string, subject: string): ParsedRequest {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    const poRegex = /PO\d+|[0-9]{5,}/

    return {
        provider: "Unknown",
        providerContact: "Team",
        userName: "Unknown User",
        userEmail: body.match(emailRegex)?.[0] || "",
        licenseYears: body.includes("2 year") ? 2 : body.includes("3 year") ? 3 : body.includes("4 year") ? 4 : 1,
        poNumber: body.match(poRegex)?.[0] || "",
    }
}

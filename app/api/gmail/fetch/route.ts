import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getGmailClient, listEmails, getEmail, extractEmailContent, getAttachment } from "@/lib/gmail"
import { parseEmailWithAI } from "@/lib/parser"

// pdf-parse is a CommonJS module, so we use require to avoid "no default export" errors
const pdf = require("pdf-parse")

export async function GET() {
    try {
        const session = await auth()
        if (!(session as any)?.accessToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const gmail = getGmailClient((session as any).accessToken as string)

        // Targeted query for specific provider domains
        const query = `is:unread (from:barrybennett.co.uk OR from:as-dsa.com OR from:unleashedsoftware.com OR from:remtek-online.co.uk OR from:invate.co.uk) "Audemic"`

        const messages = await listEmails(gmail, query)
        const tasks = []
        const seenRequests = new Set<string>()

        for (const message of messages) {
            try {
                const fullEmail = await getEmail(gmail, message.id!)
                const subject = fullEmail.payload?.headers?.find((h: any) => h.name === "Subject")?.value || ""
                const from = fullEmail.payload?.headers?.find((h: any) => h.name === "From")?.value || ""
                let body = extractEmailContent(fullEmail.payload)

                // PDF Extraction Logic (Text)
                let pdfText = ""
                if (fullEmail.payload.parts) {
                    for (const part of fullEmail.payload.parts) {
                        if (part.mimeType === "application/pdf" && part.body?.attachmentId) {
                            try {
                                const attachment = await getAttachment(gmail, message.id!, part.body.attachmentId)
                                if (attachment.data) {
                                    // Convert Base64Url to Buffer
                                    const base64 = attachment.data.replace(/-/g, '+').replace(/_/g, '/')
                                    const buffer = Buffer.from(base64, "base64")
                                    const pdfData = await pdf(buffer)
                                    pdfText += `\n\n[PDF ATTACHMENT CONTENT]:\n${pdfData.text}`
                                }
                            } catch (pdfErr) {
                                console.error("Error parsing PDF:", pdfErr)
                            }
                        }
                    }
                }

                // Append PDF text to body if found, to give Claude full context
                if (pdfText) {
                    console.log(`[Fetch] PDF text extracted successfully (${pdfText.length} chars). Appending to body.`)
                    body += pdfText
                } else {
                    console.log("[Fetch] No PDF text extracted from this email.")
                }

                console.log("[Fetch] Sending to AI parser. Body length:", body.length)
                const parsedData = await parseEmailWithAI(body, subject, from)
                console.log("[Fetch] AI Parser Result:", JSON.stringify(parsedData, null, 2))

                // Skip if missing student email or if we already have this request
                if (!parsedData.userEmail) {
                    console.log("[Fetch] Skipping: No student email found in parsed data.")
                    continue
                }

                const uniqueKey = `${parsedData.userEmail.toLowerCase()}-${parsedData.poNumber || 'nopo'}`

                if (!seenRequests.has(uniqueKey)) {
                    seenRequests.add(uniqueKey)
                    tasks.push({
                        id: message.id,
                        threadId: message.threadId,
                        subject,
                        from,
                        body,
                        parsedData,
                        status: "NEW"
                    })
                }
            } catch (err: any) {
                console.error(`Error processing message ${message.id}:`, err)
            }
        }

        return NextResponse.json({ tasks })
    } catch (error: any) {
        console.error("Global Gmail Fetch Error:", error)
        return NextResponse.json({ error: `Server Error: ${error.message}` }, { status: 500 })
    }
}

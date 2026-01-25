import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getGmailClient, listEmails, getEmail, extractEmailContent, getAttachment } from "@/lib/gmail"
import { parseEmailWithAI } from "@/lib/parser"

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

                // Native Gemini PDF Support
                let pdfBase64 = undefined
                let pdfMimeType = undefined

                if (fullEmail.payload.parts) {
                    for (const part of fullEmail.payload.parts) {
                        if (part.mimeType === "application/pdf" && part.body?.attachmentId) {
                            try {
                                const attachment = await getAttachment(gmail, message.id!, part.body.attachmentId)
                                if (attachment.data) {
                                    pdfBase64 = attachment.data
                                    pdfMimeType = "application/pdf"
                                    // Only attach the first PDF found
                                    break
                                }
                            } catch (attErr) {
                                console.error("Error fetching attachment:", attErr)
                            }
                        }
                    }
                }

                const parsedData = await parseEmailWithAI(body, subject, from, pdfBase64, pdfMimeType)

                // Skip if missing student email or if we already have this request
                if (!parsedData.userEmail) continue;

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

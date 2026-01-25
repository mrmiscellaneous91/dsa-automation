import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getGmailClient, listEmails, getEmail, extractEmailContent, getAttachment } from "@/lib/gmail"

const pdf = require("pdf-parse")

export async function GET(request: Request) {
    try {
        const session = await auth()
        if (!(session as any)?.accessToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const emailAddress = searchParams.get('email') // e.g., ?email=amal-ahmed@hotmail.co.uk

        const gmail = getGmailClient((session as any).accessToken as string)
        const query = `is:unread (from:barrybennett.co.uk OR from:as-dsa.com OR from:unleashedsoftware.com OR from:remtek-online.co.uk OR from:invate.co.uk) "Audemic"`

        const messages = await listEmails(gmail, query)

        for (const message of messages) {
            const fullEmail = await getEmail(gmail, message.id!)
            const subject = fullEmail.payload?.headers?.find((h: any) => h.name === "Subject")?.value || ""
            const from = fullEmail.payload?.headers?.find((h: any) => h.name === "From")?.value || ""
            let body = extractEmailContent(fullEmail.payload)

            // PDF Extraction
            let pdfText = ""
            if (fullEmail.payload.parts) {
                for (const part of fullEmail.payload.parts) {
                    if (part.mimeType === "application/pdf" && part.body?.attachmentId) {
                        try {
                            const attachment = await getAttachment(gmail, message.id!, part.body.attachmentId)
                            if (attachment.data) {
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

            body += pdfText

            // If filtering by email, check if this email contains it
            if (emailAddress) {
                if (body.toLowerCase().includes(emailAddress.toLowerCase()) ||
                    from.toLowerCase().includes(emailAddress.toLowerCase())) {
                    // Return the raw body for debugging
                    return NextResponse.json({
                        subject,
                        from,
                        bodyPreview: body.substring(0, 2000),
                        pdfSection: pdfText ? pdfText.substring(0, 2000) : "No PDF found",
                        fullBodyLength: body.length,
                        pdfTextLength: pdfText.length
                    })
                }
            }
        }

        return NextResponse.json({
            error: emailAddress
                ? `No email found for ${emailAddress}`
                : "Please provide ?email= parameter",
            totalMessages: messages.length
        })
    } catch (error: any) {
        console.error("Debug Extract Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

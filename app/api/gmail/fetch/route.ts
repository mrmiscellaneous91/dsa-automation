import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getGmailClient, listEmails, getEmail, extractEmailContent } from "@/lib/gmail"
import { parseEmailWithAI } from "@/lib/parser"

export async function GET() {
    const session = await auth()
    if (!(session as any)?.accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const gmail = getGmailClient((session as any).accessToken as string)

    // Broad query to find ANY license requests
    const query = `is:unread (Remtek OR Invate OR Assistive OR "Barry Bennett" OR "Audemic licence")`

    const messages = await listEmails(gmail, query)
    const tasks = []

    for (const message of messages) {
        try {
            const fullEmail = await getEmail(gmail, message.id!)
            const subject = fullEmail.payload?.headers?.find((h: any) => h.name === "Subject")?.value || ""
            const from = fullEmail.payload?.headers?.find((h: any) => h.name === "From")?.value || ""
            const body = extractEmailContent(fullEmail.payload)

            // Pass more context to AI
            const parsedData = await parseEmailWithAI(body, subject, from)

            tasks.push({
                id: message.id,
                threadId: message.threadId,
                subject,
                from,
                body,
                parsedData,
                status: "NEW"
            })
        } catch (err) {
            console.error(`Error processing message ${message.id}:`, err)
        }
    }

    return NextResponse.json({ tasks })
}

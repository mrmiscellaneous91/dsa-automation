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

    // Query to find emails from providers
    const providers = ["Remtek", "Invate", "Assistive", "Barry Bennett"]
    const query = `is:unread (${providers.join(" OR ")})`

    const messages = await listEmails(gmail, query)
    const tasks = []

    for (const message of messages) {
        const fullEmail = await getEmail(gmail, message.id!)
        const subject = fullEmail.payload?.headers?.find((h: any) => h.name === "Subject")?.value || ""
        const from = fullEmail.payload?.headers?.find((h: any) => h.name === "From")?.value || ""
        const body = extractEmailContent(fullEmail.payload)

        const parsedData = await parseEmailWithAI(body, subject)

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

    return NextResponse.json({ tasks })
}

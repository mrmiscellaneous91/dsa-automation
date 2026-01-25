import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getGmailClient, sendEmail } from "@/lib/gmail"

export async function POST(req: Request) {
    const session = await auth()
    if (!(session as any)?.accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { to, subject, body, threadId } = await req.json()
    const gmail = getGmailClient((session as any).accessToken as string)

    try {
        await sendEmail(gmail, to, subject, body, threadId)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

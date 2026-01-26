import { google } from "googleapis"

export const getGmailClient = (accessToken: string) => {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    return google.gmail({ version: "v1", auth })
}

export async function listEmails(gmail: any, query: string = "is:unread") {
    const res = await gmail.users.messages.list({
        userId: "me",
        q: query,
    })
    return res.data.messages || []
}

export async function getEmail(gmail: any, id: string) {
    const res = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "full",
    })
    return res.data
}

export async function sendEmail(gmail: any, to: string, subject: string, body: string, threadId?: string) {
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`
    const messageParts = [
        `To: ${to}`,
        "Content-Type: text/html; charset=utf-8",
        "MIME-Version: 1.0",
        `Subject: ${utf8Subject}`,
        "",
        body,
    ]
    const message = messageParts.join("\n")
    const encodedMessage = Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "")

    await gmail.users.messages.send({
        userId: "me",
        requestBody: {
            raw: encodedMessage,
            threadId,
        },
    })
}

export function extractEmailContent(payload: any) {
    let body = ""
    // Helper to decode Gmail's base64url format
    const decodeBase64 = (data: string) => {
        if (!data) return ""
        // Replace base64url chars with base64 chars
        const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
        // Add padding if needed
        const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=')
        try {
            return Buffer.from(padded, "base64").toString()
        } catch (e) {
            console.error('[Gmail Extract] Decode error:', e)
            return ""
        }
    }

    // Helper to strip HTML tags if we only have HTML
    const stripHtml = (html: string) => {
        return html
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
    }

    if (payload.parts) {
        // First pass: look for plain text
        for (const part of payload.parts) {
            if (part.mimeType === "text/plain" && part.body?.data) {
                body += decodeBase64(part.body.data)
            } else if (part.parts) {
                body += extractEmailContent(part)
            }
        }

        // Second pass: if no plain text found, look for HTML
        if (!body) {
            for (const part of payload.parts) {
                if (part.mimeType === "text/html" && part.body?.data) {
                    const html = decodeBase64(part.body.data)
                    body += stripHtml(html)
                }
            }
        }
    } else if (payload.body?.data) {
        const content = decodeBase64(payload.body.data)
        if (payload.mimeType === "text/html") {
            body = stripHtml(content)
        } else {
            body = content
        }
    }
    return body
}

export async function getAttachment(gmail: any, messageId: string, attachmentId: string) {
    const res = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId,
        id: attachmentId,
    })
    return res.data
}

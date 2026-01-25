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
    if (payload.parts) {
        for (const part of payload.parts) {
            if (part.mimeType === "text/plain") {
                body += Buffer.from(part.body.data, "base64").toString()
            } else if (part.parts) {
                body += extractEmailContent(part)
            }
        }
    } else if (payload.body.data) {
        body = Buffer.from(payload.body.data, "base64").toString()
    }
    return body
}

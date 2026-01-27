import { NextResponse } from "next/server"
import { extractStudentName } from "@/lib/parser"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email') || 'segilolaf@gmail.com'
    const format = searchParams.get('format') || 'remtek'

    // Different test bodies for different providers
    const testBodies: Record<string, string> = {
        remtek: `Hello, Joshua\r\n\r\nPlease can you assign an Audemic Licence  to -\r\n\r\nStudent name -       Segilola Christianah Kikelomo Faleru\r\n\r\n\r\nStudent Email -         segilolaf@gmail.com\r\n\r\n\r\nThanks\r\n\r\nPaul\r\n\r\n[PDF ATTACHMENT CONTENT]:\n\nPURCHASE ORDER...`,
        invate: `PSA and confirm when actioned with end user\r\n\r\nAmal Ahmed\r\namal-ahmed@hotmail.co.uk<mailto:amal-ahmed@hotmail.co.uk>\r\n\r\n[cid:image001.png]\r\nVicki Ravensdale\r\nOperations Manager\r\n[PDF ATTACHMENT CONTENT]:\n\nInvate Limited...`
    }

    const testBody = testBodies[format] || testBodies.remtek

    // Use the actual function
    const extractedName = extractStudentName(testBody, email)

    return NextResponse.json({
        inputEmail: email,
        format: format,
        testBodyPreview: testBody.substring(0, 200) + '...',
        extractedName: extractedName,
        success: extractedName.length > 0
    })
}


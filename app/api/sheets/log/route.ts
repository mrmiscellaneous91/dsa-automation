import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getSheetsClient, appendToSheet } from "@/lib/sheets"
import { format } from "date-fns"

export async function POST(req: Request) {
    const session = await auth()
    if (!(session as any)?.accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data } = await req.json()
    const sheets = getSheetsClient((session as any).accessToken as string)
    const spreadsheetId = process.env.SPREADSHEET_ID!

    // Prepare row data based on column mapping
    // A: agent_added, B: invoice_s, C: first_name, D: last_name, E: email, F: po_number, 
    // G: product_name, H: amount, I: supplier_name, J: po_issue_date, K: Licence-issued-to-End-User, 
    // L: ???, M: ???, N: start_date, O: end_date

    const today = format(new Date(), "dd/MM/yyyy")
    const endDate = format(new Date(new Date().setFullYear(new Date().getFullYear() + Number(data.licenseYears))), "dd/MM/yyyy")

    const first_name = data.userName.split(" ")[0]
    const last_name = data.userName.split(" ").slice(1).join(" ")

    // Calculate amount based on years (from implementation plan screenshots)
    // 1y: 106.92, 2y: 208.44, 3y: 309.96, 4y: 411.48
    const amounts: Record<number, string> = { 1: "106.92", 2: "208.44", 3: "309.96", 4: "411.48" }
    const amount = amounts[Number(data.licenseYears)] || "106.92"

    // Write directly to the specific tab requested by user
    const range = "'Updated_Licence_Table'!A:A"

    const row = [
        "true",           // A: agent_added
        "DONE",           // B: invoice_s
        first_name,       // C
        last_name,        // D
        data.userEmail,   // E
        data.poNumber,    // F
        data.licenseYears.toString(), // G: product_name
        amount,           // H: amount
        data.provider,    // I: supplier_name
        today,            // J: po_issue_date
        "TRUE",           // K: Licence-issued-to-End-User
        "",               // L
        "",               // M
        today,            // N: start_date
        endDate           // O: end_date
    ]

    try {
        await appendToSheet(sheets, spreadsheetId, range, [row])
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Sheets Error Details:", {
            message: error.message,
            status: error.status,
            errors: error.response?.data?.error?.errors
        })
        const detail = error.response?.data?.error?.message || error.message
        return NextResponse.json({ error: `Sheets Error: ${detail}` }, { status: 500 })
    }
}

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { automateUserCreation } from "@/lib/automation"

export async function POST(req: Request) {
    const session = await auth()
    const accessToken = (session as any)?.accessToken
    if (!accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userData } = await req.json()

    try {
        const result = await automateUserCreation(userData)
        if (result.success) {
            return NextResponse.json({ success: true })
        } else {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

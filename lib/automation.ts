import { createAudemicUser } from "./audemic-api"

export interface AutomationResult {
    success: boolean
    error?: string
    userId?: number
}

/**
 * Creates a user via Audemic API
 * Subscription creation is paused for now
 */
export async function automateUserCreation(userData: {
    email: string
    userName: string
    licenseYears: number
}): Promise<AutomationResult> {

    // Parse name
    const names = userData.userName.split(" ")
    const firstName = names[0]
    const lastName = names.slice(1).join(" ") || firstName

    // Create user via API
    console.log("[Automation] Creating user via API...")
    const userResult = await createAudemicUser({
        email: userData.email,
        firstName,
        lastName
    })

    if (!userResult.success) {
        return { success: false, error: userResult.error }
    }

    console.log(`[Automation] User created successfully! ID: ${userResult.userId}`)

    // TODO: Add subscription creation later
    // For now, just return success after user creation

    return { success: true, userId: userResult.userId }
}

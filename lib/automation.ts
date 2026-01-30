import { createAudemicUser } from "./audemic-api"

export interface AutomationResult {
    success: boolean
    error?: string
    userId?: number
}

/**
 * Creates a user and subscription via Audemic API
 */
export async function automateUserCreation(userData: {
    email: string
    userName: string
    licenseYears: number
    poNumber: string
    provider: string
}): Promise<AutomationResult> {

    // Parse name
    const names = userData.userName.split(" ")
    const firstName = names[0]
    const lastName = names.slice(1).join(" ") || firstName

    // Create user and subscription via API
    console.log("[Automation] Creating user and subscription via API...")
    const userResult = await createAudemicUser({
        email: userData.email,
        firstName,
        lastName,
        dsaEligible: true, // Implicitly true if coming through this automation
        dsaDurationYears: userData.licenseYears,
        dsaProvider: userData.provider,
        poNumber: userData.poNumber
    })

    if (!userResult.success) {
        return { success: false, error: userResult.error }
    }

    console.log(`[Automation] User and subscription created successfully! ID: ${userResult.userId}`)
    console.log(`[Automation] Full flow complete.`)

    return { success: true, userId: userResult.userId }
}

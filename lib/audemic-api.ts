/**
 * Audemic API Client
 * Creates users and updates profiles via direct API calls (much more reliable than browser automation)
 */

const BASE_URL = "https://www.audemic.app"

export interface CreateUserResult {
    success: boolean
    userId?: number
    error?: string
}

export interface UserData {
    email: string
    firstName: string
    lastName: string
}

/**
 * Creates a new user in Audemic via API
 */
export async function createAudemicUser(userData: UserData): Promise<CreateUserResult> {
    const password = "Audemic@123"

    try {
        // Step 1: Create user
        console.log(`[Audemic API] Creating user: ${userData.email}`)
        const createResponse = await fetch(`${BASE_URL}/users`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                user: {
                    email: userData.email,
                    password: password,
                    action: "signup"
                }
            })
        })

        if (!createResponse.ok) {
            const errorText = await createResponse.text()
            return { success: false, error: `Failed to create user: ${createResponse.status} - ${errorText}` }
        }

        const createData = await createResponse.json()
        const userId = createData.data?.refresh_token?.user_id
        const authToken = createData.data?.token

        if (!userId) {
            return { success: false, error: "User created but no user_id returned" }
        }

        console.log(`[Audemic API] User created with ID: ${userId}`)

        // Step 2: Update profile with name
        console.log(`[Audemic API] Updating profile for user ${userId}`)
        const profileResponse = await fetch(`${BASE_URL}/api/v2/profiles/${userId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {})
            },
            body: JSON.stringify({
                user: {
                    first_name: userData.firstName,
                    last_name: userData.lastName
                }
            })
        })

        if (!profileResponse.ok) {
            console.warn(`[Audemic API] Profile update failed: ${profileResponse.status} - continuing anyway`)
            // Don't fail entirely if profile update fails
        } else {
            console.log(`[Audemic API] Profile updated successfully`)
        }

        return { success: true, userId }

    } catch (error: any) {
        console.error("[Audemic API] Error:", error)
        return { success: false, error: error.message }
    }
}

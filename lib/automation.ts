import puppeteer from "puppeteer"
import puppeteerCore from "puppeteer-core"
import { createAudemicUser } from "./audemic-api"

export interface AutomationResult {
    success: boolean
    error?: string
    userId?: number
}

/**
 * Hybrid automation: 
 * 1. Create user via API (reliable)
 * 2. Create subscription via Browserless (admin panel)
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

    // Step 1: Create user via API (reliable!)
    console.log("[Automation] Step 1: Creating user via API...")
    const userResult = await createAudemicUser({
        email: userData.email,
        firstName,
        lastName
    })

    if (!userResult.success) {
        return { success: false, error: `API user creation failed: ${userResult.error}` }
    }

    console.log(`[Automation] User created via API with ID: ${userResult.userId}`)

    // Step 2: Create subscription via Browserless (admin panel)
    console.log("[Automation] Step 2: Creating subscription via admin panel...")

    const browserlessToken = process.env.BROWSERLESS_TOKEN
    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminEmail || !adminPassword) {
        return { success: false, error: "Missing admin credentials in environment", userId: userResult.userId }
    }

    let browser
    try {
        if (browserlessToken) {
            browser = await puppeteerCore.connect({
                browserWSEndpoint: `wss://chrome.browserless.io?token=${browserlessToken}`,
            })
        } else {
            browser = await puppeteer.launch({ headless: true })
        }

        const page = await browser.newPage()
        await page.setViewport({ width: 1280, height: 1000 })

        // Login to admin
        console.log("[Automation] Logging in to admin panel...")
        await page.goto("https://www.audemic.app/users/sign_in", { waitUntil: "networkidle2" })

        if (page.url().includes("/users/sign_in")) {
            await page.waitForSelector('#user_email', { visible: true, timeout: 5000 })
            await page.type('#user_email', adminEmail)
            await page.type('#password', adminPassword)
            await page.click('input[type="submit"]')

            try {
                await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 })
            } catch (e) {
                await new Promise(resolve => setTimeout(resolve, 3000))
            }
        }

        // Navigate to new subscription
        console.log("[Automation] Navigating to subscription form...")
        await page.goto("https://www.audemic.app/admin/subscription/new", { waitUntil: "networkidle2" })

        // Check if we made it to the admin panel
        if (page.url().includes("/users/sign_in")) {
            throw new Error("Login failed - could not access admin panel")
        }

        // Search for the user we just created
        console.log(`[Automation] Searching for user: ${userData.email}`)
        await page.waitForSelector('.ra-filtering-select-input', { visible: true, timeout: 5000 })
        await page.type('.ra-filtering-select-input', userData.email)

        // Wait for autocomplete results
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Click first result
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('Enter')

        // Fill subscription details
        console.log("[Automation] Filling subscription details...")
        await page.waitForSelector('select#subscription_plan_type', { visible: true, timeout: 5000 })
        await page.select('select#subscription_plan_type', 'yearly')

        // Set dates
        const startDate = new Date().toISOString().split('T')[0]
        const endDateObj = new Date()
        endDateObj.setFullYear(endDateObj.getFullYear() + userData.licenseYears)
        const endDate = endDateObj.toISOString().split('T')[0]

        await page.type('input#subscription_start_date', startDate)
        await page.type('input#subscription_end_date', endDate)

        // Toggle active
        try {
            await page.click('label[for="subscription_active"] + div .btn-success')
        } catch (e) { /* ignore */ }

        // Check for dry run
        const isDryRun = userData.email.includes("test@") || userData.email.includes("fake@")
        if (isDryRun) {
            console.log("[Automation] DRY RUN - not saving subscription")
            await browser.close()
            return { success: true, userId: userResult.userId }
        }

        // Save subscription
        console.log("[Automation] Saving subscription...")
        await page.click('button[name="_save"]')
        await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 })

        console.log("[Automation] Success!")
        await browser.close()
        return { success: true, userId: userResult.userId }

    } catch (error: any) {
        if (browser) await browser.close()
        console.error("[Automation] Subscription creation failed:", error)
        return {
            success: false,
            error: `User created (ID: ${userResult.userId}) but subscription failed: ${error.message}`,
            userId: userResult.userId
        }
    }
}

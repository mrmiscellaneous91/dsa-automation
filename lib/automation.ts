import puppeteer from "puppeteer"
import puppeteerCore from "puppeteer-core"

export interface AutomationResult {
    success: boolean
    error?: string
}

export async function automateUserCreation(userData: {
    email: string
    userName: string
    licenseYears: number
}): Promise<AutomationResult> {
    const browserlessToken = process.env.BROWSERLESS_TOKEN
    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminEmail || !adminPassword) {
        return { success: false, error: "Missing admin credentials in environment" }
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

        // 1. Login
        console.log("[Automation] Logging into admin panel...")
        await page.goto("https://www.audemic.app/admin/login", { waitUntil: "networkidle2" })

        if (page.url().includes("/admin/login")) {
            await page.type('input[name="admin_user[email]"]', adminEmail)
            await page.type('input[name="admin_user[password]"]', adminPassword)
            await page.click('input[type="submit"]')
            await page.waitForNavigation({ waitUntil: "networkidle2" })
        }

        // 2. Start Subscription / Add New User (Nested)
        console.log(`[Automation] Navigating to New Subscription page...`)
        await page.goto("https://www.audemic.app/admin/subscription/new", { waitUntil: "networkidle2" })

        // 3. Create User in Modal
        console.log(`[Automation] Opening 'Add a new User' modal...`)
        // The "+ Add a new User" button has data-link="/admin/user/new?modal=true"
        await page.click('a.create[data-link*="/admin/user/new"]')

        // Wait for modal to appear and become visible
        await page.waitForSelector('#modal.show', { visible: true })
        console.log(`[Automation] Modal visible, filling user details...`)

        await page.type('#modal input#user_email', userData.email)
        await page.type('#modal input#user_password', "Audemic@123")

        const names = userData.userName.split(" ")
        const firstName = names[0]
        const lastName = names.slice(1).join(" ") || firstName

        await page.type('#modal input#user_first_name', firstName)
        await page.type('#modal input#user_last_name', lastName)

        // Set email_confirmed and active in modal if switches exist
        try {
            // Find switches within modal
            // rails_admin toggle labels or inputs
            await page.click('#modal label[for="user_email_confirmed"] + div .btn-success').catch(() => { });
            await page.click('#modal label[for="user_active"] + div .btn-success').catch(() => { });
        } catch (e) {
            console.log("[Automation] Error clicking toggles in modal, continuing...")
        }

        console.log(`[Automation] Saving user in modal...`)
        await page.click('#modal .save-action')

        // Wait for modal to close
        await page.waitForSelector('#modal', { hidden: true })
        console.log(`[Automation] User created and modal closed.`)

        // 4. Finalize Subscription
        console.log(`[Automation] Filling subscription details...`)

        // Set Plan Type to Yearly
        await page.select('select#subscription_plan_type', 'yearly')

        // Set Dates
        const startDate = new Date().toISOString().split('T')[0]
        const endDateObj = new Date()
        endDateObj.setFullYear(endDateObj.getFullYear() + userData.licenseYears)
        const endDate = endDateObj.toISOString().split('T')[0]

        await page.type('input#subscription_start_date', startDate)
        await page.type('input#subscription_end_date', endDate)

        // Set Active to True on main form
        try {
            await page.click('label[for="subscription_active"] + div .btn-success')
        } catch (e) {
            console.log("[Automation] Could not toggle active on main form, trying generic toggle...")
            await page.click('a[data-id="subscription_active"]').catch(() => { });
        }

        // Save Subscription
        console.log(`[Automation] Saving subscription...`)
        await page.click('button[name="_save"]')
        await page.waitForNavigation({ waitUntil: "networkidle2" })

        console.log("[Automation] Success: Nested User and Subscription created.")
        await browser.close()
        return { success: true }
    } catch (error: any) {
        if (browser) await browser.close()
        console.error("Automation error:", error)
        return { success: false, error: error.message }
    }
}

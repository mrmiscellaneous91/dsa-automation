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
    let lastUrl = ""
    let lastTitle = ""
    let debugSnippet = ""

    const getDiagnosticInfo = async (page: any) => {
        try {
            lastUrl = page.url()
            lastTitle = await page.title()
            debugSnippet = await page.evaluate(() => document.body.innerText.substring(0, 500))
            return `URL: ${lastUrl} | Title: ${lastTitle} | Snippet: ${debugSnippet}`
        } catch (e) {
            return "Could not capture diagnostic info"
        }
    }

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

        // 1. Login via /users/sign_in (admin uses same user session)
        console.log("[Automation] Logging in via /users/sign_in...")
        await page.goto("https://www.audemic.app/users/sign_in", { waitUntil: "networkidle2" })

        // Check if we need to log in
        if (page.url().includes("/users/sign_in")) {
            console.log("[Automation] On sign-in page, filling login form...")

            // Dismiss cookie banner if present (ignore if not found)
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const okBtn = buttons.find(b => b.textContent?.includes('OK'));
                if (okBtn) (okBtn as HTMLElement).click();
            }).catch(() => { });

            // Wait for form elements to be ready
            await page.waitForSelector('#user_email', { visible: true, timeout: 5000 })
            await page.waitForSelector('#password', { visible: true, timeout: 5000 })

            // Use IDs which are more reliable than name attributes
            await page.type('#user_email', adminEmail)
            await page.type('#password', adminPassword)

            // Click submit button
            await page.click('input[type="submit"]')

            // Wait for navigation or URL change (login might use AJAX)
            try {
                await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 })
            } catch (e) {
                // Navigation might not happen if AJAX login - just wait a moment
                await new Promise(resolve => setTimeout(resolve, 3000))
            }
        }

        // Verify Login Success by checking we're not on the sign-in page
        const currentUrl = page.url()
        if (currentUrl.includes("/users/sign_in")) {
            throw new Error(`Login failed - still on sign_in page. ${await getDiagnosticInfo(page)}`)
        }
        console.log(`[Automation] Login successful, current URL: ${currentUrl}`)

        // 2. Start Subscription / Add New User (Nested)
        console.log(`[Automation] Navigating to New Subscription page...`)
        await page.goto("https://www.audemic.app/admin/subscription/new", { waitUntil: "networkidle2" })

        // 3. Create User in Modal
        const addUserSelector = 'a.create[data-link*="/admin/user/new"]'
        console.log(`[Automation] Searching for 'Add a new User' button...`)

        // Wait and check visibility
        try {
            await page.waitForSelector(addUserSelector, { visible: true, timeout: 5000 })
            await page.click(addUserSelector)
        } catch (e) {
            console.log(`[Automation] CSS selector failed, trying text-based search...`)
            const buttonFound = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('a.create'));
                const target = buttons.find(b => b.textContent?.includes('Add a new User'));
                if (target) {
                    (target as HTMLElement).click();
                    return true;
                }
                return false;
            });
            if (!buttonFound) {
                throw new Error(`Could not find 'Add a new User' button. ${await getDiagnosticInfo(page)}`)
            }
        }

        // Wait for modal to appear and become visible
        console.log(`[Automation] Waiting for modal to appear...`)
        await page.waitForSelector('#modal.show', { visible: true, timeout: 10000 })

        // Wait for specific input inside modal to confirm it's ready
        await page.waitForSelector('#modal input#user_email', { visible: true, timeout: 5000 })
        console.log(`[Automation] Modal ready, filling user details...`)

        await page.type('#modal input#user_email', userData.email)
        await page.type('#modal input#user_password', "Audemic@123")

        const names = userData.userName.split(" ")
        const firstName = names[0]
        const lastName = names.slice(1).join(" ") || firstName

        await page.type('#modal input#user_first_name', firstName)
        await page.type('#modal input#user_last_name', lastName)

        // Set email_confirmed and active in modal if switches exist
        try {
            // Finding switches within modal
            // rails_admin toggle labels or inputs
            await page.click('#modal label[for="user_email_confirmed"] + div .btn-success').catch(() => { });
            await page.click('#modal label[for="user_active"] + div .btn-success').catch(() => { });
        } catch (e) {
            console.log("[Automation] Error clicking toggles in modal, continuing...")
        }

        console.log(`[Automation] Saving user in modal...`)
        await page.click('#modal .save-action')

        // Wait for modal to close
        await page.waitForSelector('#modal', { hidden: true, timeout: 10000 }).catch(async () => {
            throw new Error(`Modal did not close after saving user. ${await getDiagnosticInfo(page)}`)
        })
        console.log(`[Automation] User created and modal closed.`)

        // 4. Finalize Subscription
        console.log(`[Automation] Filling subscription details...`)

        // Ensure main form fields are visible
        await page.waitForSelector('select#subscription_plan_type', { visible: true, timeout: 5000 })

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
        const isDryRun = userData.email.includes("test@") || userData.email.includes("fake@")
        if (isDryRun) {
            console.log("[Automation] SUCCESS (Dry Run): All steps completed with fake data.")
            await browser.close()
            return { success: true }
        }

        console.log(`[Automation] Saving subscription...`)
        const saveButtonSelector = 'button[name="_save"]'
        await page.waitForSelector(saveButtonSelector, { visible: true, timeout: 5000 })
        await page.click(saveButtonSelector)
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

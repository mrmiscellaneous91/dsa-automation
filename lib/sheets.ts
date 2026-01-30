import { google } from "googleapis"

export const getSheetsClient = (accessToken: string) => {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    return google.sheets({ version: "v4", auth })
}

export async function appendToSheet(sheets: any, spreadsheetId: string, range: string, values: any[][]) {
    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values,
        },
    })
}

export async function updateSheet(sheets: any, spreadsheetId: string, range: string, values: any[][]) {
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values,
        },
    })
}

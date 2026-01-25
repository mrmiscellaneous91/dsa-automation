import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
                params: {
                    scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/spreadsheets",
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account }: any) {
            if (account) {
                return {
                    accessToken: account.access_token,
                    refreshToken: account.refresh_token,
                    expiresAt: account.expires_at * 1000,
                    user: token.user
                }
            }

            // If the token has not expired yet, return it
            if (Date.now() < (token.expiresAt as number)) {
                return token
            }

            // If the token has expired, try to refresh it
            try {
                const response = await fetch("https://oauth2.googleapis.com/token", {
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        client_id: process.env.GOOGLE_CLIENT_ID!,
                        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                        grant_type: "refresh_token",
                        refresh_token: token.refreshToken as string,
                    }),
                    method: "POST",
                })

                const tokens = await response.json()

                if (!response.ok) throw tokens

                return {
                    ...token,
                    accessToken: tokens.access_token,
                    expiresAt: Date.now() + tokens.expires_in * 1000,
                    refreshToken: tokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
                }
            } catch (error) {
                console.error("Error refreshing access token", error)
                return { ...token, error: "RefreshAccessTokenError" }
            }
        },
        async session({ session, token }: any) {
            session.accessToken = token.accessToken
            session.error = token.error
            return session
        },
    },
})

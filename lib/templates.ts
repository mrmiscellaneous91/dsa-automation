export const WELCOME_EMAIL_TEMPLATE = (name: string, email: string, years: number, password?: string) => `
<div style="font-family: Arial, sans-serif; color: #333;">
  <p>Hi ${name},</p>
  <p>You now have ${years} year access to Audemic Scholar!</p>
  <p>To log in, <a href="https://app.audemic.io">go here</a> and please use the credentials below. 
  Then change your password by heading to the profile section</p>
  
  <p style="background: #f4f4f4; padding: 10px; border-radius: 5px;">
    <strong>email:</strong> ${email}<br>
    <strong>password:</strong> ${password || process.env.DEFAULT_USER_PASSWORD || 'Audemic@123'}
  </p>

  <p>To get you onboarding and make sure you are getting the best use 
  out of the app, you can schedule a call with me directly <a href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ08Pg3nbKrHREBVA264AWT4LrFzClMCEr2aM7qVj66ro6liGAOEi1_4eAOwOnpjflwtyrJIobbN">here</a>. 
  You can also find a brief demo <a href="https://d2-sqh04.eu1.hs-sales-engage.com/Ctc/W+23284/d2-SQh04/JkM2-6qcW6N1vHY6lZ3mzW7yC-943FJ7P8N8npd_vZzBw7W8nfW1r9j4bkLW5ZPKCx1MRj-BW87y15b9gpl1XW3fyD-M1MJyJNV4C_7k7bQrcfMKD9GZp9xtDW2MPgKf4xWHsfN5-yVd1GtLVSN2RGt1JN2_HzW7-S-Pj6_B-C0W3XwXbL6qgNmFW4Srvnn6gNf3ZW7H3lKC7P6td4W1cgNM58LS7DdW7GRg8838lLwRW8NKCfr5jsgG9W8BMDkR47vDLbW2KDcgZ6DGHvnF1P11yc5-TsMZ9T7458258f5T4K-j04">here</a>.</p>
  
  <p>Feel free to message me directly if you have any questions or issues.</p>
  
  <p>Best regards,</p>
  <p>--<br>
  <strong>Joshua Mitcham</strong><br>
  CEO & Co-Founder<br>
  Audemic<br>
  joshua@audemic.io</p>
</div>
`

export const CONFIRMATION_EMAIL_TEMPLATE = (contactName: string) => `
<div style="font-family: Arial, sans-serif; color: #333;">
  <p>Hi ${contactName},</p>
  <p>User issued.</p>
  <p>Regards,<br>
  --<br>
  <strong>Joshua Mitcham</strong><br>
  CEO & Co-Founder<br>
  Audemic<br>
  joshua@audemic.io</p>
</div>
`

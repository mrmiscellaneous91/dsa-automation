export const WELCOME_EMAIL_TEMPLATE = (name: string, email: string, years: number) => `
<div style="font-family: Arial, sans-serif; color: #333;">
  <p>Hi ${name},</p>
  <p>You now have ${years} year access to Audemic Scholar!</p>
  <p>To log in, <a href="https://app.audemic.io">go here</a> and please use the credentials below. 
  Then change your password by heading to the profile section (Screenshot can be found below)</p>
  
  <p style="background: #f4f4f4; padding: 10px; border-radius: 5px;">
    <strong>email:</strong> ${email}<br>
    <strong>password:</strong> Audemic@123
  </p>

  <p>To get you onboarding and make sure you are getting the best use 
  out of the app, you can schedule a call with me directly here. 
  You can also find a brief demo here.</p>
  
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

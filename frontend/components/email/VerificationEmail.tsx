interface VerificationEmailProps {
  code: string;
  name?: string;
}

export function VerificationEmail({ code, name }: VerificationEmailProps) {
  const greeting = name ? `Hello ${name}` : 'Hello';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;margin:0;padding:40px 20px">
  <div style="background:#ffffff;margin:0 auto;padding:0;max-width:600px;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1)">
    <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center">
      <p style="color:white;font-size:24px;font-weight:bold;margin:0">Verify Your Email</p>
    </div>
    <div style="padding:40px 30px">
      <p style="font-size:16px;color:#333333;margin-top:0">${greeting},</p>
      <p style="font-size:16px;color:#333333">Thank you for registering with KIP. Please verify your email address by entering the code below:</p>
      <div style="text-align:center;margin:30px 0">
        <p style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#667eea;background:#f5f5f5;padding:20px;border-radius:8px;margin:0">${code}</p>
      </div>
      <p style="font-size:14px;color:#666666">This code expires in 15 minutes.</p>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:30px 0">
      <p style="font-size:14px;color:#999999;text-align:center">If you didn't request this, you can safely ignore this email.</p>
      <div style="text-align:center;margin-top:30px">
        <p style="font-size:12px;color:#999999">KIP — Knowledge Intelligence Platform</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

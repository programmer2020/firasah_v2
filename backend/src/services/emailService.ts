import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'mohamedev2030@gmail.com',
    pass: process.env.SMTP_PASS,
  },
});

export const sendUploadCompleteEmail = async (
  toEmail: string,
  filename: string,
  fragmentCount: number
) => {
  try {
    await transporter.sendMail({
      from: `"فراسة AI" <${process.env.SMTP_FROM || 'mohamedev@firasah.ai'}>`,
      to: toEmail,
      subject: `✅ اكتمل تحويل الملف: ${filename}`,
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">فراسة AI - إشعار اكتمال المعالجة</h2>
          <p>مرحبًا،</p>
          <p>تم الانتهاء من معالجة ملفك بنجاح:</p>
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold;">اسم الملف</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${filename}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold;">عدد المقاطع</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${fragmentCount}</td>
            </tr>
          </table>
          <p>يمكنك الآن مراجعة النتائج من خلال لوحة التحكم.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #6b7280; font-size: 12px;">هذه رسالة تلقائية من نظام فراسة AI. لا ترد على هذا البريد.</p>
        </div>
      `,
    });
    console.log(`[Email] ✅ Upload-complete email sent to ${toEmail} for file "${filename}"`);
  } catch (err) {
    console.error(`[Email] ❌ Failed to send email to ${toEmail}:`, err);
  }
};

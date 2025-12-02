// src/services/email.service.js
import nodemailer from 'nodemailer';

console.log('[SMTP CONFIG]', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE,
    user: process.env.SMTP_USER,
    passLen: (process.env.SMTP_PASS || '').length,
});

// Mailtrap SMTP → KHÔNG fallback Gmail
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, // sandbox.smtp.mailtrap.io
    port: Number(process.env.SMTP_PORT), // 2525
    secure: process.env.SMTP_SECURE === 'true', // false đối với Mailtrap
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendOtpEmail(toEmail, otp, purpose) {
    const subjectMap = {
        TRANSFER: 'Mã OTP xác nhận giao dịch chuyển tiền',
        LOGIN: 'Mã OTP đăng nhập',
        CHANGE_PASSWORD: 'Mã OTP đổi mật khẩu',
    };

    const subject = subjectMap[purpose] || 'Mã OTP từ Demo Bank';

    const text = `
Xin chào,

Mã OTP của bạn là: ${otp}

Mục đích: ${purpose}
OTP có hiệu lực trong 5 phút.
Không chia sẻ mã này cho bất kỳ ai.

Demo Bank
    `.trim();

    const html = `
        <p>Xin chào,</p>
        <p>Mã OTP của bạn là: <b>${otp}</b></p>
        <p>Mục đích: <b>${purpose}</b></p>
        <p>OTP có hiệu lực trong <b>5 phút</b>.</p>
        <p><b>Không chia sẻ mã này cho bất kỳ ai.</b></p>
        <br />
        <p>Demo Bank</p>
    `;

    await transporter.sendMail({
        from: process.env.MAIL_FROM || 'Demo Bank <no-reply@demo-bank.local>',
        to: toEmail,
        subject,
        text,
        html,
    });
}

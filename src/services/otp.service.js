// src/services/otp.service.js
import crypto from 'crypto';
import createError from 'http-errors';

// Lưu OTP tạm thời trong RAM: request_id -> { userId, otp, purpose, channel, expiredAt, verified }
const otpStore = new Map();

// Lưu "phiên" OTP đã xác thực: userId -> { purpose, expiresAt }
const otpSession = new Map();

// Tạo 6 chữ số OTP
function generateOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

// 31) Gửi yêu cầu OTP
export async function requestOtp(userId, { channel, purpose }) {
    const requestId = crypto.randomUUID();
    const otp = generateOtp();
    const now = new Date();
    const expiredAt = new Date(now.getTime() + 5 * 60 * 1000); // +5 phút

    otpStore.set(requestId, {
        userId,
        otp,
        purpose,
        channel,
        expiredAt,
        verified: false,
    });

    // Ở môi trường thực tế bạn sẽ gửi OTP qua email/SMS.
    // Ở môi trường dev, mình log ra console để dễ test:
    console.log(
        `[OTP] user=${userId} channel=${channel} purpose=${purpose} request=${requestId} otp=${otp}`
    );

    return {
        request_id: requestId,
        channel,
        purpose,
        expires_in: 300, // giây
        // ⚠️ Không trả otp_code ra response trong sản phẩm thật.
        otp_debug: otp, // để bạn test cho tiện, sau này bỏ đi.
    };
}

// 32) Xác thực OTP
export async function verifyOtp(userId, { request_id, otp_code }) {
    const record = otpStore.get(request_id);
    if (!record) {
        throw createError(400, 'Yêu cầu OTP không tồn tại hoặc đã hết hạn');
    }

    if (record.userId !== userId) {
        throw createError(403, 'Yêu cầu OTP không thuộc về người dùng hiện tại');
    }

    const now = new Date();
    if (now > record.expiredAt) {
        otpStore.delete(request_id);
        throw createError(400, 'OTP đã hết hạn');
    }

    if (record.verified) {
        throw createError(400, 'OTP đã được sử dụng');
    }

    if (record.otp !== otp_code) {
        throw createError(400, 'OTP không đúng');
    }

    // Đánh dấu record OTP đã verify (1 lần)
    record.verified = true;
    otpStore.set(request_id, record);

    // Tạo "phiên" OTP cho user, dùng cho mục đích cụ thể (TRANSFER/LOGIN/...)
    const sessionExpiresAt = new Date(now.getTime() + 2 * 60 * 1000); // ví dụ: 2 phút sau khi verify
    otpSession.set(userId, {
        purpose: record.purpose,
        expiresAt: sessionExpiresAt,
    });

    return {
        ok: true,
        purpose: record.purpose,
        channel: record.channel,
    };
}

// Helper: đảm bảo user đã có OTP hợp lệ cho purpose
export async function ensureOtpForPurpose(userId, expectedPurpose) {
    const session = otpSession.get(userId);
    if (!session) {
        throw createError(400, 'Chưa xác thực OTP cho thao tác này');
    }

    const now = new Date();
    if (now > session.expiresAt) {
        otpSession.delete(userId);
        throw createError(400, 'Phiên OTP đã hết hạn');
    }

    if (session.purpose !== expectedPurpose) {
        throw createError(400, 'OTP không đúng mục đích');
    }
}

// Helper: tiêu thụ session OTP, tránh reuse nhiều lần
export async function consumeOtpForPurpose(userId, expectedPurpose) {
    const session = otpSession.get(userId);
    if (session && session.purpose === expectedPurpose) {
        otpSession.delete(userId);
    }
}

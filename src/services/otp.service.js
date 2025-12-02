// src/services/otp.service.js
import crypto from 'crypto';
import createError from 'http-errors';
import { sendOtpEmail } from './email.service.js';

// Lưu OTP theo request_id
const otpStore = new Map();

// Lưu OTP đã verify theo userId + purpose
const verifiedOtpByUserPurpose = new Map();

// TTL = 5 phút
const OTP_TTL_MS = 5 * 60 * 1000;

function generateOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function cleanupExpired() {
    const now = Date.now();

    // dọn request OTP hết hạn
    for (const [key, record] of otpStore.entries()) {
        if (record.expiredAt.getTime() < now) {
            otpStore.delete(key);
        }
    }

    // dọn OTP đã verify nhưng hết hạn
    for (const [key, record] of verifiedOtpByUserPurpose.entries()) {
        if (record.expiresAt.getTime() < now) {
            verifiedOtpByUserPurpose.delete(key);
        }
    }
}

// ---------------------------------------------------------
// REQUEST OTP
// ---------------------------------------------------------
export async function requestOtp(userId, { channel, purpose, email }) {
    cleanupExpired();

    if (channel === 'EMAIL' && !email) {
        throw createError(400, 'Email là bắt buộc khi gửi OTP qua email');
    }

    const requestId = crypto.randomUUID();
    const otp = generateOtp();

    const now = new Date();
    const expiredAt = new Date(now.getTime() + OTP_TTL_MS);

    const record = {
        userId,
        otp,
        purpose,
        channel,
        email,
        expiredAt,
        verified: false,
        createdAt: now,
    };

    otpStore.set(requestId, record);

    if (channel === 'EMAIL') {
        await sendOtpEmail(email, otp, purpose);
    } else {
        throw createError(400, 'Hệ thống hiện chỉ hỗ trợ gửi OTP qua EMAIL');
    }

    const response = {
        request_id: requestId,
        purpose,
        channel,
        expires_in: Math.floor(OTP_TTL_MS / 1000),
    };

    // Dev mode hiển thị OTP
    if (process.env.NODE_ENV !== 'production') {
        response.otp_debug = otp;
    }

    return response;
}

// ---------------------------------------------------------
// VERIFY OTP
// ---------------------------------------------------------
export async function verifyOtp(userId, { request_id, otp_code }) {
    cleanupExpired();

    const record = otpStore.get(request_id);
    if (!record) throw createError(400, 'OTP không tồn tại hoặc đã hết hạn');

    if (record.userId !== userId)
        throw createError(403, 'OTP không thuộc về người dùng hiện tại');

    if (record.verified)
        throw createError(400, 'OTP đã được sử dụng');

    const now = Date.now();
    if (record.expiredAt.getTime() < now) {
        otpStore.delete(request_id);
        throw createError(400, 'OTP đã hết hạn');
    }

    if (record.otp !== otp_code)
        throw createError(400, 'OTP không đúng');

    // Đánh dấu verified
    record.verified = true;
    otpStore.set(request_id, record);

    // Lưu trạng thái "đã verify OTP cho purpose"
    const key = `${userId}|${record.purpose}`;
    verifiedOtpByUserPurpose.set(key, {
        verifiedAt: new Date(),
        expiresAt: record.expiredAt,
    });

    return {
        ok: true,
        purpose: record.purpose,
        channel: record.channel,
    };
}

// ---------------------------------------------------------
// CHECK OTP BEFORE ACTION (transfer...)
// ---------------------------------------------------------
export async function ensureOtpForPurpose(userId, purpose) {
    cleanupExpired();

    const key = `${userId}|${purpose}`;
    const rec = verifiedOtpByUserPurpose.get(key);

    if (!rec) {
        throw createError(
            400,
            'Bạn phải xác thực OTP cho thao tác này trước khi tiếp tục'
        );
    }

    if (rec.expiresAt.getTime() < Date.now()) {
        verifiedOtpByUserPurpose.delete(key);
        throw createError(400, 'OTP đã hết hạn, vui lòng yêu cầu lại');
    }
}

// ---------------------------------------------------------
// CONSUME OTP AFTER SUCCESSFUL ACTION
// ---------------------------------------------------------
export async function consumeOtpForPurpose(userId, purpose) {
    const key = `${userId}|${purpose}`;
    if (!verifiedOtpByUserPurpose.has(key)) {
        throw createError(
            400,
            'OTP chưa được xác thực hoặc đã bị sử dụng'
        );
    }
    verifiedOtpByUserPurpose.delete(key);
}

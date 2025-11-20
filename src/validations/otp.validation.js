import Joi from 'joi';

// 31) Gửi yêu cầu OTP
export const otpRequestSchema = Joi.object({
    channel: Joi.string().valid('EMAIL', 'SMS').required(),
    purpose: Joi.string()
        .valid('TRANSFER', 'LOGIN', 'CHANGE_PASSWORD')
        .required(),
});

// 32) Xác thực OTP
export const otpVerifySchema = Joi.object({
    request_id: Joi.string().required(),
    otp_code: Joi.string().length(6).required(),
});

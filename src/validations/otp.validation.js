// src/validations/otp.validation.js
import Joi from 'joi';

export const otpRequestSchema = Joi.object({
    channel: Joi.string().valid('EMAIL').required(),
    purpose: Joi.string()
        .valid('TRANSFER', 'LOGIN', 'CHANGE_PASSWORD')
        .required(),
    email: Joi.string().email().required(),
});

export const otpVerifySchema = Joi.object({
    request_id: Joi.string().required(),
    otp_code: Joi.string().length(6).required(),
});

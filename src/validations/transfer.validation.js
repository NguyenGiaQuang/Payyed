// src/validations/transfer.validation.js
import Joi from 'joi';

export const internalTransferSchema = Joi.object({
    from_account_no: Joi.string().required(),
    to_account_no: Joi.string().required(),
    amount: Joi.number().positive().precision(2).required(),
    fee: Joi.number().min(0).precision(2).default(0),
    description: Joi.string().allow('', null).optional(),
    idem_key: Joi.string().required(), // để chống gửi trùng
});

export const transferListQuerySchema = Joi.object({
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
    status: Joi.string()
        .valid('PENDING', 'COMPLETED', 'FAILED', 'CANCELED')
        .optional(),
    account_id: Joi.string().guid().optional(), // cho Staff lọc theo tài khoản
});

export const transferDetailBodySchema = Joi.object({
    transfer_id: Joi.string().guid().required(),
});

// 🔄 Sửa lại để verify OTP cho transfer dùng request_id + otp_code
export const otpVerifySchema = Joi.object({
    request_id: Joi.string().required(),
    otp_code: Joi.string().length(6).required(),
});

export const externalTransferSchema = Joi.object({
    from_account_no: Joi.string().required(),
    to_external_account_no: Joi.string().required(),
    to_external_bank_code: Joi.string().required(),
    amount: Joi.number().positive().precision(2).required(),
    fee: Joi.number().min(0).precision(2).default(0),
    description: Joi.string().allow('', null).optional(),
    idem_key: Joi.string().required(),
});

export const transferFeeSchema = Joi.object({
    type: Joi.string().valid('INTERNAL', 'EXTERNAL').required(),
    amount: Joi.number().positive().precision(2).required(),
});

// src/validations/cash_transaction.validation.js
import Joi from 'joi';

// CUSTOMER gửi yêu cầu nạp / rút
export const requestCashTransactionSchema = Joi.object({
    account_id: Joi.string().guid().required(),
    type: Joi.string().valid('DEPOSIT', 'WITHDRAW').required(),
    amount: Joi.number().positive().precision(2).required(),
    description: Joi.string().max(255).allow('', null).optional(),
});

// STAFF/ADMIN duyệt giao dịch
export const approveCashTransactionSchema = Joi.object({
    transaction_id: Joi.string().guid().required(),
    approve: Joi.boolean().required(),
    reason: Joi.string().max(255).allow('', null).optional(),
});

// Lọc danh sách (cả customer và staff)
export const cashTransactionListQuerySchema = Joi.object({
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
    status: Joi.string()
        .valid('PENDING', 'APPROVED', 'REJECTED', 'CANCELED')
        .optional(),
    type: Joi.string().valid('DEPOSIT', 'WITHDRAW').optional(),
    account_id: Joi.string().guid().optional(),
});

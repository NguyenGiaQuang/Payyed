// src/validations/account.validation.js
import Joi from 'joi';

export const openAccountSchema = Joi.object({
    // CUSTOMER: có thể bỏ qua customer_id
    // STAFF/ADMIN: phải truyền customer_id, sẽ được kiểm tra ở service
    customer_id: Joi.string().guid().optional(),
    account_no: Joi.string().required(),
    type: Joi.string().valid('CURRENT', 'SAVINGS', 'WALLET').required(),
    currency: Joi.string().valid('VND', 'USD').default('VND'),
});

export const accountDetailBodySchema = Joi.object({
    account_id: Joi.string().guid().required(),
});

export const updateAccountStatusBodySchema = Joi.object({
    account_id: Joi.string().guid().required(),
    status: Joi.string().valid('ACTIVE', 'FROZEN', 'CLOSED').required(),
});

export const statementBodySchema = Joi.object({
    account_id: Joi.string().guid().required(),
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
});

// Đặt tài khoản mặc định
export const setDefaultAccountSchema = Joi.object({
    account_id: Joi.string().guid().required(),
});

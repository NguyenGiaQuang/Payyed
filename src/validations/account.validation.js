import Joi from 'joi';

export const openAccountSchema = Joi.object({
    customer_id: Joi.string().guid().required(),
    account_no: Joi.string().required(),
    type: Joi.string().valid('CURRENT', 'SAVINGS', 'WALLET').required(),
    currency: Joi.string().valid('VND', 'USD').default('VND'),
});

// Dùng cho GET /api/accounts/detail
export const accountDetailBodySchema = Joi.object({
    account_id: Joi.string().guid().required(),
});

// Dùng cho PATCH /api/accounts/status
export const updateAccountStatusBodySchema = Joi.object({
    account_id: Joi.string().guid().required(),
    status: Joi.string().valid('ACTIVE', 'FROZEN', 'CLOSED').required(),
});

// Dùng cho POST /api/accounts/statement
export const statementBodySchema = Joi.object({
    account_id: Joi.string().guid().required(),
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
});

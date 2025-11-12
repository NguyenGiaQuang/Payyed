import Joi from 'joi';
export const openAccountSchema = Joi.object({
    customer_id: Joi.string().guid().required(),
    account_no: Joi.string().required(),
    type: Joi.string().valid('CURRENT', 'SAVINGS', 'WALLET').required(),
    currency: Joi.string().valid('VND', 'USD').default('VND'),
});
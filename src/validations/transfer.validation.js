import Joi from 'joi';
export const transferSchema = Joi.object({
    from_account_no: Joi.string().required(),
    to_account_no: Joi.string().required(),
    amount: Joi.number().positive().precision(2).required(),
    fee: Joi.number().min(0).precision(2).default(0),
    idem_key: Joi.string().required(),
});
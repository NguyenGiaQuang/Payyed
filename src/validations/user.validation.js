import Joi from 'joi';

export const assignRoleSchema = Joi.object({
    user_id: Joi.string().guid().required(),
    role_code: Joi.string().optional(),
    role_id: Joi.string().guid().optional(),
}).xor('role_code', 'role_id');

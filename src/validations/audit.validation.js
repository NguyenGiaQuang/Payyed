import Joi from 'joi';

// 33) Lọc audit log
export const auditQuerySchema = Joi.object({
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
    user_id: Joi.string().guid().optional(),
    action: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(500).default(100),
});

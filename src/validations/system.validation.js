import Joi from 'joi';

// 38 & 39: query filter chung
export const systemLogsQuerySchema = Joi.object({
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
    action: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(500).default(100),
});

// 40: retry outbox
export const outboxRetrySchema = Joi.object({
    // null = retry tất cả
    published: Joi.boolean().allow(null).default(false),
    limit: Joi.number().integer().min(1).max(200).default(50),
});
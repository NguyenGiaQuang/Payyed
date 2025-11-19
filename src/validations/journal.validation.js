import Joi from 'joi';

export const journalListQuerySchema = Joi.object({
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
    ref: Joi.string().optional(),
    type: Joi.string().optional(), // nếu bạn có field type trong journal_entry
});

// 25) Chi tiết 1 bút toán kép – id trong body
export const journalDetailBodySchema = Joi.object({
    entry_id: Joi.string().guid().required(),
});

// 26) Tổng hợp số dư hệ thống (theo tài khoản kế toán)
export const ledgerBalanceQuerySchema = Joi.object({
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
});

// 27) Kiểm tra cân bằng Nợ/Có toàn hệ thống
export const ledgerCheckQuerySchema = Joi.object({
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
});

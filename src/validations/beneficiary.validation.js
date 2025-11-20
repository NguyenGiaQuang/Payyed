import Joi from 'joi';

// 29) Thêm thụ hưởng mới
export const createBeneficiarySchema = Joi.object({
    alias: Joi.string().allow(null, '').optional(),
    target_account_no: Joi.string().required(),
    target_bank_code: Joi.string().required()   // luôn có BANKINT hoặc ngân hàng khác
});

// 30) Xóa thụ hưởng - ID trong body
export const deleteBeneficiarySchema = Joi.object({
    beneficiary_id: Joi.string().guid().required(),
});

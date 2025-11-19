import Joi from 'joi';

export const updateProfileSchema = Joi.object({
    full_name: Joi.string().min(3).max(255).required(),
    dob: Joi.date().iso().optional(),
    national_id: Joi.string().max(50).optional(),
    address: Joi.string().max(500).optional(),
});

export const customerDetailSchema = Joi.object({
    customer_id: Joi.string().guid().required(),
});

export const submitKycSchema = Joi.object({
    customer_id: Joi.string().guid().required(),
    documents: Joi.array()
        .items(
            Joi.object({
                doc_type: Joi.string().required(), // 'CCCD_FRONT','SELFIE',...
                url: Joi.string().uri().required(),
            })
        )
        .min(1)
        .required(),
});

export const approveKycSchema = Joi.object({
    customer_id: Joi.string().guid().required(),
    status: Joi.string().valid('APPROVED', 'REJECTED').required(),
});

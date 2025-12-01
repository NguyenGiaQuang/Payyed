import Joi from 'joi';
export const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    full_name: Joi.string().required(),
});
export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

export const changeEmailSchema = Joi.object({
    current_password: Joi.string().min(6).required(),
    new_email: Joi.string().email().required(),
});

export const changePasswordSchema = Joi.object({
    current_password: Joi.string().min(6).required(),
    new_password: Joi.string().min(6).required(),
    confirm_password: Joi.any()
        .valid(Joi.ref('new_password'))
        .required()
        .messages({
            'any.only': 'Mật khẩu xác nhận không khớp',
        }),
});
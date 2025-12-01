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
    current_password: Joi.string()
        .min(6)
        .required()
        .messages({
            'string.empty': 'Vui lòng nhập mật khẩu hiện tại',
        }),

    new_email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Email mới không hợp lệ',
            'string.empty': 'Vui lòng nhập email mới',
        }),
});

export const changePasswordSchema = Joi.object({
    current_password: Joi.string()
        .min(6)
        .required()
        .messages({
            'string.empty': 'Vui lòng nhập mật khẩu hiện tại',
            'string.min': 'Mật khẩu hiện tại tối thiểu 6 ký tự',
        }),

    new_password: Joi.string()
        .min(6)
        .required()
        .messages({
            'string.empty': 'Vui lòng nhập mật khẩu mới',
            'string.min': 'Mật khẩu mới tối thiểu 6 ký tự',
        }),

    confirm_password: Joi.any()
        .valid(Joi.ref('new_password'))
        .required()
        .messages({
            'any.only': 'Mật khẩu xác nhận không khớp',
            'any.required': 'Vui lòng nhập lại mật khẩu xác nhận',
        }),
});
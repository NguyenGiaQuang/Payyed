import Joi from 'joi';

// 34) Lấy danh sách thông báo – không cần body, chỉ dùng token Customer

// 35) Đánh dấu đã đọc – id trong body
export const markReadSchema = Joi.object({
    notification_id: Joi.string().guid().required(),
});

// 36) Xoá thông báo – id trong body
export const deleteNotificationSchema = Joi.object({
    notification_id: Joi.string().guid().required(),
});

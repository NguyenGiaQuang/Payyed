import createError from 'http-errors';
import { Notification } from '../models/index.js';

// 34) Danh sách thông báo
export async function listMyNotifications(userId) {
    return Notification.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
    });
}

// 35) Đánh dấu đã đọc
export async function markNotificationRead(userId, notificationId) {
    const noti = await Notification.findByPk(notificationId);
    if (!noti) throw createError(404, 'Không tìm thấy thông báo');

    if (noti.user_id !== userId)
        throw createError(403, 'Không được thao tác trên thông báo của người khác');

    if (!noti.is_read) {
        noti.is_read = true;
        await noti.save();
    }

    return noti;
}

// 36) Xóa thông báo
export async function deleteMyNotification(userId, notificationId) {
    const noti = await Notification.findByPk(notificationId);
    if (!noti) throw createError(404, 'Không tìm thấy thông báo');

    if (noti.user_id !== userId)
        throw createError(403, 'Không được thao tác trên thông báo của người khác');

    await noti.destroy();
    return { ok: true };
}

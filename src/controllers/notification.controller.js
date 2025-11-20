import {
    listMyNotifications,
    markNotificationRead,
    deleteMyNotification,
} from '../services/notification.service.js';

import {
    markReadSchema,
    deleteNotificationSchema,
} from '../validations/notification.validation.js';

export const NotificationController = {
    async list(req, res, next) {
        try {
            const data = await listMyNotifications(req.user.sub);
            res.json(data);
        } catch (e) { next(e); }
    },

    async markRead(req, res, next) {
        try {
            const { notification_id } = await markReadSchema.validateAsync(req.body);
            const data = await markNotificationRead(req.user.sub, notification_id);
            res.json(data);
        } catch (e) { next(e); }
    },

    async remove(req, res, next) {
        try {
            const { notification_id } = await deleteNotificationSchema.validateAsync(req.body);
            const data = await deleteMyNotification(req.user.sub, notification_id);
            res.json(data);
        } catch (e) { next(e); }
    },
};

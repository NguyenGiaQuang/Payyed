import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const r = Router();

// 34) GET /api/notifications – danh sách thông báo
r.get(
    '/',
    auth(true),
    requireRole(['CUSTOMER']),
    NotificationController.list,
);

// 35) PATCH /api/notifications/read – đánh dấu đã đọc (id trong body)
r.patch(
    '/read',
    auth(true),
    requireRole(['CUSTOMER']),
    NotificationController.markRead,
);

// 36) DELETE /api/notifications – xoá thông báo (id trong body)
r.delete(
    '/',
    auth(true),
    requireRole(['CUSTOMER']),
    NotificationController.remove,
);

export default r;

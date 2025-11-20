import {
    getSystemHealth,
    getSystemStats,
    getSystemLogs,
    retryOutboxEvents,
} from '../services/system.service.js';

import {
    systemLogsQuerySchema,
    outboxRetrySchema,
} from '../validations/system.validation.js';

export const SystemController = {
    // 37) GET /api/system/health
    async health(req, res, next) {
        try {
            const data = await getSystemHealth();
            res.json(data);
        } catch (e) {
            next(e);
        }
    },

    // 38) GET /api/system/stats
    async stats(req, res, next) {
        try {
            const data = await getSystemStats();
            res.json(data);
        } catch (e) {
            next(e);
        }
    },

    // 39) GET /api/system/logs
    async logs(req, res, next) {
        try {
            const filters = await systemLogsQuerySchema.validateAsync(req.query);
            const data = await getSystemLogs(filters);
            res.json(data);
        } catch (e) {
            next(e);
        }
    },

    // 40) POST /api/system/outbox/retry
    async retryOutbox(req, res, next) {
        try {
            const payload = await outboxRetrySchema.validateAsync(req.body || {});
            const data = await retryOutboxEvents(payload);
            res.json(data);
        } catch (e) {
            next(e);
        }
    },
};

// src/controllers/audit.controller.js
import { listAuditLogs } from '../services/audit.service.js';
import { auditQuerySchema } from '../validations/audit.validation.js';

export const AuditController = {
    async list(req, res, next) {
        try {
            const filters = await auditQuerySchema.validateAsync(req.query);
            const data = await listAuditLogs(filters);
            res.json(data);
        } catch (e) { next(e); }
    },
};

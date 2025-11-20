import { Op } from 'sequelize';
import { AppAudit } from '../models/index.js';

export async function writeAuditLog({ user_id, action, ref_id, meta }) {
    await AppAudit.create({
        user_id: user_id || null,
        action,
        ref_id: ref_id || null,
        meta: meta || null,
    });
}

export async function listAuditLogs(filters) {
    const { from, to, user_id, action, limit } = filters;

    const where = {};

    if (from || to) {
        where.created_at = {};
        if (from) where.created_at[Op.gte] = new Date(from);
        if (to) where.created_at[Op.lte] = new Date(to);
    }

    if (user_id) where.user_id = user_id;
    if (action) where.action = action;

    const rows = await AppAudit.findAll({
        where,
        order: [["created_at", "DESC"]],
        limit: limit || 100,
    });

    return rows;
}

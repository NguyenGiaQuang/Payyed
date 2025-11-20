import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import {
    User,
    Customer,
    Account,
    Transfer,
    JournalEntry,
    AppAudit,
    OutboxEvent,
} from '../models/index.js';

// 37) Health check
export async function getSystemHealth() {
    const start = Date.now();

    // Kiểm tra kết nối DB
    let dbOk = false;
    let dbError = null;
    try {
        await sequelize.authenticate();
        dbOk = true;
    } catch (e) {
        dbOk = false;
        dbError = e.message;
    }

    const latencyMs = Date.now() - start;

    return {
        status: dbOk ? 'OK' : 'ERROR',
        uptime_sec: Math.floor(process.uptime()),
        db: {
            ok: dbOk,
            latency_ms: latencyMs,
            error: dbError,
        },
        env: {
            node_env: process.env.NODE_ENV || 'development',
        },
    };
}

// 38) Tổng hợp thống kê
export async function getSystemStats() {
    const [
        totalUsers,
        totalCustomers,
        totalAccounts,
        totalTransfers,
        totalJournalEntries,
    ] = await Promise.all([
        User.count(),
        Customer.count(),
        Account.count(),
        Transfer.count(),
        JournalEntry.count(),
    ]);

    return {
        users: totalUsers,
        customers: totalCustomers,
        accounts: totalAccounts,
        transfers: totalTransfers,
        journal_entries: totalJournalEntries,
    };
}

// 39) Nhật ký hệ thống (dùng bảng app_audit)
export async function getSystemLogs(filters) {
    const { from, to, action, limit } = filters;
    const where = {};

    if (from || to) {
        where.created_at = {};
        if (from) where.created_at[Op.gte] = new Date(from);
        if (to) where.created_at[Op.lte] = new Date(to);
    }

    if (action) {
        where.action = action;
    }

    const rows = await AppAudit.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
    });

    return rows;
}

// 40) Retry outbox_event
export async function retryOutboxEvents({ limit, published }) {
    // published = false → retry các event chưa publish
    // published = null → retry tất cả

    const where = {};

    if (published === false) {
        where.published = false;
    }

    const events = await OutboxEvent.findAll({
        where,
        order: [['occurred_at', 'ASC']],
        limit: limit || 50,
    });

    // DEMO: đánh dấu event đã publish (không gửi thật)
    for (const ev of events) {
        ev.published = true;
        await ev.save();
    }

    return {
        retried: events.length,
    };
}
import { Op } from 'sequelize';
import {
    JournalEntry,
    JournalLine,
    GLAccount,
} from '../models/index.js';

// Helper: load tất cả journal line trong khoảng thời gian (nếu có)
async function loadLinesWithFilter({ from, to }) {
    const whereEntry = {};

    if (from || to) {
        whereEntry.created_at = {};
        if (from) whereEntry.created_at[Op.gte] = new Date(from);
        if (to) whereEntry.created_at[Op.lte] = new Date(to);
    }

    const lines = await JournalLine.findAll({
        include: [
            {
                model: JournalEntry,
                as: 'entry',
                required: true,
                where: Object.keys(whereEntry).length ? whereEntry : undefined,
            },
            {
                model: GLAccount,
                as: 'gl_account',
                required: false,
            },
        ],
    });

    return lines;
}

// 26) Tổng hợp số dư hệ thống (theo tài khoản kế toán)
export async function getLedgerBalance(filters) {
    const lines = await loadLinesWithFilter(filters);

    // Map gl_account_id → tổng Nợ/Có
    const map = new Map();

    for (const line of lines) {
        const gaId = line.gl_account_id || 'UNASSIGNED';
        const key = String(gaId);

        if (!map.has(key)) {
            map.set(key, {
                gl_account_id: gaId,
                gl_code: line.gl_account?.code || null,
                gl_name: line.gl_account?.name || null,
                debit: 0,
                credit: 0,
            });
        }

        const bucket = map.get(key);
        const amount = Number(line.amount || 0);

        if (line.dc === 'DEBIT') {
            bucket.debit += amount;
        } else if (line.dc === 'CREDIT') {
            bucket.credit += amount;
        }
    }

    return Array.from(map.values());
}

// 27) Kiểm tra cân bằng Nợ/Có toàn hệ thống
export async function checkLedgerBalanced(filters) {
    const balances = await getLedgerBalance(filters);

    let totalDebit = 0;
    let totalCredit = 0;

    for (const row of balances) {
        totalDebit += row.debit;
        totalCredit += row.credit;
    }

    return {
        total_debit: totalDebit,
        total_credit: totalCredit,
        balanced: Number(totalDebit.toFixed(2)) === Number(totalCredit.toFixed(2)),
        rows: balances,
    };
}

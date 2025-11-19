import createError from 'http-errors';
import { Op } from 'sequelize';
import {
    JournalEntry,
    JournalLine,
    GLAccount,
} from '../models/index.js';

// 24) Danh sách journal entry
export async function listJournalEntries(filters) {
    const { from, to, ref, type } = filters;
    const where = {};

    if (from || to) {
        where.created_at = {};
        if (from) where.created_at[Op.gte] = new Date(from);
        if (to) where.created_at[Op.lte] = new Date(to);
    }

    if (ref) where.ref = ref;
    if (type) where.type = type;

    const entries = await JournalEntry.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit: 200,
    });

    return entries;
}

// 25) Chi tiết 1 bút toán kép (journal entry + các journal line)
export async function getJournalEntryDetail(entryId) {
    const entry = await JournalEntry.findByPk(entryId, {
        include: [
            {
                model: JournalLine,
                as: 'lines',
                required: false,
                include: [
                    {
                        model: GLAccount,
                        as: 'gl_account',
                        required: false,
                    },
                ],
            },
        ],
    });

    if (!entry) throw createError(404, 'Không tìm thấy bút toán');

    return entry;
}

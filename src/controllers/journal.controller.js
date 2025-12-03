import {
    listJournalEntries,
    getJournalEntryDetail,
} from '../services/journal.service.js';

import {
    journalListQuerySchema,
    journalDetailBodySchema, // schema này chỉ cần có field entry_id là được
} from '../validations/journal.validation.js';

export const JournalController = {
    // 24) GET /api/journals – danh sách journal entry
    async list(req, res, next) {
        try {
            const filters = await journalListQuerySchema.validateAsync(req.query);
            const entries = await listJournalEntries(filters);
            res.json(entries);
        } catch (e) {
            next(e);
        }
    },

    // 25) GET /api/journals/detail – chi tiết bút toán kép (ID qua query)
    async detailByBody(req, res, next) {
        try {
            // Ưu tiên lấy từ body (nếu sau này có client khác dùng),
            // còn không thì lấy từ query (?entry_id=...)
            const source = Object.keys(req.body || {}).length ? req.body : req.query;

            const { entry_id } = await journalDetailBodySchema.validateAsync(source);

            const entry = await getJournalEntryDetail(entry_id);
            res.json(entry);
        } catch (e) {
            next(e);
        }
    },
};

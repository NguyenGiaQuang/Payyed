import {
    listJournalEntries,
    getJournalEntryDetail,
} from '../services/journal.service.js';

import {
    journalListQuerySchema,
    journalDetailBodySchema,
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

    // 25) GET /api/journals/detail – chi tiết bút toán kép (ID trong body)
    async detailByBody(req, res, next) {
        try {
            const { entry_id } = await journalDetailBodySchema.validateAsync(req.body);
            const entry = await getJournalEntryDetail(entry_id);
            res.json(entry);
        } catch (e) {
            next(e);
        }
    },
};

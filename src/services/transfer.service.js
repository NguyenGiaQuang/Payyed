import createError from 'http-errors';
import { sequelize } from '../config/database.js';
import { Account, AccountLimit, Transfer, GLAccount, JournalEntry, JournalLine } from '../models/index.js';
import { ensureIdempotency } from '../utils/idem.util.js';

const GA_DEPOSITS = '201001';
const GA_CASH = '101001';
const GA_FEE = '401001';

export async function internalTransfer({ from_account_no, to_account_no, amount, fee, idem_key, userId }) {
    // lấy 2 account
    const from = await Account.findOne({ where: { account_no: from_account_no, status: 'ACTIVE' } });
    const to = await Account.findOne({ where: { account_no: to_account_no, status: 'ACTIVE' } });
    if (!from || !to) throw createError(404, 'Tài khoản không tồn tại');
    if (from.currency !== to.currency) throw createError(400, 'Khác loại tiền tệ');
    if (from.id === to.id) throw createError(400, 'Không thể chuyển cùng tài khoản');

    const lim = await AccountLimit.findOne({ where: { account_id: from.id } });
    if (Number(amount) > Number(lim.per_txn_limit)) throw createError(400, 'Vượt hạn mức giao dịch');

    // Giao dịch an toàn
    return sequelize.transaction({ isolationLevel: 'SERIALIZABLE' }, async (t) => {
        // idempotency
        await ensureIdempotency(idem_key, 'TRANSFER', t);

        // Khóa row để kiểm tra số dư chính xác
        const [fromLocked] = await sequelize.query('SELECT id, balance::numeric FROM account WHERE id = :id FOR UPDATE', { replacements: { id: from.id }, transaction: t });
        const [toLocked] = await sequelize.query('SELECT id FROM account WHERE id = :id FOR UPDATE', { replacements: { id: to.id }, transaction: t }); // eslint-disable-line no-unused-vars

        const totalDebit = Number(amount) + Number(fee || 0);
        const curBal = Number(fromLocked[0].balance);
        if (curBal < totalDebit) throw createError(400, 'Số dư không đủ');

        // Trừ/ cộng số dư (cột balance dùng cho hiển thị nhanh)
        await sequelize.query('UPDATE account SET balance = balance - :amt - :fee WHERE id = :id', { replacements: { id: from.id, amt: amount, fee: fee || 0 }, transaction: t });
        await sequelize.query('UPDATE account SET balance = balance + :amt WHERE id = :id', { replacements: { id: to.id, amt: amount }, transaction: t });

        // Tạo record transfer (PENDING -> COMPLETED)
        const transfer = await Transfer.create({ from_account_id: from.id, to_account_id: to.id, currency: from.currency, amount, fee: fee || 0, idem_key, status: 'PENDING' }, { transaction: t });

        // Journal
        const gaCash = await GLAccount.findOne({ where: { code: GA_CASH } });
        const gaDep = await GLAccount.findOne({ where: { code: GA_DEPOSITS } });
        const gaFee = await GLAccount.findOne({ where: { code: GA_FEE } });

        const je = await JournalEntry.create({ ref: `TX-${transfer.id}`, description: `${from_account_no} -> ${to_account_no} ${amount}` }, { transaction: t });

        // 1) Debit Deposits (Alice) amount
        await JournalLine.create({ entry_id: je.id, gl_account_id: gaDep.id, customer_account_id: from.id, dc: 'DEBIT', amount }, { transaction: t });
        // 2) Credit Deposits (Bob) amount
        await JournalLine.create({ entry_id: je.id, gl_account_id: gaDep.id, customer_account_id: to.id, dc: 'CREDIT', amount }, { transaction: t });

        if (fee && Number(fee) > 0) {
            // 3) Fee: Debit Deposits (Alice) fee
            await JournalLine.create({ entry_id: je.id, gl_account_id: gaDep.id, customer_account_id: from.id, dc: 'DEBIT', amount: fee }, { transaction: t });
            // 4) Fee: Credit Fee Income
            await JournalLine.create({ entry_id: je.id, gl_account_id: gaFee.id, customer_account_id: null, dc: 'CREDIT', amount: fee }, { transaction: t });
        }


        await transfer.update({ status: 'COMPLETED', completed_at: new Date() }, { transaction: t });


        return { transfer_id: transfer.id };
    });
}
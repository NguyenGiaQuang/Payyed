// src/services/transfer.service.js
import createError from 'http-errors';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import {
    Account,
    Transfer,
    Customer,
    Role,
    UserRole,
    AccountLimit,
    JournalEntry,
    JournalLine,
    GLAccount,
    Notification,
} from '../models/index.js';

import { ensureOtpForPurpose, consumeOtpForPurpose } from './otp.service.js';
import { writeAuditLog } from './audit.service.js';

// =====================
// Helpers
// =====================

async function getUserRoleCodes(userId) {
    const rows = await UserRole.findAll({
        where: { user_id: userId },
        include: [{ model: Role }],
    });
    return rows.map((r) => r.role?.code).filter(Boolean);
}

async function getCustomerAndAccountsByUser(userId, tx) {
    const customer = await Customer.findOne({
        where: { user_id: userId },
        transaction: tx,
    });
    if (!customer) return { customer: null, accountIds: [] };

    const accounts = await Account.findAll({
        where: { customer_id: customer.id },
        attributes: ['id'],
        transaction: tx,
    });
    const accountIds = accounts.map((a) => a.id);
    return { customer, accountIds };
}

// =====================
// 18) Internal transfer – VERSION FULL
// =====================

export async function createInternalTransfer(userId, payload) {
    const { from_account_no, to_account_no, amount, fee = 0, description, idem_key } = payload;

    // 0) Kiểm tra role: CUSTOMER phải có OTP, STAFF/ADMIN có thể bypass (tuỳ policy)
    const roleCodes = await getUserRoleCodes(userId);
    const isStaffOrAdmin = roleCodes.includes('STAFF') || roleCodes.includes('ADMIN');

    if (!isStaffOrAdmin) {
        // Nếu là khách hàng, yêu cầu OTP đã verify cho purpose TRANSFER
        await ensureOtpForPurpose(userId, 'TRANSFER');
    }

    // Thực hiện giao dịch trong transaction
    const { tr, journalEntryId } = await sequelize.transaction(async (tx) => {
        // 1) Idempotency: nếu đã có transfer với idem_key thì trả về luôn
        const existed = await Transfer.findOne({
            where: { idem_key },
            transaction: tx,
            lock: tx.LOCK.UPDATE,
        });
        if (existed) {
            return { tr: existed, journalEntryId: null };
        }

        // 2) Lấy customer + account của user
        const { customer } = await getCustomerAndAccountsByUser(userId, tx);
        if (!customer) throw createError(403, 'Không tìm thấy khách hàng của user');

        // KYC phải APPROVED
        if (customer.kyc !== 'APPROVED') {
            throw createError(403, 'Tài khoản chưa KYC APPROVED, không được chuyển tiền');
        }

        // 3) Lấy tài khoản nguồn/đích + lock
        const fromAcc = await Account.findOne({
            where: { account_no: from_account_no },
            transaction: tx,
            lock: tx.LOCK.UPDATE,
        });
        const toAcc = await Account.findOne({
            where: { account_no: to_account_no },
            transaction: tx,
            lock: tx.LOCK.UPDATE,
        });

        if (!fromAcc) throw createError(404, 'Tài khoản nguồn không tồn tại');
        if (!toAcc) throw createError(404, 'Tài khoản đích không tồn tại');

        // 4) Check tài khoản nguồn thuộc về customer hiện tại
        if (fromAcc.customer_id !== customer.id) {
            throw createError(403, 'Không được phép chuyển tiền từ tài khoản không thuộc sở hữu');
        }

        // 5) Check cùng loại tiền tệ, trạng thái ACTIVE
        if (fromAcc.currency !== toAcc.currency) {
            throw createError(400, 'Hai tài khoản phải cùng loại tiền tệ');
        }
        if (fromAcc.status !== 'ACTIVE' || toAcc.status !== 'ACTIVE') {
            throw createError(400, 'Tài khoản phải ở trạng thái ACTIVE');
        }

        // 6) Check hạn mức (nếu có AccountLimit)
        const totalDebit = Number(amount) + Number(fee);

        if (AccountLimit) {
            const limitRow = await AccountLimit.findOne({
                where: { account_id: fromAcc.id },
                transaction: tx,
                lock: tx.LOCK.UPDATE,
            });

            if (limitRow) {
                // 6.1) Hạn mức mỗi giao dịch
                if (totalDebit > Number(limitRow.per_txn_limit)) {
                    throw createError(400, 'Vượt quá hạn mức cho một giao dịch');
                }

                // 6.2) Hạn mức trong ngày: sum (amount + fee) của các giao dịch COMPLETED từ tài khoản này trong ngày
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date();
                endOfDay.setHours(23, 59, 59, 999);

                const todaysTransfers = await Transfer.findAll({
                    where: {
                        from_account_id: fromAcc.id,
                        status: 'COMPLETED',
                        created_at: {
                            [Op.between]: [startOfDay, endOfDay],
                        },
                    },
                    attributes: ['amount', 'fee'],
                    transaction: tx,
                });

                let usedToday = 0;
                for (const t of todaysTransfers) {
                    usedToday += Number(t.amount || 0) + Number(t.fee || 0);
                }

                if (usedToday + totalDebit > Number(limitRow.daily_outward_limit)) {
                    throw createError(400, 'Vượt quá hạn mức chuyển tiền trong ngày');
                }
            }
        }

        // 7) Check số dư
        const currentBalance = Number(fromAcc.balance || 0);
        if (currentBalance < totalDebit) {
            throw createError(400, 'Số dư không đủ để thực hiện giao dịch');
        }

        // 8) Cập nhật số dư hai tài khoản
        fromAcc.balance = currentBalance - totalDebit;
        toAcc.balance = Number(toAcc.balance || 0) + Number(amount);

        await fromAcc.save({ transaction: tx });
        await toAcc.save({ transaction: tx });

        // 9) Tạo bản ghi transfer
        const now = new Date();
        const tr = await Transfer.create(
            {
                from_account_id: fromAcc.id,
                to_account_id: toAcc.id,
                to_external_account_no: null,
                to_external_bank_code: null,
                currency: fromAcc.currency,
                amount,
                fee,
                idem_key,
                status: 'COMPLETED',
                created_at: now,
                completed_at: now,
            },
            { transaction: tx },
        );

        // 10) Tạo bút toán kép (journal_entry + journal_line)
        const depGL = await GLAccount.findOne({
            where: { code: '201001' }, // Customer Deposits
            transaction: tx,
            lock: tx.LOCK.UPDATE,
        });
        const feeGL = await GLAccount.findOne({
            where: { code: '401001' }, // Fee Income
            transaction: tx,
            lock: tx.LOCK.UPDATE,
        });

        if (!depGL) {
            throw createError(500, 'Không tìm thấy GLAccount code=201001');
        }
        if (fee > 0 && !feeGL) {
            throw createError(500, 'Không tìm thấy GLAccount code=401001');
        }

        const entry = await JournalEntry.create(
            {
                ref: `TX-${tr.id}`,
                description:
                    description ||
                    `Internal transfer ${from_account_no} -> ${to_account_no}`,
                created_at: now,
            },
            { transaction: tx },
        );

        // 10.1) Decrease deposit (fromAcc): DEBIT Deposits (Alice) amount
        await JournalLine.create(
            {
                entry_id: entry.id,
                gl_account_id: depGL.id,
                customer_account_id: fromAcc.id,
                dc: 'DEBIT',
                amount,
            },
            { transaction: tx },
        );

        // 10.2) Increase deposit (toAcc): CREDIT Deposits (Bob) amount
        await JournalLine.create(
            {
                entry_id: entry.id,
                gl_account_id: depGL.id,
                customer_account_id: toAcc.id,
                dc: 'CREDIT',
                amount,
            },
            { transaction: tx },
        );

        // 10.3) Fee: Debit Deposits (fromAcc) fee; Credit Fee Income fee
        if (fee > 0) {
            await JournalLine.create(
                {
                    entry_id: entry.id,
                    gl_account_id: depGL.id,
                    customer_account_id: fromAcc.id,
                    dc: 'DEBIT',
                    amount: fee,
                },
                { transaction: tx },
            );

            await JournalLine.create(
                {
                    entry_id: entry.id,
                    gl_account_id: feeGL.id,
                    customer_account_id: null,
                    dc: 'CREDIT',
                    amount: fee,
                },
                { transaction: tx },
            );
        }

        // 11) Tạo notification cho 2 bên (nếu có user_id)
        const fromCustomer = customer;
        const toCustomer = await Customer.findByPk(toAcc.customer_id, {
            transaction: tx,
        });

        if (fromCustomer?.user_id) {
            await Notification.create(
                {
                    user_id: fromCustomer.user_id,
                    title: 'Bạn vừa chuyển tiền',
                    body: `Bạn đã chuyển ${totalDebit
                        } ${fromAcc.currency} (gồm phí ${fee}) tới tài khoản ${to_account_no}.`,
                    is_read: false,
                },
                { transaction: tx },
            );
        }

        if (toCustomer?.user_id) {
            await Notification.create(
                {
                    user_id: toCustomer.user_id,
                    title: 'Bạn vừa nhận tiền',
                    body: `Bạn đã nhận ${amount} ${toAcc.currency} từ tài khoản ${from_account_no}.`,
                    is_read: false,
                },
                { transaction: tx },
            );
        }

        return { tr, journalEntryId: entry.id };
    });

    // 12) Ghi audit log sau khi transaction commit thành công
    await writeAuditLog({
        user_id: userId,
        action: 'CREATE_TRANSFER',
        ref_id: tr.id,
        meta: {
            type: 'INTERNAL',
            from_account_no,
            to_account_no,
            amount,
            fee,
            currency: tr.currency,
            journal_entry_id: journalEntryId,
        },
    });

    // 13) Consume session OTP cho TRANSFER (chỉ với CUSTOMER)
    if (!isStaffOrAdmin) {
        await consumeOtpForPurpose(userId, 'TRANSFER');
    }

    return tr;
}

// =====================
// 22) External transfer (tạm giữ nguyên logic cũ)
// =====================

export async function createExternalTransfer(userId, payload) {
    const {
        from_account_no,
        to_external_account_no,
        to_external_bank_code,
        amount,
        fee = 0,
        description,
        idem_key,
    } = payload;

    return sequelize.transaction(async (tx) => {
        const existed = await Transfer.findOne({
            where: { idem_key },
            transaction: tx,
            lock: tx.LOCK.UPDATE,
        });
        if (existed) return existed;

        const { customer } = await getCustomerAndAccountsByUser(userId, tx);
        if (!customer) throw createError(403, 'Không tìm thấy khách hàng của user');

        const fromAcc = await Account.findOne({
            where: { account_no: from_account_no },
            transaction: tx,
            lock: tx.LOCK.UPDATE,
        });
        if (!fromAcc) throw createError(404, 'Tài khoản nguồn không tồn tại');

        if (fromAcc.customer_id !== customer.id) {
            throw createError(403, 'Không được phép chuyển tiền từ tài khoản không thuộc sở hữu');
        }

        if (fromAcc.status !== 'ACTIVE') {
            throw createError(400, 'Tài khoản phải ở trạng thái ACTIVE');
        }

        const totalDebit = Number(amount) + Number(fee);
        const currentBalance = Number(fromAcc.balance || 0);

        if (currentBalance < totalDebit) {
            throw createError(400, 'Số dư không đủ để thực hiện giao dịch');
        }

        // Giao dịch external: chỉ trừ ở tài khoản nguồn
        fromAcc.balance = currentBalance - totalDebit;
        await fromAcc.save({ transaction: tx });

        const now = new Date();
        const tr = await Transfer.create(
            {
                from_account_id: fromAcc.id,
                to_account_id: null,
                to_external_account_no,
                to_external_bank_code,
                currency: fromAcc.currency,
                amount,
                fee,
                idem_key,
                status: 'COMPLETED',
                created_at: now,
                completed_at: now,
            },
            { transaction: tx },
        );

        return tr;
    });
}

// =====================
// 19) Danh sách giao dịch
// =====================

export async function listTransfers(userId, filters) {
    const { from, to, status, account_id } = filters;
    const codes = await getUserRoleCodes(userId);
    const isStaff = codes.includes('STAFF') || codes.includes('ADMIN');

    const where = {};

    if (status) {
        where.status = status;
    }

    if (from || to) {
        where.created_at = {};
        if (from) where.created_at[Op.gte] = new Date(from);
        if (to) where.created_at[Op.lte] = new Date(to);
    }

    if (isStaff) {
        // Staff có thể xem theo toàn hệ thống hoặc lọc account_id nếu có
        if (account_id) {
            where[Op.or] = [
                { from_account_id: account_id },
                { to_account_id: account_id },
            ];
        }
    } else {
        // Customer chỉ xem được giao dịch liên quan tới tài khoản của mình
        const { accountIds } = await getCustomerAndAccountsByUser(userId);
        if (!accountIds.length) return [];
        where[Op.or] = [
            { from_account_id: { [Op.in]: accountIds } },
            { to_account_id: { [Op.in]: accountIds } },
        ];
    }

    const transfers = await Transfer.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit: 200,
    });

    return transfers;
}

// =====================
// 20) Chi tiết giao dịch
// =====================

export async function getTransferDetail(transferId, userId) {
    const tr = await Transfer.findByPk(transferId);
    if (!tr) throw createError(404, 'Không tìm thấy giao dịch');

    const codes = await getUserRoleCodes(userId);
    const isStaff = codes.includes('STAFF') || codes.includes('ADMIN');
    if (isStaff) return tr;

    // Customer: phải là chủ của from/to account
    const { accountIds } = await getCustomerAndAccountsByUser(userId);
    if (!accountIds.length) throw createError(403, 'Không có quyền xem giao dịch này');

    const related =
        accountIds.includes(tr.from_account_id) ||
        accountIds.includes(tr.to_account_id);
    if (!related) throw createError(403, 'Không có quyền xem giao dịch này');

    return tr;
}

// =====================
// 23) Tính phí tạm tính (giữ nguyên)
// =====================

export function calcTransferFee(type, amount) {
    const amt = Number(amount);

    let fee = 0;
    if (type === 'INTERNAL') {
        // Ví dụ: nội bộ miễn phí dưới 5 triệu, trên 5 triệu phí 3,000
        if (amt > 5_000_000) fee = 3000;
    } else if (type === 'EXTERNAL') {
        // Ví dụ: liên ngân hàng phí cố định 7,000
        fee = 7000;
    }

    return {
        type,
        amount: amt,
        fee,
        total_debit: amt + fee,
    };
}

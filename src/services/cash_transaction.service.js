// src/services/cash_transaction.service.js
import createError from 'http-errors';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import {
    CashTransaction,
    Account,
    Customer,
    Role,
    UserRole,
    GLAccount,
    JournalEntry,
    JournalLine,
    Notification,
} from '../models/index.js';
import { writeAuditLog } from './audit.service.js';

// ===================================
// Helpers
// ===================================

async function getUserRoleCodes(userId) {
    const rows = await UserRole.findAll({
        where: { user_id: userId },
        include: [{ model: Role }],
    });
    return rows.map((r) => r.role?.code).filter(Boolean);
}

async function getCustomerByUser(userId) {
    return Customer.findOne({ where: { user_id: userId } });
}

async function getGlByCode(code, tx) {
    const gl = await GLAccount.findOne({
        where: { code },
        transaction: tx,
    });
    if (!gl) {
        throw createError(500, `Không tìm thấy GLAccount code=${code}`);
    }
    return gl;
}

// ===================================
// 1) CUSTOMER gửi yêu cầu Nạp/Rút
// ===================================

export async function requestCashTransaction(userId, payload) {
    const { account_id, type, amount, description } = payload;

    const customer = await getCustomerByUser(userId);
    if (!customer) throw createError(404, 'Không tìm thấy khách hàng của user');

    const account = await Account.findByPk(account_id);
    if (!account) throw createError(404, 'Không tìm thấy tài khoản');

    if (account.customer_id !== customer.id) {
        throw createError(403, 'Bạn không sở hữu tài khoản này');
    }

    if (account.status !== 'ACTIVE') {
        throw createError(400, 'Tài khoản phải ở trạng thái ACTIVE');
    }

    const amt = Number(amount);
    if (!amt || amt <= 0) {
        throw createError(400, 'Số tiền phải > 0');
    }

    // Với yêu cầu rút, check nhanh số dư hiện tại (chỉ để hạn chế request vô lý)
    if (type === 'WITHDRAW') {
        const bal = Number(account.balance || 0);
        if (bal < amt) {
            throw createError(
                400,
                'Số dư hiện tại không đủ để yêu cầu rút số tiền này',
            );
        }
    }

    const now = new Date();

    const txRow = await CashTransaction.create({
        customer_id: customer.id,
        account_id,
        type,
        amount: amt,
        currency: account.currency,
        status: 'PENDING',
        channel: 'WEB',
        requested_by_user_id: userId,
        requested_at: now,
        customer_note: description || null,
    });

    await writeAuditLog({
        user_id: userId,
        action: 'CREATE_CASH_TRANSACTION',
        ref_id: txRow.id,
        meta: {
            type,
            amount: amt,
            account_id,
        },
    });

    return txRow;
}

// ===================================
// 2) STAFF/ADMIN duyệt giao dịch
// ===================================

export async function approveCashTransaction(userId, payload) {
    const { transaction_id, approve, reason } = payload;

    const codes = await getUserRoleCodes(userId);
    const isStaff = codes.includes('STAFF') || codes.includes('ADMIN');
    if (!isStaff) {
        throw createError(403, 'Chỉ STAFF/ADMIN mới được duyệt giao dịch nạp/rút');
    }

    return sequelize.transaction(async (tx) => {
        const cashTx = await CashTransaction.findByPk(transaction_id, {
            transaction: tx,
            lock: tx.LOCK.UPDATE,
        });

        if (!cashTx) throw createError(404, 'Không tìm thấy yêu cầu nạp/rút');

        if (cashTx.status !== 'PENDING') {
            throw createError(
                400,
                'Chỉ có thể duyệt / từ chối giao dịch đang ở trạng thái PENDING',
            );
        }

        const account = await Account.findByPk(cashTx.account_id, {
            transaction: tx,
            lock: tx.LOCK.UPDATE,
        });
        if (!account) throw createError(404, 'Không tìm thấy tài khoản');

        if (account.status !== 'ACTIVE') {
            throw createError(400, 'Tài khoản phải ở trạng thái ACTIVE để thực hiện giao dịch');
        }

        const amt = Number(cashTx.amount || 0);
        const currentBal = Number(account.balance || 0);
        const now = new Date();

        // Nếu từ chối
        if (!approve) {
            cashTx.status = 'REJECTED';
            cashTx.approved_at = now;
            cashTx.approved_by_user_id = userId;
            cashTx.staff_note = reason || null;
            await cashTx.save({ transaction: tx });

            await writeAuditLog({
                user_id: userId,
                action: 'REJECT_CASH_TRANSACTION',
                ref_id: cashTx.id,
                meta: {
                    reason: reason || null,
                },
            });

            if (cashTx.requested_by_user_id) {
                await Notification.create(
                    {
                        user_id: cashTx.requested_by_user_id,
                        title: 'Yêu cầu nạp/rút bị từ chối',
                        body:
                            reason ||
                            `Yêu cầu ${cashTx.type === 'DEPOSIT' ? 'nạp' : 'rút'
                            } ${amt.toLocaleString('vi-VN')} ${account.currency} đã bị từ chối`,
                    },
                    { transaction: tx },
                );
            }

            return cashTx;
        }

        // APPROVE
        if (cashTx.type === 'WITHDRAW' && currentBal < amt) {
            throw createError(400, 'Số dư không đủ để thực hiện rút tiền');
        }

        const glCash = await getGlByCode('101001', tx); // Cash / Settlement
        const glCust = await getGlByCode('201001', tx); // Customer Deposits

        const ref = `CASH-${cashTx.id}`;

        const je = await JournalEntry.create(
            {
                ref,
                type: cashTx.type === 'DEPOSIT' ? 'CASH_DEPOSIT' : 'CASH_WITHDRAW',
                description:
                    cashTx.customer_note ||
                    (cashTx.type === 'DEPOSIT'
                        ? 'Nạp tiền mặt vào tài khoản'
                        : 'Rút tiền mặt từ tài khoản'),
                created_at: now,
            },
            { transaction: tx },
        );

        const lines = [];

        if (cashTx.type === 'DEPOSIT') {
            // NẠP: Dr 101001 (Cash), Cr 201001 (Customer Deposits)
            lines.push(
                {
                    entry_id: je.id,
                    gl_account_id: glCash.id,
                    customer_account_id: null,
                    dc: 'DEBIT',
                    amount: amt,
                },
                {
                    entry_id: je.id,
                    gl_account_id: glCust.id,
                    customer_account_id: account.id,
                    dc: 'CREDIT',
                    amount: amt,
                },
            );

            account.balance = currentBal + amt;
        } else {
            // RÚT: Dr 201001 (Customer Deposits), Cr 101001 (Cash)
            lines.push(
                {
                    entry_id: je.id,
                    gl_account_id: glCust.id,
                    customer_account_id: account.id,
                    dc: 'DEBIT',
                    amount: amt,
                },
                {
                    entry_id: je.id,
                    gl_account_id: glCash.id,
                    customer_account_id: null,
                    dc: 'CREDIT',
                    amount: amt,
                },
            );

            account.balance = currentBal - amt;
        }

        await JournalLine.bulkCreate(lines, { transaction: tx });
        await account.save({ transaction: tx });

        cashTx.status = 'APPROVED';
        cashTx.approved_at = now;
        cashTx.approved_by_user_id = userId;
        cashTx.staff_note = reason || null;
        cashTx.journal_entry_id = je.id;
        await cashTx.save({ transaction: tx });

        if (cashTx.requested_by_user_id) {
            await Notification.create(
                {
                    user_id: cashTx.requested_by_user_id,
                    title:
                        cashTx.type === 'DEPOSIT'
                            ? 'Nạp tiền thành công'
                            : 'Rút tiền thành công',
                    body:
                        `Bạn đã ${cashTx.type === 'DEPOSIT' ? 'nạp' : 'rút'} ` +
                        `${amt.toLocaleString('vi-VN')} ${account.currency} ` +
                        `từ tài khoản ${account.account_no}`,
                },
                { transaction: tx },
            );
        }

        await writeAuditLog({
            user_id: userId,
            action: 'APPROVE_CASH_TRANSACTION',
            ref_id: cashTx.id,
            meta: {
                type: cashTx.type,
                amount: amt,
                account_id: account.id,
                journal_entry_id: je.id,
            },
        });

        return cashTx;
    });
}

// ===================================
// 3) Danh sách yêu cầu nạp / rút
// ===================================

export async function listCashTransactions(userId, filters) {
    const { from, to, status, type, account_id } = filters;

    const codes = await getUserRoleCodes(userId);
    const isStaff = codes.includes('STAFF') || codes.includes('ADMIN');

    const where = {};

    if (status) where.status = status;
    if (type) where.type = type;

    if (from || to) {
        where.requested_at = {};
        if (from) where.requested_at[Op.gte] = new Date(from);
        if (to) where.requested_at[Op.lte] = new Date(to);
    }

    if (isStaff) {
        if (account_id) {
            where.account_id = account_id;
        }
    } else {
        const customer = await getCustomerByUser(userId);
        if (!customer) return [];
        where.customer_id = customer.id;
        if (account_id) {
            where.account_id = account_id;
        }
    }

    const rows = await CashTransaction.findAll({
        where,
        order: [['requested_at', 'DESC']],
        limit: 200,
    });

    return rows;
}

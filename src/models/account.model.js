import { DataTypes } from 'sequelize';

export default (sequelize) => {
    const Account = sequelize.define('account', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        customer_id: { type: DataTypes.UUID, allowNull: false },
        account_no: { type: DataTypes.STRING, allowNull: false, unique: true },
        type: { type: DataTypes.ENUM('CURRENT', 'SAVINGS', 'WALLET'), allowNull: false },
        currency: { type: DataTypes.ENUM('VND', 'USD'), defaultValue: 'VND' },
        balance: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        status: { type: DataTypes.ENUM('ACTIVE', 'FROZEN', 'CLOSED'), defaultValue: 'ACTIVE' },
        opened_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        closed_at: { type: DataTypes.DATE },
    }, { tableName: 'account', timestamps: false });

    const AccountLimit = sequelize.define('account_limit', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        account_id: { type: DataTypes.UUID, unique: true },
        daily_outward_limit: { type: DataTypes.DECIMAL(18, 2), defaultValue: 50000000 },
        per_txn_limit: { type: DataTypes.DECIMAL(18, 2), defaultValue: 20000000 },
    }, { tableName: 'account_limit', timestamps: false });

    const Beneficiary = sequelize.define('beneficiary', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        customer_id: { type: DataTypes.UUID, allowNull: false },
        alias: DataTypes.STRING,
        target_account_no: { type: DataTypes.STRING, allowNull: false },
        target_bank_code: { type: DataTypes.STRING, allowNull: false },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }, { tableName: 'beneficiary', timestamps: false });

    return { Account, AccountLimit, Beneficiary };
};
import { DataTypes } from 'sequelize';

export default (sequelize) => {
    const Transfer = sequelize.define('transfer', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        from_account_id: { type: DataTypes.UUID, allowNull: false },
        to_account_id: { type: DataTypes.UUID },
        to_external_account_no: DataTypes.STRING,
        to_external_bank_code: DataTypes.STRING,
        currency: { type: DataTypes.ENUM('VND', 'USD'), defaultValue: 'VND' },
        amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
        fee: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        idem_key: { type: DataTypes.STRING, unique: true },
        status: { type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED', 'CANCELED'), defaultValue: 'PENDING' },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        completed_at: { type: DataTypes.DATE },
    }, { tableName: 'transfer', timestamps: false });

    const IdempotencyKey = sequelize.define('idempotency_key', {
        key: { type: DataTypes.STRING, primaryKey: true },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        purpose: { type: DataTypes.STRING, allowNull: false },
    }, { tableName: 'idempotency_key', timestamps: false });

    return { Transfer, IdempotencyKey };
};
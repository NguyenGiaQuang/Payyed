// src/models/cash_transaction.js
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

class CashTransaction extends Model { }

CashTransaction.init(
    {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
        },

        customer_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },

        account_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },

        type: {
            type: DataTypes.ENUM('DEPOSIT', 'WITHDRAW'),
            allowNull: false,
        },

        status: {
            type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELED'),
            allowNull: false,
            defaultValue: 'PENDING',
        },

        amount: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
        },

        currency: {
            type: DataTypes.STRING(3), // map với TYPE currency_code trong DB
            allowNull: false,
        },

        channel: {
            type: DataTypes.TEXT,
            allowNull: true,
        },

        requested_by_user_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },

        approved_by_user_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },

        requested_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },

        approved_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },

        journal_entry_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },

        idem_key: {
            type: DataTypes.TEXT,
            allowNull: true,
            unique: true,
        },

        customer_note: {
            type: DataTypes.TEXT,
            allowNull: true,
        },

        staff_note: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        modelName: 'CashTransaction',
        tableName: 'cash_transaction',
        underscored: true,
        timestamps: false,
    },
);

export default CashTransaction;

// src/models/account.model.js
import { DataTypes } from 'sequelize';

export default (sequelize, { Customer }) => {
    const Account = sequelize.define(
        'account',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            customer_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            account_no: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            type: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            currency: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            balance: {
                type: DataTypes.DECIMAL(18, 2),
                allowNull: false,
                defaultValue: 0,
            },
            status: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: 'ACTIVE',
            },
            opened_at: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            closed_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            is_default: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        },
        {
            tableName: 'account',
            timestamps: false, // bảng không có created_at / updated_at
        }
    );

    Account.belongsTo(Customer, { foreignKey: 'customer_id' });

    // 🔽 Sửa AccountLimit: KHÔNG còn daily_limit / monthly_limit
    const AccountLimit = sequelize.define(
        'account_limit',
        {
            // tuỳ schema thật, nhưng tối thiểu có account_id
            account_id: {
                type: DataTypes.UUID,
                allowNull: false,
                primaryKey: true,
            },
        },
        {
            tableName: 'account_limit',
            timestamps: false,
        }
    );

    // Nếu có quan hệ, có thể thêm:
    // Account.hasOne(AccountLimit, { foreignKey: 'account_id' });
    // AccountLimit.belongsTo(Account, { foreignKey: 'account_id' });

    return { Account, AccountLimit };
};

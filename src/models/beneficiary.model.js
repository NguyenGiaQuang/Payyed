import { DataTypes } from 'sequelize';

export default (sequelize) => {
    const Beneficiary = sequelize.define('beneficiary', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },

        customer_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },

        alias: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'alias',
        },

        target_account_no: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'target_account_no',
        },

        target_bank_code: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'target_bank_code',
        },

        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        }
    }, {
        tableName: 'beneficiary',
        timestamps: false,
    });

    return Beneficiary;
};

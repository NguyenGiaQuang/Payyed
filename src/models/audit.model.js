import { DataTypes } from 'sequelize';

export default (sequelize) => {
    const AppAudit = sequelize.define('app_audit', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
        },

        user_id: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'user_id',
        },

        action: {
            type: DataTypes.TEXT,
            allowNull: false,
        },

        ref_id: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'ref_id',
        },

        meta: {
            type: DataTypes.JSONB,
            allowNull: true,
        },

        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        }
    }, {
        tableName: 'app_audit',
        timestamps: false,
    });

    return AppAudit;
};

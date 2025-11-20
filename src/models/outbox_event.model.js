import { DataTypes } from 'sequelize';

export default (sequelize) => {
    const OutboxEvent = sequelize.define(
        'outbox_event',
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4,
            },

            type: {
                type: DataTypes.TEXT,
                allowNull: false,
            },

            payload: {
                type: DataTypes.JSONB,
                allowNull: false,
            },

            occurred_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },

            published: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            }
        },
        {
            tableName: 'outbox_event',
            timestamps: false,
        }
    );

    return OutboxEvent;
};

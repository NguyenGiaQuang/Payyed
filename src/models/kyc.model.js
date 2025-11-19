import { DataTypes } from 'sequelize';

export default (sequelize) => {
    const KycDocument = sequelize.define('kyc_document', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        customer_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        doc_type: {
            type: DataTypes.STRING,
            allowNull: false, // ví dụ: 'CCCD_FRONT', 'CCCD_BACK', 'SELFIE'
        },
        url: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        uploaded_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    }, {
        tableName: 'kyc_document',
        timestamps: false,
    });

    return KycDocument;
};

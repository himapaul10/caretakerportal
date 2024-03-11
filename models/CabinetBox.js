const {DataTypes} = require("sequelize");

module.exports = (sequelize) => {
    return sequelize.define('CabinetBox', {
        cabinet_id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false,
            references: {
                model: 'cabinets',
                key: 'id'
            }
        },
        box: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
            validate: {
                min: 0, // Assuming 0 is Monday
                max: 7  // Assuming 6 is Sunday
            }
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
    }, {
        tableName: "cabinet_boxes",
        createdAt: "created_at",
        updatedAt: "updated_at"
    });
}
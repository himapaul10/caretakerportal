const { DataTypes} = require("sequelize");

module.exports = (sequelize) => {
    return sequelize.define('Medication', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false
        },
        brand_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        generic_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        manufacturer_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        route: {
            type: DataTypes.STRING,
        },
    }, {
        tableName: "medication",
        createdAt: "created_at",
        updatedAt: "updated_at"
    });
}
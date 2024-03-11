const {DataTypes} = require("sequelize");

module.exports = (sequelize) => {
    return sequelize.define('Cabinet', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        location: {
            type: DataTypes.STRING,
        },
        key: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    }, {
        tableName: "cabinets",
        createdAt: "created_at",
        updatedAt: "updated_at"
    });
}
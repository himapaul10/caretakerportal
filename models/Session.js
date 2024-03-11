const {DataTypes} = require("sequelize");

module.exports = (sequelize) => {
    return sequelize.define('Session', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        alarm_time: {
            type: DataTypes.DATE,
            allowNull: false
        },
        start_time: {
            type: DataTypes.DATE,
            allowNull: false
        },
        end_time: {
            type: DataTypes.DATE,
            allowNull: false
        },
    }, {
        tableName: "sessions",
        createdAt: "created_at",
        updatedAt: false
    });
}
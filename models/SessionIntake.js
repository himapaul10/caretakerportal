const {DataTypes} = require("sequelize");

module.exports = (sequelize) => {
    return sequelize.define('SessionIntake', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
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
        ingested: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        }
    }, {
        tableName: "session_intakes",
        createdAt: false,
        updatedAt: false
    });
}
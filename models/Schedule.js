const {DataTypes} = require("sequelize");

module.exports = (sequelize) => {
    return sequelize.define('Schedule', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        day: {
            type: DataTypes.TINYINT,
            allowNull: false,
            validate: {
                min: 0, // Assuming 0 is Monday
                max: 6  // Assuming 6 is Sunday
            }
        },
        time: {
            type: DataTypes.TIME,
            allowNull: false,
            validate: {
                is: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, // Regex to validate HH:MM format
            }
        },
    }, {
        tableName: "schedules",
        createdAt: "created_at",
        updatedAt: "updated_at"
    });
}
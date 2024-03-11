const { DataTypes} = require("sequelize");

module.exports = (sequelize) => {
    return sequelize.define('Patient', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        first_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        last_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        phone: {
            type: DataTypes.STRING,
        },
        gender: {
            type: DataTypes.STRING,
        },
        dob: {
            type: DataTypes.DATE,
            allowNull: false
        },
        height: {
            type: DataTypes.STRING,
        },
        weight: {
            type: DataTypes.SMALLINT,
        },
        bloodgroup: {
            type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
        },
    }, {
        tableName: "patients",
        createdAt: "created_at",
        updatedAt: "updated_at"
    });
}
const { DataTypes} = require("sequelize");

module.exports = (sequelize) => {
    return sequelize.define('NDC', {
        code: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false
        },
    }, {
        tableName: "ndc",
        createdAt: false,
        updatedAt: false
    });
}
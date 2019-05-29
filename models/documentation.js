'use strict';
module.exports = (sequelize, DataTypes) => {
    var Documentation = sequelize.define('Documentation', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        text: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        createdAt: {
            field: 'createdat',
            type: DataTypes.DATE,
        },
        updatedAt: {
            field: 'updatedat',
            type: DataTypes.DATE,
        },
    });

    Documentation.associate = function (models) {
        models.Documentation.belongsTo(models.Project, {
            onDelete: "CASCADE",
            foreignKey: 'project_id',
            as: 'Project'
        });
    };

    return Documentation;
};
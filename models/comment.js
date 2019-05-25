'use strict';
module.exports = (sequelize, DataTypes) => {
    var Comment = sequelize.define('Comment', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
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


    Comment.associate = function (models) {
        models.Comment.belongsTo(models.Project, {
            onDelete: "CASCADE",
            foreignKey: 'project_id',
            as: 'Project'
        });
        models.Comment.belongsTo(models.User, {
            onDelete: "CASCADE",
            foreignKey: 'created_by',
            as: 'Owner'
        });
    };

    return Comment;
};
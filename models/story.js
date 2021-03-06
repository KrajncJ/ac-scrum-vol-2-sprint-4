'use strict';
module.exports = (sequelize, DataTypes) => {
    var Stories = sequelize.define('Stories', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: {
                args: true,
                msg: 'Story name already exists!'
            }
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        acceptanceCriteria: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        importance: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isIn: [['must have', 'could have', 'should have', 'won\'t have this time']],
            }
        },
        businessValue: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: {
                min: {
                    args: [0],
                    msg: 'Cant be a negative value.'
                }
            }
        },
        is_done: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        in_progress: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        },
        estimatedTime:{
            type: DataTypes.INTEGER,
            allowNull:  true,
        },
        createdAt: {
            field: 'createdat',
            type: DataTypes.DATE,
        },
        updatedAt: {
            field: 'updatedat',
            type: DataTypes.DATE,
        },
        deletedAt: {
            type: DataTypes.DATE
        },
        denied: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        userstorycomment: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    });

    Stories.associate = function (models) {
        models.Stories.belongsTo(models.Project, {
            onDelete: "CASCADE",
            foreignKey: 'project_id',
            as: 'Project'
        });
        models.Stories.belongsTo(models.Sprint, {
            onDelete: "CASCADE",
            foreignKey: 'sprint_id',
            as: 'Sprint'
        });
    };

    return Stories;
};
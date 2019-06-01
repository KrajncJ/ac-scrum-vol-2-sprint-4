'use strict';
module.exports = (sequelize, DataTypes) => {
    var Tasks = sequelize.define('Tasks', {
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
                msg: 'Task name already exists!'
            }
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        time: {
            type: DataTypes.FLOAT,
            allowNull: false,
            validate: {
                min: {
                    args: [0.0],
                    msg: 'Cant be a negative value.'
                }
            }
        },
        loggedTime: {
            type: DataTypes.FLOAT,
            allowNull: false,
            validate: {
                min: {
                    args: [0.0],
                    msg: 'Cant be a negative value.'
                }
            },
            defaultValue: 0
        },
        remainingTime: {
            type: DataTypes.FLOAT,
            allowNull: false,
            validate: {
                min: {
                    args: [0.0],
                    msg: 'Cant be a negative value.'
                }
            }
        },
        workStart: {
            type: DataTypes.DATE,
            allowNull: true
        },
        assignee: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        status: {						//Status:
        	type: DataTypes.INTEGER,	// 0 - unassigned
        	allowNull: false,			// 1 - assigned, unaccepted
        	defaultValue: 0				// 2 - accepted, not in progress
        },								// 3 - in progress
                                        // 4 - finished (can be returned to in progress)
        createdAt: {
            field: 'createdat',
            type: DataTypes.DATE,
        },
        updatedAt: {
            field: 'updatedat',
            type: DataTypes.DATE,
        },
    });

    Tasks.associate = function (models) {
        models.Tasks.belongsTo(models.User, {
            onDelete: "CASCADE",
            foreignKey: 'assignee',
            as: 'Assignee'
        });
        models.Tasks.belongsTo(models.Project, {
            onDelete: "CASCADE",
            foreignKey: 'project_id',
            as: 'Project'
        });
        models.Tasks.belongsTo(models.Stories, {
            onDelete: "CASCADE",
            foreignKey: 'story_id',
            as: 'Story'
        });
    };

    return Tasks;
};
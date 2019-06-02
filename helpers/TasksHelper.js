const models = require('../models');

const Stories = models.Stories;
const Tasks = models.Tasks;
const User = models.User;
const Timetable = models.Timetable;

var sequelize = require('sequelize');
const ProjectHelper = require('../helpers/ProjectHelper');
const StoriesHelper = require('../helpers/StoriesHelper');
const SprintsHelper = require('../helpers/SprintsHelper');

var moment = require('moment');

async function listTasks(storyId) {
    return await Tasks.findAll( {
        where: {
            story_id: storyId,
        }
    });
}

async function listProjectTasks(projectId) {
    return await Tasks.findAll( {
        where: {
            project_id: projectId,
        }
    });
}

async function listUserTasks(userId) {
    return await Tasks.findAll({
        include: [
            {
                model: models.Stories,
                as: 'Story',
                attributes: ['id', 'sprint_id'],
            }
        ],
        where: {
            assignee: userId
        }
    });
}

async function getTask(taskId) {
    return await Tasks.findOne( {
        where: {
            id: taskId,
        }
    });
}

async function deleteTaskById(taskId) {
    if (!taskId) {
        return {msg: 'No Id specified..', payload: 1};
    }
    try {
        // !! - return true if successful, else false
        return !!await Tasks.destroy({
            where: {
                id: taskId
            },
            force:true,
        });
    } catch (e) {
        console.log("Can't delete " + e);
        return false;
    }
}

async function deleteTasksByStoryId(storyId) {
    if (!storyId) {
        return {msg: 'No Id specified..', payload: 1};
    }
    try {
        // !! - return true if successful, else false
        return !!await Tasks.destroy({
            where: {
                story_id: storyId
            }
        });
    } catch (e) {
        console.log("Can't delete " + e);
        return false;
    }
}

async function isValidTaskChange(task) {
    // Check if there is another task in the story with same name, case insensitive
    let existing = await Tasks.findAll({
        where: {
            story_id: task.story_id,
            name: sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), task.name.toLowerCase())
        }
    });

    //Name
    if (existing.length !== 0 && existing[0].id !== task.id) {
        return false;
    }
    //Story unrealised
    let story = await StoriesHelper.getStory(task.story_id);
    if (story.is_done || !story.sprint_id) {
        return false;
    }
    //In active sprint
    let sprint =  SprintsHelper.getSprint(story.sprint_id);
    if (!moment().isBetween(moment(sprint.startDate), moment(sprint.endDate), 'days', '[]')) {
        return false;
    }

    return true;
}

async function isPO(project_id, user_id) {
    let project = await ProjectHelper.getProjectToEdit(project_id);
    return user_id === project.product_owner;
}

async function checkIfSMorMember(req, res, next) {
    // check if user story is editable by SM or member

    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }

    let user = await User.findById(req.user.id);
    if (!user) {
        return res.redirect('/');
    }

    let projId = null;
    if (req.params.taskId) {
        let task = await getTask(req.params.taskId);
        projId = task.project_id;
    } else {
        projId = req.params.projectId;
    }

    if (!projId) {
        return res.redirect('/');
    }

    let project = await ProjectHelper.getProject(projId);
    let inProject = req.user.id === project.scrum_master;
    project.ProjectMembers.forEach(function (member) {
        if (req.user.id === member.id) {
            inProject = true;
        }
    });

    if (inProject) {
        return next();
    } else {
        return res.redirect('/');
    }
}

async function createTimeLogs(task, user) {
    let story = await StoriesHelper.getStory(task.story_id);
    let sprint = await SprintsHelper.getSprint(story.sprint_id);
    let startDate = new Date(sprint.startDate);
    let endDate = new Date(sprint.endDate);
    endDate.setDate(endDate.getDate() + 1);

    while (startDate < endDate) {
        let dateIn = moment(startDate,'DD.MM.YYYY').format("YYYY-MM-DD");
        const createdTimeLog = Timetable.build({
            logDate: dateIn,
            loggedTime: 0.0,
            remainingTime: task.remainingTime,
            task_id: task.id,
            loggedUser: user
        });

        await createdTimeLog.save();

        startDate.setDate(startDate.getDate() + 1);
    }
}

async function getTaskLogs(task) {
    return await Timetable.findAll({
        where: {
            task_id: task.id
        },
        order: [
            ['id', 'ASC']
        ]
    });
}

async function getTaskDayLog(task, date) {
    let timeLogArray = await Timetable.findAll({
        where: {
            task_id: task.id,
            logDate: date
        }
    });
    if (timeLogArray.length < 1) {
        return false;
    }
    return timeLogArray[timeLogArray.length - 1];
}

async function getTaskLoggedTime(task) {

    let timetableArray = await Timetable.findAll({
        where: {
            task_id: task.id
        }
    });

    let tmpTime = 0;
    timetableArray.forEach(function (loggedTask) {
        tmpTime = tmpTime + loggedTask.dataValues.loggedTime;
    });

    return tmpTime;
}

async function setSprintStoriesTasksLogs(sprint, userId) {
    let sprintStories = await Stories.findAll( {
        where: {
            sprint_id: sprint.id
        }}
    );

    for (let i = 0; i < sprintStories.length; i++) {
        await setStoryTasksLogs(sprintStories[i].id, sprint.startDate, sprint.endDate, userId);
    }
}

async function setStoryTasksLogs(storyId, startDateIn, endDateIn, userId) {
    let storyTasks = await Tasks.findAll({
        where: {
            story_id: storyId
        }
    });

    for (let i = 0; i < storyTasks.length; i++) {
        let startDate = new Date(startDateIn);
        let endDate = new Date(endDateIn);
        endDate.setDate(endDate.getDate() + 1);

        while (startDate < endDate) {
            let dateIn = moment(startDate,'DD.MM.YYYY').format("YYYY-MM-DD");
            let existingLog = await getTaskDayLog(storyTasks[i].dataValues, dateIn);
            if (existingLog === false) {
                const createdTimeLog = Timetable.build({
                    logDate: dateIn,
                    loggedTime: 0.0,
                    remainingTime: storyTasks[i].dataValues.remainingTime,
                    task_id: storyTasks[i].dataValues.id,
                    loggedUser: userId
                });
                await createdTimeLog.save();
            }

            startDate.setDate(startDate.getDate() + 1);
        }
    }
}

async function deleteLogs(taskId) {
    // !! - return true if successful, else false
    try {
        return !!await Timetable.destroy({
            where: {
                task_id: taskId
            },
            force:true
        });
    } catch (e) {
        console.log("Can't delete " + e);
        return false;
    }
}

module.exports = {
    listTasks,
    listProjectTasks,
    listUserTasks,
    getTask,
    deleteTaskById,
    deleteTasksByStoryId,
    isValidTaskChange,
    checkIfSMorMember,
    createTimeLogs,
    getTaskLogs,
    getTaskDayLog,
    getTaskLoggedTime,
    setStoryTasksLogs,
    setSprintStoriesTasksLogs,
    deleteLogs
};
var express = require('express');
var router = express.Router();
var models = require('../models/');

const User = models.User;
const Story = models.Story;
const Tasks = models.Tasks;
const Timetable = models.Timetable;

var middleware = require('./middleware.js');

var ProjectHelper = require('../helpers/ProjectHelper');
var TasksHelper = require('../helpers/TasksHelper');
var StoriesHelper = require('../helpers/StoriesHelper');


//  ------------- create a task ----------------
router.get('/create/:projectId/:storyId', TasksHelper.checkIfSMorMember, async function(req, res, next) {
    let projectUsers = await ProjectHelper.getProjectMembers(req.params.projectId);

    let taskStory    = await StoriesHelper.getStory(req.params.storyId);
    let storyTasksTimeSum = 0;
    let storyTasks   = await TasksHelper.listTasks(req.params.storyId);
    for(var i = 0; i < storyTasks.length; i++){
        storyTasksTimeSum += storyTasks[i].time;
    }
    let available_time_for_new_task = (taskStory.estimatedTime - storyTasksTimeSum) > 0 ? taskStory.estimatedTime - storyTasksTimeSum : 0 ;
    let project = await ProjectHelper.getProject(req.params.projectId);

    res.render('add_edit_task', {
        errorMessages: 0,
        success: 0,
        pageName: 'tasks',
        uid: req.user.id,
        username: req.user.username,
        isUser: req.user.is_user,
        projectId: req.params.projectId,
        storyId: req.params.storyId,
        projectUsers: projectUsers,
        toEditTask: false,
        timeForNewTask:available_time_for_new_task,
        project:project,
    });
});

router.post('/create/:projectId/:storyId', TasksHelper.checkIfSMorMember, async function(req, res, next) {
    let data = req.body;
    let projectId = req.params.projectId;
    let projectUsers = await ProjectHelper.getProjectMembers(req.params.projectId);
    let taskStory    = await StoriesHelper.getStory(req.params.storyId);
    let storyTasksTimeSum = 0;
    let storyTasks   = await TasksHelper.listTasks(req.params.storyId);
    let project      = await ProjectHelper.getProject(req.params.projectId);

    for(var i = 0; i < storyTasks.length; i++){
        storyTasksTimeSum += storyTasks[i].time;
    }
    let available_time_for_new_task = (taskStory.estimatedTime - storyTasksTimeSum) > 0 ? taskStory.estimatedTime - storyTasksTimeSum : 0 ;

    let assignee = null;
    let status = 0;
    if (data.assignee) {
        assignee = data.assignee;
        status = 1;
    }

    try {
        // Create new task
        const createdTask = Tasks.build({
            name: data.name,
            description: data.description,
            time: data.time/6,
            remainingTime: data.time/6,
            assignee: assignee,
            status: status,
            story_id: req.params.storyId,
            project_id: projectId
        });

        // validate task
        if (!await TasksHelper.isValidTaskChange(createdTask)){
            req.flash('error', `Task name: ${createdTask.name} already in use`);
            res.render('add_edit_task', {
                errorMessages: req.flash('error'),
                success: 0,
                pageName: 'tasks',
                uid: req.user.id,
                username: req.user.username,
                isUser: req.user.is_user,
                projectId: req.params.projectId,
                storyId: req.params.storyId,
                projectUsers: projectUsers,
                toEditTask: false,
                timeForNewTask:available_time_for_new_task,
                project:project,
            });
            return;
        }

        await createdTask.save();

        await TasksHelper.createTimeLogs(createdTask, req.user.id);

        req.flash('success', 'Task - ' + createdTask.name + ' has been successfully created');
        res.render('add_edit_task', {
            errorMessages: 0,
            success: req.flash('success'),
            pageName: 'tasks',
            uid: req.user.id,
            username: req.user.username,
            isUser: req.user.is_user,
            projectId: req.params.projectId,
            storyId: req.params.storyId,
            projectUsers: projectUsers,
            toEditTask: createdTask,
            timeForNewTask:available_time_for_new_task,
            project:project,
        });

    } catch (e) {
        console.log(e);
        req.flash('error', 'Error!');
        res.render('add_edit_task', {
            errorMessages: req.flash('error'),
            success: 0,
            pageName: 'tasks',
            uid: req.user.id,
            username: req.user.username,
            isUser: req.user.is_user,
            projectId: req.params.projectId,
            storyId: req.params.storyId,
            projectUsers: projectUsers,
            toEditTask: false,
            timeForNewTask:available_time_for_new_task,
            project:project,

        });

    }

});

//  ------------- edit a task ----------------
router.get('/:taskId/edit', TasksHelper.checkIfSMorMember, async function(req, res, next) {
    let currentTask  = await TasksHelper.getTask(req.params.taskId);
    let projectUsers = await ProjectHelper.getProjectMembers(currentTask.project_id);
    let project = await ProjectHelper.getProject(currentTask.project_id);
    let taskStory    = await StoriesHelper.getStory(currentTask.story_id);
    let storyTasksTimeSum = 0;
    let storyTasks   = await TasksHelper.listTasks(taskStory.id);
    for(var i = 0; i < storyTasks.length; i++){
        storyTasksTimeSum += storyTasks[i].time;
    }
    let available_time_for_new_task = (taskStory.estimatedTime - storyTasksTimeSum) > 0 ? (taskStory.estimatedTime - storyTasksTimeSum) : 0 ;

    res.render('add_edit_task', {
        errorMessages: 0,
        success: 0,
        pageName: 'tasks',
        uid: req.user.id,
        username: req.user.username,
        isUser: req.user.is_user,
        projectId: currentTask.project_id,
        storyId: currentTask.story_id,
        projectUsers: projectUsers,
        toEditTask: currentTask,
        timeForNewTask:available_time_for_new_task,
        project:project,


    });
});

router.post('/:taskId/edit/', TasksHelper.checkIfSMorMember, async function(req, res, next) {
    let data = req.body;
    let task_id = req.params.taskId;
    let task = await TasksHelper.getTask(req.params.taskId);
    let taskStory    = await StoriesHelper.getStory(task.story_id);
    let storyTasksTimeSum = 0;
    let storyTasks   = await TasksHelper.listTasks(taskStory.id);
    let project = await ProjectHelper.getProject(task.project_id);

    for(var i = 0; i < storyTasks.length; i++){
        storyTasksTimeSum += storyTasks[i].time;
    }
    let available_time_for_new_task = (taskStory.estimatedTime - storyTasksTimeSum) > 0 ? taskStory.estimatedTime - storyTasksTimeSum : 0 ;


    let projectUsers = await ProjectHelper.getProjectMembers(task.project_id);

    let assignee = task.assignee;
    let status = task.status;
    let newRemainingTime = task.remainingTime;
    let newLoggedTime = task.loggedTime;
    if (data.assignee === "") {
        assignee = null;
        status = 0;
    }
    else if (data.assignee !== task.assignee) {
        assignee = data.assignee;
        status = 1;
        if (task.workStart !== null) {
            newRemainingTime = await stopAutoTracking(task);
            newLoggedTime = await TasksHelper.getTaskLoggedTime(task);
        }
    }

    // Set new attributes
    task.setAttributes({
        name: data.name,
        description: data.description,
        time: data.time/6,
        loggedTime: newLoggedTime,
        remainingTime: newRemainingTime,
        workStart: null,
        assignee: assignee,
        status: status
    });

    // validate task
    if (!await TasksHelper.isValidTaskChange(task)){
        req.flash('error', `Task name: ${task.name} already in use`);
        res.render('add_edit_task', {
            errorMessages: req.flash('error'), success: 0, pageName: 'tasks', uid: req.user.id, username: req.user.username,
            isUser: req.user.is_user, projectId: task.project_id, storyId: task.story_id, projectUsers: projectUsers, toEditTask: false,
            timeForNewTask:available_time_for_new_task,project:project,
        });
    }

    await task.save();

    let task_updated = await TasksHelper.getTask(task_id);

    req.flash('success', 'Task - ' + task_updated.name + ' has been successfully updated');
    res.render('add_edit_task', {
        errorMessages: 0,
        success: req.flash('success'),
        pageName: 'tasks',
        uid: req.user.id,
        username: req.user.username,
        isUser: req.user.is_user,
        projectId: task.project_id,
        storyId: task.story_id,
        projectUsers: projectUsers,
        toEditTask: task_updated,
        timeForNewTask:available_time_for_new_task,
        project:project,
    });

});

//  ------------- delete a task ----------------
router.get('/:taskId/delete', TasksHelper.checkIfSMorMember, async function(req, res, next) {
    let task_id = req.params.taskId;


    // we need this (so we can get project_id) to navigate back to project backlog
    let task = await Tasks.findOne({
        where: {
            id: task_id,
        }
    });

    let is_deleted = await TasksHelper.deleteTaskById(task_id);
    let is_deleted_timeLogs = await TasksHelper.deleteLogs(task_id);
    if (is_deleted && is_deleted_timeLogs) {
        return res.redirect('/projects/'+ task.project_id +'/view');
    }else{
        return res.status(500).send('Delete failed')
    }
});

//  ------------- accept a task ----------------
router.get('/:taskId/accept', middleware.ensureAuthenticated, async function(req, res, next) {
    let task_id = req.params.taskId;

    let task = await Tasks.findOne({
        where: {
            id: task_id
        }
    });

    if (task.status === 2 || task.assignee !== req.user.id) {
        req.flash('error', `Task ${task.name} has not been assigned to you.`);
        return;
    }

    task.setAttributes({
        status: 2
    });

    // validate task
    if (!await TasksHelper.isValidTaskChange(task)){
        req.flash('error', `Task ${task.name} can not be accepted right now.`);
    }

    await task.save();

    //req.flash('success', 'Task - ' + task.name + ' has been accepted!');
    res.redirect('/');
});

//  ------------- reject a task ----------------
router.get('/:taskId/reject', middleware.ensureAuthenticated, async function(req, res, next) {
    let task_id = req.params.taskId;

    let task = await Tasks.findOne({
        where: {
            id: task_id
        }
    });


    if (task.assignee !== req.user.id) {
        req.flash('error', `Task ${task.name} has not been assigned to you.`);
        return;
    }

    task.setAttributes({
        status: 0,
        assignee: null
    });

    // validate task
    if (!await TasksHelper.isValidTaskChange(task)){
        req.flash('error', `Task ${task.name} can not be rejected right now.`);
    }

    await task.save();

    //req.flash('success', 'Task - ' + task.name + ' has been rejected.');
    res.redirect('/');
});

//  ------------- start a task ----------------
router.get('/:taskId/start', middleware.ensureAuthenticated, async function(req, res, next) {
    let task_id = req.params.taskId;

    let task = await Tasks.findOne({
        where: {
            id: task_id
        }
    });

    if (task.assignee !== req.user.id) {
        req.flash('error', `Task ${task.name} has not been assigned to you.`);
        return;
    } else if (task.status === 3) {
        req.flash('error', `Task ${task.name} has already been started.`);
        return;
    }

    task.setAttributes({
        status: 3,
        workStart: new Date()
    });

    // validate task
    if (!await TasksHelper.isValidTaskChange(task)){
        req.flash('error', `Task ${task.name} can not be started right now.`);
    }

    await task.save();

    //req.flash('success', 'Task - ' + task.name + ' has been finished.');
    res.redirect('/');
});

//  ------------- pause a task ----------------
router.get('/:taskId/pause', middleware.ensureAuthenticated, async function(req, res, next) {
    let task_id = req.params.taskId;

    let task = await Tasks.findOne({
        where: {
            id: task_id
        }
    });


    if (task.assignee !== req.user.id) {
        req.flash('error', `Task ${task.name} has not been assigned to you.`);
        return;
    } else if (task.status === 2) {
        req.flash('error', `Task ${task.name} has already been paused.`);
        return;
    }

    let newRemainingTime = await stopAutoTracking(task);
    let newLoggedTime = await TasksHelper.getTaskLoggedTime(task);

    task.setAttributes({
        status: 2,
        workStart: null,
        loggedTime: newLoggedTime,
        remainingTime: newRemainingTime
    });

    // validate task
    if (!await TasksHelper.isValidTaskChange(task)){
        req.flash('error', `Task ${task.name} can not be paused right now.`);
    }

    await task.save();

    //req.flash('success', 'Task - ' + task.name + ' has been finished.');
    res.redirect('/');
});

//  ------------- finish a task ----------------
router.get('/:taskId/finish', middleware.ensureAuthenticated, async function(req, res, next) {
    let task_id = req.params.taskId;

    let task = await Tasks.findOne({
        where: {
            id: task_id
        }
    });


    if (task.assignee !== req.user.id) {
        req.flash('error', `Task ${task.name} has not been assigned to you.`);
        return;
    } else if (task.status === 4) {
        req.flash('error', `Task ${task.name} has already been finished.`);
        return;
    }

    task.setAttributes({
        status: 4
    });

    // validate task
    if (!await TasksHelper.isValidTaskChange(task)){
        req.flash('error', `Task ${task.name} can not be finished right now.`);
    }

    await task.save();

    //req.flash('success', 'Task - ' + task.name + ' has been finished.');
    res.redirect('/');
});

//  ------------- restart a task ----------------
router.get('/:taskId/restart', middleware.ensureAuthenticated, async function(req, res, next) {
    let task_id = req.params.taskId;

    let task = await Tasks.findOne({
        where: {
            id: task_id
        }
    });

    if (task.assignee !== req.user.id) {
        req.flash('error', `Task ${task.name} has not been assigned to you.`);
        return;
    } else if (task.status !== 4) {
        req.flash('error', `Task ${task.name} has not been finished yet.`);
        return;
    }

    task.setAttributes({
        status: 2
    });

    // validate task
    if (!await TasksHelper.isValidTaskChange(task)){
        req.flash('error', `Task ${task.name} can not be restarted right now.`);
    }

    await task.save();

    //req.flash('success', 'Task - ' + task.name + ' has been finished.');
    res.redirect('/');
});

//  ------------- set task timeLog ----------------
router.post('/:timeLogId/logTime', middleware.ensureAuthenticated, async function(req, res, next) {
    let timeLogId = req.params.timeLogId;
    let data = req.body;

    let timeLog = await Timetable.findOne({
        where: {
            id: timeLogId
        }
    });
    let task = await TasksHelper.getTask(timeLog.task_id);

    if (task.assignee !== req.user.id) {
        req.flash('error', `Task ${task.name} has not been assigned to you.`);
        return;
    }

    timeLog.setAttributes({
        remainingTime: data.remainingTime / 6,
        loggedTime: data.loggedTime / 6,
    });
    await timeLog.save();

    let taskLogs = await TasksHelper.getTaskLogs(task);
    let currentLogDate = new Date(timeLog.logDate);
    for (let i = 0; i < taskLogs.length; i++) {
        let newLogDate = new Date(taskLogs[i].logDate);
        if (newLogDate > currentLogDate) {
            taskLogs[i].setAttributes({
                remainingTime: data.remainingTime / 6
            });
            await taskLogs[i].save();
        }
    }

    let newLoggedTime = await TasksHelper.getTaskLoggedTime(task);

    task.setAttributes({
        status: 2,
        workStart: null,
        loggedTime: newLoggedTime,
        remainingTime: data.remainingTime
    });

    // validate task
    if (!await TasksHelper.isValidTaskChange(task)){
        req.flash('error', `Task ${task.name} can not be paused right now.`);
    }

    await task.save();

    //req.flash('success', 'Task - ' + task.name + ' has been finished.');
    res.redirect('/');
});

let stopAutoTracking = async function(task){

    let startDate = task.workStart;
    let nowDate = new Date();
    let todayDate = new Date();
    todayDate.setHours(0,0,0,0);

    let timeDifference = (nowDate.getTime() - startDate.getTime()) / 3600000;
    if (timeDifference < 0.016) {
        // manj kot minuta, damo na 0 (error)
        timeDifference = 0.0;
    }
    timeDifference = timeDifference / 6; // shranimo v točkah

    let timeLog = await TasksHelper.getTaskDayLog(task, todayDate);

    if (!timeLog) {
        return 0;
    }

    timeLog.setAttributes({
        remainingTime: Math.max(0.0, timeLog.remainingTime - timeDifference),
        loggedTime: timeLog.loggedTime + timeDifference
    });

    await timeLog.save();

    return Math.max(0.0, timeLog.remainingTime);
};

module.exports = router;

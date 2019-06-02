var express = require('express');
var router = express.Router();
var models = require('../models/');

const User = models.User;
const Sprint = models.Sprint;

var middleware = require('./middleware.js');

var ProjectHelper = require('../helpers/ProjectHelper');
var SprintsHelper = require('../helpers/SprintsHelper');
var StoriesHelper = require('../helpers/StoriesHelper');
var TasksHelper = require('../helpers/TasksHelper');
var moment = require('moment');

var myProjects;
var ad_sm_projects;
var is_sm;

async function check_sm_projects(user){
    myProjects = await ProjectHelper.getAllowedProjects(user.id);
    is_sm = false;
    for(let project of myProjects){
        if(project.scrum_master === user.id ){
            is_sm = true;
            ad_sm_projects = await ProjectHelper.getSMProjects(user.id);
            break
        }
    }
}


//  ------------- list sprints ----------------
router.get('/', middleware.ensureAuthenticated, async function(req, res, next) {
    let user = req.user;
    await check_sm_projects(user);
    let assignedProjectsIds = myProjects.map( (row) => {return row.id});
    let sprints             = await SprintsHelper.sprintsInProjects(assignedProjectsIds);

    res.render('sprints',{
        projects:myProjects,
        sprints: sprints,
        errorMessages: 0,
        title: 'AC scrum vol2',
        pageName: 'sprints',
        username: req.user.username,
        isUser: req.user.is_user,
        is_sm:is_sm,
        success: 0
    });
});


//  ------------- create a sprint ----------------
router.get('/create/', SprintsHelper.isSM, async function(req, res, next) {
    let users = await User.findAllUsers();
    res.render('add_edit_sprint', {
        errorMessages: 0,
        title: 'AC scrum vol2',
        users: users,
        projects: ad_sm_projects,
        pageName: 'sprints',
        username: req.user.username,
        isUser: req.user.is_user,
        success: 0,
        successUpdate: 0,
        toEditSprint: false,
    });
});

router.post('/create', SprintsHelper.isSM, async function(req, res, next) {
    let data = req.body;

    try {
        var selected_date_array = data.selected_date.split(" to ");
        var s_date = selected_date_array[0];
        var e_date = selected_date_array[1];

        var s_formated = moment(s_date,'DD.MM.YYYY').format("YYYY-MM-DD");
        var e_formatted = moment(e_date, 'DD.MM.YYYY').format("YYYY-MM-DD");

        var Date_s_date = new Date(s_formated);
        var Date_e_date = new Date(e_formatted);

        var existing_sprints = await models.Sprint.findAll({
            where: {
                project_id: data.sprint_project
            }
        });

        for(let s of existing_sprints){
            var Date_es_start = new Date(s.startDate);
            var Date_es_end   = new Date(s.endDate);
            if((Date_s_date >= Date_es_start && Date_s_date <= Date_es_end) ||
                (Date_e_date >= Date_es_start && Date_e_date <= Date_es_end)){
                req.flash('error', 'Sprint dates overlapping!');
                res.render('add_edit_sprint', {
                    errorMessages: req.flash('error'),
                    success: 0,
                    successUpdate: 0,
                    title: 'AC scrum vol2',
                    pageName: 'add_sprint',
                    projects:ad_sm_projects,
                    username: req.user.username,
                    isUser: req.user.is_user,
                    toEditSprint: false,
                });

                return;
            }
        }


        var expected_velocity = 100;
        if (expected_velocity  <= data.velocity || data.velocity <= 0){
            req.flash('error', 'Irregular sprint velocity!')
            res.render('add_edit_sprint', {
                errorMessages: req.flash('error'),
                success: 0,
                successUpdate: 0,
                title: 'AC scrum vol2',
                pageName: 'add_sprint',
                projects:ad_sm_projects,
                username: req.user.username,
                isUser: req.user.is_user,
                toEditSprint: false,
            });
            return;
        }

        // Create new sprint
        const createdSprint = await Sprint.create({
            startDate: s_formated,
            endDate: e_formatted,
            velocity: data.velocity,
            project_id:data.sprint_project
        });

        await StoriesHelper.setSprintStories(createdSprint.id,data.stories);

        req.flash('success');
        res.render("add_edit_sprint", {
            projects: ad_sm_projects,
            pageName: "sprints",
            errorMessages: 0,
            successUpdate: 0,
            title: 'AC scrum vol2',
            username: req.user.username,
            isUser: req.user.is_user,
            success: req.flash('success'),
            toEditSprint: false,
        });
    } catch (e){
        console.log("New sprint  error: " + e.toString());
        req.flash('error', 'Error!');
        res.render("add_edit_sprint", {
            projects: ad_sm_projects,
            pageName: "sprints",
            errorMessages: req.flash('error'),
            title: 'AC scrum vol2',
            username: req.user.username,
            isUser: req.user.is_user,
            success: 0,
            successUpdate: 0,
            toEditSprint: false,
        });

    }

});


//  ------------- view a sprint ----------------
router.get('/:id/view', SprintsHelper.canAccessProjectBySprintId, async function(req, res, next) {
    await check_sm_projects(req.user);
    let currentSprint  = await SprintsHelper.getSprint(req.params.id);
    let currentProject = await ProjectHelper.getProject(currentSprint.project_id);
    let projectStories = await StoriesHelper.listSprintStories(currentProject.id,currentSprint.id);
    let activeSprintId = await SprintsHelper.currentActiveSprint(currentProject.id);
    let selected_sprint_date =   moment(currentSprint.startDate,'YYYY-MM-DD').format("DD.MM.YYYY") + " to " + moment(currentSprint.endDate,'YYYY-MM-DD').format("DD.MM.YYYY")
    let projectTasks = await TasksHelper.listProjectTasks(currentSprint.project_id);
    let activeSprintTasks = [];


    for (var i = 0; i < projectTasks.length; i++) {
        projectTasks[i].story = await StoriesHelper.getStory(projectTasks[i].story_id);
        if (projectTasks[i].story.sprint_id === currentSprint.id) {
            var assignee = projectTasks[i].assignee;
            if (assignee !== null) {
                projectTasks[i].assigneeTask = (await User.findById(projectTasks[i].assignee)).name;
            }
            else {
                projectTasks[i].assigneeTask = false;
            }
            activeSprintTasks.push(projectTasks[i]);
        }
    }

    res.render('sprint', {
        errorMessages: 0,
        success: 0,
        successUpdate: 0,
        pageName: 'sprints',
        project: currentProject,
        stories: projectStories,
        tasks: activeSprintTasks,
        uid: req.user.id,
        username: req.user.username,
        selected_sprint_date: selected_sprint_date,
        isUser: req.user.is_user,
        currentSprint: currentSprint,
        activeSprintId:activeSprintId});
    });


//  ------------- edit a sprint ----------------
router.get('/:id/edit', SprintsHelper.isSM, async function(req, res, next) {
    let currentSprint  = await SprintsHelper.getSprint(req.params.id);
    let currentProject = await ProjectHelper.getProject(currentSprint.project_id);
    let projectStories = await StoriesHelper.listSelectableSprintStories(currentProject.id,currentSprint.id);
    let activeSprintId = await SprintsHelper.currentActiveSprint(currentProject.id);
    let selected_sprint_date =   moment(currentSprint.startDate,'YYYY-MM-DD').format("DD.MM.YYYY") + " to " + moment(currentSprint.endDate,'YYYY-MM-DD').format("DD.MM.YYYY");

    res.render('add_edit_sprint', {
        errorMessages: 0,
        success: 0,
        pageName: 'projects',
        projects: ad_sm_projects,
        stories: projectStories,
        uid: req.user.id,
        username: req.user.username,
        selected_sprint_date: selected_sprint_date,
        isUser: req.user.is_user,
        currentSprint: currentSprint,
        toEditSprint: currentSprint,
        activeSprintId:activeSprintId,
    });
});

router.post('/:id/edit/', SprintsHelper.isSM, async function(req, res, next) {
    var data = req.body;

    await StoriesHelper.setSprintStories(req.params.id,data.stories)
    let currentSprint  = await SprintsHelper.getSprint(req.params.id);
    let currentProject = await ProjectHelper.getProject(currentSprint.project_id);
    let projectStories = await StoriesHelper.listSelectableSprintStories(currentProject.id,currentSprint.id);
    let activeSprintId = await SprintsHelper.currentActiveSprint(currentProject.id);
    let selected_sprint_date =   moment(currentSprint.startDate,'YYYY-MM-DD').format("DD.MM.YYYY") + " to " + moment(currentSprint.endDate,'YYYY-MM-DD').format("DD.MM.YYYY");


    try {
        var selected_date_array = data.selected_date.split(" to ");
        var s_date = selected_date_array[0];
        var e_date = selected_date_array[1];

        var s_formated = moment(s_date,'DD.MM.YYYY').format("YYYY-MM-DD")
        var e_formatted = moment(e_date, 'DD.MM.YYYY').format("YYYY-MM-DD")

        selected_sprint_date =   s_date + " to " + e_date;

        var Date_s_date = new Date(s_formated);
        var Date_e_date = new Date(e_formatted);

        var existing_sprints = await models.Sprint.findAll({
            where: {
                project_id: data.sprint_project,
                id: {[models.Sequelize.Op.notIn]:[currentSprint.id]}
            }
        });

        for(let s of existing_sprints){
            var Date_es_start = new Date(s.startDate);
            var Date_es_end   = new Date(s.endDate);
            if((Date_s_date >= Date_es_start && Date_s_date <= Date_es_end) ||
                (Date_e_date >= Date_es_start && Date_e_date <= Date_es_end)){
                req.flash('error', 'Sprint dates overlapping!');
                res.render('add_edit_sprint', {
                    errorMessages: req.flash('error'),
                    success: 0,
                    title: 'AC scrum vol2',
                    pageName: 'add_sprint',
                    projects:ad_sm_projects,
                    username: req.user.username,
                    isUser: req.user.is_user,
                    toEditSprint: currentSprint,
                    stories: projectStories,
                    currentSprint:currentSprint,


                });

                return;
            }
        }


        var expected_velocity = 100;
        if (expected_velocity  <= data.velocity || data.velocity <= 0){
            req.flash('error', 'Irregular sprint velocity!')
            res.render('add_edit_sprint', {
                errorMessages: req.flash('error'),
                success: 0,
                title: 'AC scrum vol2',
                pageName: 'add_sprint',
                projects:ad_sm_projects,
                username: req.user.username,
                isUser: req.user.is_user,
                toEditSprint: currentSprint,
                stories: projectStories,
                currentSprint:currentSprint,

            });
            return;
        }

        // Edit sprint
        await Sprint.update({
            startDate: s_formated,
            endDate: e_formatted,
            velocity: data.velocity,
            project_id:data.sprint_project
            },
            {where:{id:currentSprint.dataValues.id}}
        );

        const updatedSprint = await SprintsHelper.getSprint(req.params.id);
        await StoriesHelper.setSprintStories(updatedSprint.dataValues.id, data.stories);
        await TasksHelper.setSprintStoriesTasksLogs(updatedSprint.dataValues, req.user.id,);

        // req.flash('success');
        res.render("sprint", {
            projects: ad_sm_projects,
            pageName: "sprints",
            errorMessages: 0,
            title: 'AC scrum vol2',
            username: req.user.username,
            isUser: req.user.is_user,
            success: 0,
            successUpdate: req.flash('success'),
            toEditSprint: false,
            project:currentProject,
            stories: projectStories,
            currentSprint:updatedSprint,
            selected_sprint_date: selected_sprint_date,
        });
    } catch (e){
        console.log("New sprint  error: " + e.toString());
        req.flash('error', 'Error!');
        res.render("add_edit_sprint", {
            projects: ad_sm_projects,
            pageName: "sprints",
            errorMessages: req.flash('error'),
            title: 'AC scrum vol2',
            username: req.user.username,
            isUser: req.user.is_user,
            success: 0,
            toEditSprint: currentSprint,
            stories: projectStories,
            currentSprint:currentSprint,

        });

    }

    //
    // res.render('sprint', { errorMessages: 0, success: 0, pageName: 'sprints', project: currentProject,
    //     stories: projectStories,
    //     uid: req.user.id,
    //     username: req.user.username,
    //     selected_sprint_date: selected_sprint_date,
    //     isUser: req.user.is_user,
    //     currentSprint: currentSprint,
    //     activeSprintId:activeSprintId,
    //     success: req.flash('success')});

});





module.exports = router;

var express = require('express');
var router = express.Router();
var moment = require('moment');
var formidable = require('formidable');
var util = require('util')
var fs = require('fs');

var models = require('../models/');
var middleware = require('./middleware.js');

// models
var User = models.User;
var Projects = models.Project;
var UserProject = models.UserProject;
var Comment = models.Comment;
var Documentation = models.Documentation;

// helpers
var ProjectHelper = require('../helpers/ProjectHelper');
var StoriesHelper = require('../helpers/StoriesHelper');
var SprintsHelper = require('../helpers/SprintsHelper');
var TasksHelper   = require('../helpers/TasksHelper');

// ------------------ This should list all projects that are available to signed user ------------------
router.get('/', middleware.ensureAuthenticated, async function(req, res, next) {
    // let userProjects = await ProjectHelper.listUserProjects();
    let projects = await ProjectHelper.getAllowedProjects(req.user.id);

    res.render('projects', { errorMessages: 0, success: 0, pageName: 'projects', projects: projects, username: req.user.username, isUser: req.user.is_user, uid:req.user.id});
});

// ------------------ endpoint for project page ------------------
router.get('/:id/view', ProjectHelper.canAccessProject, async function(req, res, next) {
    let currentProject = await ProjectHelper.getProject(req.params.id);
    let projectStories = await StoriesHelper.listStories(req.params.id);
    let activeSprintId = await SprintsHelper.currentActiveSprint(currentProject.id);
    let projectTasks   = await TasksHelper.listProjectTasks(req.params.id);

    for (var i = 0; i < projectTasks.length; i++) {
        var assignee = projectTasks[i].assignee;
        if (assignee !== null) {
            projectTasks[i].assigneeTask = (await User.findById(projectTasks[i].assignee)).name;
        }
        else {
            projectTasks[i].assigneeTask = false;
        }
    }

    for (let i = 0; i < projectStories.length; i++) {
        if(projectStories[i].dataValues.sprint_id != null){
            let story_sprint = await SprintsHelper.getSprint(projectStories[i].dataValues.sprint_id);
            story_sprint.dataValues.startDate = moment(story_sprint.dataValues.startDate,'YYYY-MM-DD').format("DD.MM.YYYY");
            story_sprint.dataValues.endDate   = moment(story_sprint.dataValues.endDate,'YYYY-MM-DD').format("DD.MM.YYYY");
            projectStories[i].sprint = story_sprint;
        }
    }
    
    res.render('project', { errorMessages: 0, success: 0, pageName: 'projects', project: currentProject,
        stories: projectStories, tasks: projectTasks, uid: req.user.id, username: req.user.username,
        isClickable: req.user.name === currentProject.ProductOwner.name || req.user.name === currentProject.ScrumMaster.name,
        isUser: req.user.is_user,
    activeSprintId:activeSprintId});
});

// ------------------ endpoint for editing existing projects ------------------
router.get('/:id/edit/', ProjectHelper.isSMorAdmin, async function(req, res, next) {

    let toEditProject = await ProjectHelper.getProjectToEdit(req.params.id);
    let users = await User.findAllUsers();
    res.render('add_edit_project', { errorMessages: 0, title: 'AC scrum vol2', users: users,
        pageName: 'projects', username: req.user.username, toEditProject: toEditProject,
        isUser: req.user.is_user, success: 0 });
});

router.post('/:id/edit/', ProjectHelper.isSMorAdmin, async function(req, res, next) {
    var data = req.body;

    let users = await User.findAllUsers();
    // Get current version
    var project = await Projects.findOne({
        where: {
            id:req.params.id,
        }
    });

    // Set new attributes
    project.setAttributes({
        name: data.name,
        description: data.description,
        created_by: req.user.id,
        scrum_master: data.scrum_master,
        product_owner: data.product_owner,
    });

    // validate project
    if (!await ProjectHelper.isValidProject(project)){
        let toEditProject = await ProjectHelper.getProjectToEdit(project.id);
        req.flash('error', `Project Name: ${project.name} already in use!`);
        res.render('add_edit_project', { errorMessages: req.flash('error'), users:users, success: 0,
            title: 'AC scrum vol2', pageName: 'projects', toEditProject:toEditProject,
            username: req.user.username, isUser: req.user.is_user });
        return;
    }

    await project.save();

    // Destroy all current members
    await UserProject.destroy({
        where: {
            project_id: project.id,
        },
        force:true,
    });

    await ProjectHelper.saveProjectMembers(project, data.members);

    let toEditProject = await ProjectHelper.getProjectToEdit(req.params.id);

    req.flash('success', 'Project: '+ project.name + ' has been successfully updated');
    return res.render('add_edit_project', { errorMessages: 0, title: 'AC scrum vol2', users: users,
        pageName: 'projects', username: req.user.username, toEditProject: toEditProject,
        isUser: req.user.is_user, success: req.flash('success') });
});

// ------------------ endpoint for creating new projects ------------------

/**
 * Only admin can add new projects:
 *
 */
router.get('/create/', middleware.isAllowed, async function(req, res, next) {
    let users = await User.findAllUsers();
    res.render('add_edit_project', { errorMessages: 0, title: 'AC scrum vol2', users: users,
        pageName: 'projects', username: req.user.username,
        isUser: req.user.is_user, success: 0 });
});

router.post('/create/', middleware.isAllowed, async function(req, res, next) {

    let data = req.body;

    try {

        let users = await User.findAllUsers();

        // Create new project
        const createdProject = Projects.build({
            name: data.name,
            description: data.description,
            created_by: req.user.id,
            scrum_master: data.scrum_master,
            product_owner: data.product_owner,
        });

        // Validate project
        if (!await ProjectHelper.isValidProject(createdProject)){
            req.flash(req.flash('error', `Project Name: ${createdProject.name} already in use!`));
            return res.render('add_edit_project', { errorMessages: req.flash('error'),users:users, success: 0,
                title: 'AC scrum vol2', pageName: 'projects',
                username: req.user.username, isUser: req.user.is_user });
        }

        await createdProject.save();

        await ProjectHelper.saveProjectMembers(createdProject, data.members);

        req.flash('success', 'New Projects - ' + createdProject.name + ' has been successfully added');
        res.render('add_edit_project', { success: req.flash('success'),users:users, errorMessages: 0,
            title: 'AC scrum vol2', pageName: 'projects',
            username: req.user.username, isUser: req.user.is_user });
    } catch (e) {
        req.flash('error', 'Error!');
        res.render('add_edit_project', { errorMessages: req.flash('error'),users:[], success: 0,
            title: 'AC scrum vol2', pageName: 'projects',
            username: req.user.username, isUser: req.user.is_user });

    }

});



router.get('/:id/wall/', async function(req, res, next) {
    let project = await Projects.findById(req.params.id);

    let comments = await Comment.findAll({
        where: {
            project_id: req.params.id,
        },
        include: [
            {
                model: models.User,
                as: 'Owner',
                attributes: ['name', 'id'],
            },
        ],
        order: [
            ['createdAt', 'ASC'],
        ],
    })
    res.render('project_wall', { errorMessages: 0,
        pageName: 'project_wall', project: project, comments:comments, username: req.user.username,
        isUser: req.user.is_user, success: 0 });
});

router.post('/:id/wall/', async function(req, res, next) {
    var data = req.body;
    let comm =  await Comment.create({
        text: data.comment,
        created_by: req.user.id,
        project_id: req.params.id,
    });
    await comm.save();

    return res.redirect('/projects/' + req.params.id + '/wall');

});

router.get('/:id/documentation/', async function(req, res, next) {
    let project = await Projects.findById(req.params.id);
    let projectDocumentation = await ProjectHelper.getDocumentation(req.params.id);

    res.render('documentations', { errorMessages: 0,
        pageName: 'documentations', project: project, documents: projectDocumentation, username: req.user.username,
        isUser: req.user.is_user, success: 0 });
});

router.get('/:id/documentation/create', async function(req, res, next) {
    let project = await Projects.findById(req.params.id);

    res.render('add_edit_document', { errorMessages: 0,
        pageName: 'add_document', project: project, username: req.user.username,
        isUser: req.user.is_user, success: 0 });
});

router.post('/:id/documentation/create/', async function(req, res, next) {
    var data = req.body;

    let doc =  await Documentation.create({
        name: data.doc_name,
        text: data.doc_body,
        project_id: req.params.id
    });
    await doc.save();

    return res.redirect('/projects/' + req.params.id + '/documentation');
});

router.get('/:id/documentation/upload', async function(req, res, next) {
    let project = await Projects.findById(req.params.id);

    res.render('upload_document', { errorMessages: 0,
        pageName: 'upload_document', project: project, username: req.user.username,
        isUser: req.user.is_user, success: 0 });
});

router.post('/:id/documentation/upload', async function(req, res, next) {
    let project = await Projects.findById(req.params.id);
    var data = req.body;
    var form = new formidable.IncomingForm();

    console.log("Got form")
    form.parse(req, function (err, fields, files) { });

    form.on('end', function(fields, files) {
        var temp_path = this.openedFiles[0].path;
        var file_name = this.openedFiles[0].name;
        fs.readFile(temp_path, 'utf8', function(err, contents) {
            Documentation.create({
                name: file_name,
                text: contents,
                project_id: req.params.id
            }).then(function() {
                return res.redirect('/projects/' + req.params.id + '/documentation');
            });
        });
    });

    return;
});

router.get('/:id/documentation/:docId', async function(req, res, next) {
    let project = await Projects.findById(req.params.id);
    let document = await ProjectHelper.getDocument(req.params.docId);

    res.render('document', { errorMessages: 0,
        pageName: 'document', project: project, document: document, username: req.user.username,
        isUser: req.user.is_user, success: 0 });
});

router.get('/:id/documentation/:docId/edit', async function(req, res, next) {
    let project = await Projects.findById(req.params.id);
    let document = await ProjectHelper.getDocument(req.params.docId);

    res.render('add_edit_document', { errorMessages: 0,
        pageName: 'edit_document', project: project, toEditDoc: document, username: req.user.username,
        isUser: req.user.is_user, success: 0 });
});

router.post('/:id/documentation/:docId/edit', async function(req, res, next) {
    let project = await Projects.findById(req.params.id);
    let document = await ProjectHelper.getDocument(req.params.docId);

    var data = req.body;

    document.setAttributes({
        name: data.doc_name,
        text: data.doc_body,
    });
    await document.save();

    return res.redirect('/projects/' + req.params.id + '/documentation/' + req.params.docId);
});

module.exports = router;
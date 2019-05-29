var express = require('express');
var router = express.Router();
var middleware = require('./middleware.js');
var models = require('../models');
var Project = models.Project;
var UserProject = models.UserProject;

var ProjectHelper = require('../helpers/ProjectHelper');
var TasksHelper = require('../helpers/TasksHelper');

/* GET home page. */
router.get('/', middleware.ensureAuthenticated, async function(req, res, next) {

    let myProjects = await ProjectHelper.getMyProjects(req.user.id);

    var myActiveSprints = await models.Sprint.findAll({
        include: [
            {
                model: models.Project,
                as: 'Project',
                attributes: ['name','id'],

            },
        ],
        where: {
            startDate: {
                [models.Sequelize.Op.lte]: new Date()
            },
            endDate: {
                [models.Sequelize.Op.gt]: new Date()
            },
            [models.Sequelize.Op.or]:[
                {project_id: myProjects.map((row) => {return row.id}) }
            ]
        }
    });

    let myTasksAll = await TasksHelper.listUserTasks(req.user.id);
    let myTasks = {pending: [], accepted: [], inProgress: [], done: []};
    myTasksAll.forEach(function (task) {
        for (let i = 0; i < myActiveSprints.length; i++) {
            if (task.status !== 0 && myActiveSprints[i].id === task.Story.sprint_id) {
                switch (task.status) {
                    case 1:
                        myTasks.pending.push(task);
                        break;
                    case 2:
                        myTasks.accepted.push(task);
                        break;
                    case 3:
                        myTasks.inProgress.push(task);
                        break;
                    case 4:
                        myTasks.done.push(task);
                        break;
                }
                break;
            }
        }
    });

    res.render('dashboard', { title: 'AC scrum vol2', pageName: 'dashboard', myProjects: myProjects,
        myActiveSprints: myActiveSprints, myTasks: myTasks, uid: req.user.id, username: req.user.username, isUser: req.user.is_user });
});

router.get('/projects', function(req, res, next) {

    Project.findAll().then(function (projects) {
        res.send(JSON.parse(JSON.stringify(projects)));
    }, function (err) {
        throw err;
    })

});

module.exports = router;
var express = require('express');
var router = express.Router();
var middleware = require('./middleware.js');

var models = require('../models/');

var User = models.User;

router.get('/', middleware.isAllowed, function(req, res, next) {
    res.render('register', { errorMessages: 0, title: 'AC scrum vol2',
        pageName: 'admin_panel', username: req.user.username,
        isUser: req.user.is_user, success: 0 });
});

router.post('/', middleware.isAllowed, function (req, res, next) {
    var data = req.body;


    if (data.password !== data.password2) {
        req.flash('error', 'Passwords do not match.');
        res.render('register', { errorMessages: req.flash('error'), title: 'AC scrum vol2', pageName: 'admin_panel', username: req.user.username, isUser: req.user.is_user });
    }

    if (data.is_user === undefined) {
        data.is_user = 1;
    }

    User.save(data).then(function (createdUser) {
        req.flash('success', createdUser.username);
        res.render('register', { success: req.flash('success'), errorMessages: 0,
            title: 'AC scrum vol2', pageName: 'admin_panel',
            username: req.user.username, isUser: req.user.is_user });

    }, function (err) {
        req.flash('error', 'Error.');
        res.render('register', { errorMessages: req.flash('error'), success: 0,
            title: 'AC scrum vol2', pageName: 'admin_panel',
            username: req.user.username, isUser: req.user.is_user });
        // throw err;
    });
});


router.post('/edit_user/:id', middleware.isAllowed, async function (req, res, next) {
    var data = req.body;

    let user = await User.findById(req.params.id);

    let _user = await User.findById(req.params.id);


    if (data.password2 !== '') {
        if (data.password !== data.password2) {
            req.flash('error', 'Passwords do not match.');
            res.render('register', { errorMessages: req.flash('error'), title: 'AC scrum vol2', pageName: 'admin_panel', username: req.user.username, isUser: req.user.is_user });

        }

        // Set new attributes
        user.setAttributes({
            password: data.password,
        });
    }

    // Set new attributes
    user.setAttributes({
        name: data.name,
        surname: data.surname,
        username: data.username,
        email: data.email,
    });

    try {
        await User.save(user);
        req.flash('success', 'User updated');
        res.redirect('/dashboard');
        // res.render('register', { success: req.flash('success'), errorMessages: 0,
        //     title: 'AC scrum vol2', pageName: 'admin_panel',
        //     username: req.user.username, isUser: req.user.is_user });

    } catch (e) {
        req.flash('error', 'Error.');
        res.render('register', { errorMessages: req.flash('error'), success: 0,
            title: 'AC scrum vol2', pageName: 'admin_panel',
            username: req.user.username, uid: _user.id, user: _user,isUser: req.user.is_user });
        // throw err;
    }




});


router.get('/edit/:id', middleware.isAllowed, async function(req, res, next) {
    let user = await User.findById(req.params.id);
    res.render('register', { errorMessages: 0, title: 'AC scrum vol2',
        pageName: 'admin_panel', user:user, username: req.user.username,
        isUser: req.user.is_user, uid: req.user.id, success: 0 });
});

router.post('/edit/:id', middleware.isAllowed, function (req, res, next) {
    var data = req.body;
    if (data.password !== data.password2) {
        req.flash('error', 'Passwords do not match.');
        res.render('register', { errorMessages: req.flash('error'), title: 'AC scrum vol2', pageName: 'admin_panel', username: req.user.username, isUser: req.user.is_user });
    }

    if (data.is_user === undefined) {
        data.is_user = 1;
    }

    User.save(data).then(function (createdUser) {
        req.flash('success', createdUser.username);
        res.render('register', { success: req.flash('success'), errorMessages: 0,
            title: 'AC scrum vol2', pageName: 'admin_panel',
            username: req.user.username, isUser: req.user.is_user });

    }, function (err) {
        req.flash('error', 'Error.');
        res.render('register', { errorMessages: req.flash('error'), success: 0,
            title: 'AC scrum vol2', pageName: 'admin_panel',
            username: req.user.username, isUser: req.user.is_user });
        // throw err;
    });
});

module.exports = router;

var express = require('express');
var router = express.Router();
var models = require('../models/');
var bcrypt = require('bcrypt');

var User = models.User;
var Project = models.Project;

var middleware = require('./middleware.js');
/* GET users listing. */

// JSON GET EXAMPLE
/*router.get('/', async function(req, res, next) {

  try {
    let users = await User.findAllUsers({
      include: [
        {
          model: Project,
        }
      ]
    })
    res.send(JSON.parse(JSON.stringify(users)));

  } catch (e) {
    throw e;
  }


});*/

router.get('/:id/edita', middleware.ensureAuthenticated, async function (req, res, next) {

  let user = await User.findOne({
    where: {
      id: req.params.id
    }
  });

  res.render('user_edit', {
    errorMessages: 0,
    title: 'AC scrum vol2',
    pageName: 'edit_user',
    isUser: req.user.is_user,
    username: req.user.username,
    success: 0,
    user: user,
  });
});


router.post('/:id/edita', middleware.ensureAuthenticated, async function (req, res, next) {
  let data = req.body;
  let user = await getUsera(req.params.id);

  let errorMessages = 0;
  if (data.password !== data.password2) {
    req.flash('error', 'Passwords do not match.');
    errorMessages = req.flash('error');
  } else {

    dupUser = await User.findOne({
      where: {
        username: data.username
      }
    });

    if (dupUser && dupUser.id !== user.id) {
      errorMessages = "User with this name already exists";
    } else {

      user.setAttributes({
        username: data.username,
        password: data.password.length !== 0 ? bcrypt.hashSync(data.password, 10) : user.password,
        name: data.name,
        surname: data.surname,
        email: data.email,
        is_user: data.is_user ? 0 : 1
      });

      await user.save().catch(function (err) {
        errorMessages = req.flash('errorMessages', 'Error: ' + err);
      });
    }
  }

  if (!errorMessages) {
    req.flash('success', "User " + user.username + " updated");
  }

  res.render('user_edit', {
    errorMessages: errorMessages,
    title: 'AC scrum vol2',
    pageName: 'edit_user',
    isUser: req.user.is_user,
    username: req.user.username,
    success: errorMessages === 0 ? req.flash('success') : 0,
    user: user,
  });

});

/*
router.post('/:id/edit', middleware.isAllowed, async function (req, res, next) {
  var data = req.body;
  if (data.password !== data.password2) {
    req.flash('error', 'Passwords do not match.');
    res.render('user_edit', {
      errorMessages: req.flash('error'),
      title: 'AC scrum vol2',
      pageName: 'admin_panel',
      username: req.user.username,
      isUser: req.user.is_user
    });

    return;
  }

  let password;
  if (data.password === "") {
    password = bcrypt.hashSync(data.password, 10);
  } else {
    password = user.password;
  }

  if(data.is_user === undefined){
    data.is_user = 0
  }

  user = await getUsera(req.params.id);

  user.setAttributes({
    //username: data.username,
    password: password,
    name: data.name,
    surname: data.surname,
    email: data.email,
    is_user: data.is_user ? 0 : 1
  });

  let errorMessages = "";
  await user.save().catch(function (err) {
    errorMessages = err;
  });


  data = {
    errorMessages: 0,
    title: 'AC scrum vol2',
    pageName: 'admin_panel',
    user:user, username:
    req.user.username,
    isUser: req.user.is_user,
    uid: req.user.id,
  };


  if (errorMessages) {
    data["errorMessages"] = "Error updating user"
  } else {
    data["success"] = "Update successful"
  }


  return res.render('user_edit', data);

});
*/

async function getUserProjects(user_id) {
  return Project.findOne({
    where: {
      [models.Sequelize.Op.or]: [
        {scrum_master: user_id},
        {product_owner: user_id}
        ]
    }
  })
}

async function getUsera(user_id) {
  return User.findOne({
    where: {
      id: user_id
    }
  });
}

router.get('/:id/remove', middleware.ensureAuthenticated, async function (req, res, next) {
    console.log("Trying to remove user!");

    let user_id = req.params.id;
    let user = await getUsera(user_id);


    let projects = await getUserProjects(user_id);

    if(projects) {
      User.findAllUsers().then(function (users) { //true == users + admins
        res.render('admin_panel', {
          users: users,
          title: 'AC scrum vol2',
          pageName: 'admin_panel',
          username: req.user.username,
          isUser: req.user.is_user,
          thisUser: req.user,
          success: 0,
          errorMessages: "Cannot remove " + user.username + " since it is scrum muster or a product owner in project: " + projects.dataValues.name,
        });
      }, function (err) {
        throw err;
      })
    } else {

      let is_deleted = !! await User.destroy();

      if (is_deleted) {
        User.findAllUsers().then(function (users) { //true == users + admins
          res.render('admin_panel', {
            users: users,
            title: 'AC scrum vol2',
            pageName: 'admin_panel',
            username: req.user.username,
            isUser: req.user.is_user,
            thisUser: req.user,
            success: 0,
            successMessage: "User " + user.username + " successfully deleted",
          });
        }, function (err) {
          throw err;
        })
        //res.redirect('/admin_panel');
      } else {
        return res.status(500).send('Delete failed')
      }
    }

});


module.exports = router;

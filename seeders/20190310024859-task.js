'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Tasks', [
      {
        name: "Task 1",
        description: "Some chess task 1",
        time: 0.5,
        remainingTime: 0.5,
        loggedTime: 0.0,
        story_id: 1,
        project_id: 1,
        status: 0
      },
      {
        name: "Task 2",
        description: "Some chess task 2",
        time: 1,
        remainingTime: 1,
        loggedTime: 0.0,
        story_id: 1,
        project_id: 1,
        assignee: 4,
        status: 1
      },
      {
        name: "Task 3",
        description: "Some chess task 3",
        time: 1,
        remainingTime: 1,
        loggedTime: 0.0,
        story_id: 1,
        project_id: 1,
        assignee: 4,
        status: 2
      },
      {
        name: "Task 4",
        description: "Some chess task 4",
        time: 2,
        remainingTime: 2,
        loggedTime: 0.0,
        story_id: 1,
        project_id: 1,
        assignee: 4,
        status: 2
      },
      {
        name: "Task 5",
        description: "Some chess task 5",
        time: 2,
        remainingTime: 2,
        loggedTime: 0.0,
        story_id: 1,
        project_id: 1,
        assignee: 4,
        status: 2
      }
    ], {});
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.bulkDelete('People', null, {});
    */
  }
};

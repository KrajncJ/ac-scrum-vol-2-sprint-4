'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    var endDate = new Date();
    var startDate = new Date();
    var endDate2 = new Date();
    var numberOfDaysToAdd = - 2;
    endDate2.setDate(endDate.getDate() + numberOfDaysToAdd + 1);
    endDate.setDate(endDate.getDate() + numberOfDaysToAdd);
    startDate.setDate(startDate.getDate() - 7);

    return queryInterface.bulkInsert('Comments', [
      {
        text: 'Zelo se veselim pričekta projekta.',
        project_id: 1, // Šahovski
        created_by: 4,
        createdat: endDate,

      },
      {
        text: 'Komaj čakam, da bo aplikacija končana.',
        project_id: 1, // Šahovski
        created_by: 4,
        createdat: startDate,

      },
      {
        text: 'Potrudili se bomo.',
        project_id: 1, // Šahovski
        created_by: 5,
        createdat: endDate2,

      },
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

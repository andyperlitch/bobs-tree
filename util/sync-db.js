var db = require('../server/models');
db.sequelize
.sync({ force: true })
.then(function() {
  console.log('DB is being synced... (Wait until process ends)');
}, function(e) {
  console.log('An error occurred syncing the DB:');
  console.log(e);
});

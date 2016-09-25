var db = require('../server/models');
db.sequelize
.sync()
.then(function() {
  console.log('DB has been synced');
}, function(e) {
  console.log('An error occurred syncing the DB:');
  console.log(e);
});

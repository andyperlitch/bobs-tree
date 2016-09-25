module.exports = function(sequelize, DataTypes) {
  var Anecdote = sequelize.define('Anecdote', {
    title: {
      type: DataTypes.STRING
    },
    body: {
      type: DataTypes.TEXT('long')
    }
  });
  return Anecdote;
};

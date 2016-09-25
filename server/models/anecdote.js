module.exports = function(sequelize, DataTypes) {
  var Anecdote = sequelize.define('Anecdote', {
    title: {
      type: DataTypes.STRING
    },
    body: {
      type: DataTypes.TEXT('long')
    }
  });
  Anecdote.associate = function(models) {
    Anecdote.hasMany(models.Person);
  };
  return Anecdote;
};

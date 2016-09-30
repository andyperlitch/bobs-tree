module.exports = function(sequelize, DataTypes) {
  var LifeEvent = sequelize.define('LifeEvent', {
    name: {
      type: DataTypes.STRING
    },
    date: {
      type: DataTypes.DATE
    },
    date_is_approximate: {
      type: DataTypes.BOOLEAN
    }
  });
  return LifeEvent;
};

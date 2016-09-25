module.exports = function(sequelize, DataTypes) {
  var Person = sequelize.define('Person', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    gender: {
      type: DataTypes.ENUM('male', 'female')
    },
    eye_color: {
      type: DataTypes.STRING
    },
    hair_color: {
      type: DataTypes.STRING
    },
    skin_color: {
      type: DataTypes.STRING
    },
    adult_height: {
      type: DataTypes.INTEGER
    },
    biography: {
      type: DataTypes.TEXT('long')
    },
    birth_weight: {
      type: DataTypes.STRING
    },
    birth_date: {
      type: DataTypes.DATE
    },
    death_date: {
      type: DataTypes.DATE
    },
    birth_place: {
      type: DataTypes.STRING
    },
    death_place: {
      type: DataTypes.STRING
    },
    cause_of_death: {
      type: DataTypes.TEXT
    },
    profile_picture: {
      type: DataTypes.STRING
    }
  });
  Person.associate = function(models) {
    Person.hasMany(models.Names);
    Person.hasMany(models.MedicalCondition);
    Person.belongsToMany(models.Anecdote);
    Person.belongsToMany(Person, { through: models.Connection });
    Person.hasMany(models.Photo, { through: models.PhotoTag });
  };
  return Person;
};
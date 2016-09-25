module.exports = function(sequelize, DataTypes) {
  var MedicalCondition = sequelize.define('MedicalCondition', {
    name: {
      type: DataTypes.STRING
    },
    age_at_diagnosis: {
      type: DataTypes.FLOAT
    },
    symptom_description: {
      type: DataTypes.TEXT('medium')
    },
    treatment_description: {
      type: DataTypes.TEXT('medium')
    }
  });
  return MedicalCondition;
};

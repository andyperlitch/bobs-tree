var YAML = require('json2yaml');
var definition = require('sequelize-json-schema');
var _ = require('lodash');
var db = require('../server/models');
var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');

// Ensure output is specified
if (!argv.target) {
  console.error('Usage: node util/create-swagger-defs.js --target=output/file.yml');
  process.exit(1);
}

// Keys on db that are not models
var nonModelKeys = ['sequelize', 'Sequelize'];

// Convert all models to definition objects
var modelKeys = _.difference(Object.keys(db), nonModelKeys);
var swaggerDefs = {};
modelKeys.forEach(function(key) {
  swaggerDefs['I' + key] = definition(db[key]);
});

// Convert to yaml and write to target file
var yamlText = YAML.stringify(swaggerDefs).replace(/^---\n/, '');
var fileContents = fs.readFileSync(argv.target, 'utf8');

var replaceRE = /(#\s*@start-inject-definitions\n)[\w\W]*(#\s*@end-inject-definitions)/;
var updatedFileContents = fileContents.replace(replaceRE, '$1' + yamlText + '\n$2');

fs.writeFileSync(argv.target, updatedFileContents);
console.log('Definitions written.');

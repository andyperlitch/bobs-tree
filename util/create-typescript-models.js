var fs = require('fs');
var path = require('path');
var jsYaml = require('js-yaml');
var request = require('request');
var unzip = require('unzip2');

var codeGenEndpoint = 'https://generator.swagger.io/api/gen/clients';
var language = 'typescript-angular';

require('ssl-root-cas').inject();

fs.readFile(path.resolve(__dirname, '..', 'api/swagger', 'swagger.yaml'), 'utf8', function (error, yaml) {
  if (error) {
    throw error;
  }

  var swaggerObj = jsYaml.load(yaml);

  var postBody = {
    spec: swaggerObj,
    options: {
      modelPropertyNaming: 'snake_case',
      apiPackage: 'api.clients.settings',
      modelPackage: 'api.clients.settings'
    }
  };

  request.post({
    url: codeGenEndpoint + '/' + language,
    body: JSON.stringify(postBody),
    headers: {
      'Content-Type': 'application/json'
    }
  }, function(error, response, body){
    if (error) {
      throw error;
    }

    if (response.statusCode !== 200) {
      throw new Error('Response code was not 200. ' + body)
    }

    var responseObj = JSON.parse(body);

    request({
      url: responseObj.link,
      encoding: null
    }).pipe(unzip.Extract({ path: path.resolve(__dirname, '..', 'client', 'src/api' )}));
  });
});
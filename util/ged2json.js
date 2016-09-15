/**
 * Convert .ged files to json format
 */

var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');

/** gedcom-stream
var Gedcom = require('gedcom-stream');
var gedcom = new Gedcom();
var data = [];

gedcom.on('data', data.push.bind(data));
gedcom.on('end', function() {
  fs.writeFileSync(argv.out, JSON.stringify(data));
});
gedcom.on('error', function() {
  console.log(data);
});
fs.createReadStream(argv.in).pipe(gedcom);
*/

/** parse-gedcom: parse */
var parser = require('parse-gedcom');
fs.readFile(argv.in, 'utf8', function(err, result) {
  if (err) throw err;
  var parsed = parser.parse(result);
  fs.writeFile(argv.out, JSON.stringify(parsed, 0, 2), 'utf8', function(err) {
    if (err) throw err;
    console.log('File converted: ', argv.out);
  });
});


/** parse-gedcom: d3ize
var parser = require('parse-gedcom');
fs.readFile(argv.in, 'utf8', function(err, result) {
  if (err) throw err;
  var parsed = parser.d3ize(parser.parse(result));
  fs.writeFile(argv.out, JSON.stringify(parsed, 0, 2), 'utf8', function(err) {
    if (err) throw err;
    console.log('File converted: ', argv.out);
  });
});
*/



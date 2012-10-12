var fs = require('fs');
var tentApp = require('./tent.js').tentApp;


var fcpCredentials = JSON.parse(fs.readFileSync('./fcpCredentials.json', 'utf8') );
var fcheslackCredentials = JSON.parse(fs.readFileSync('./fcheslackCredentials.json', 'utf8') );

var fcpTentApp = new tentApp('https://fcp.tent.is/tent', fcpCredentials);
var fcheslackTentApp = new tentApp('https://fcheslack.tent.is/tent', fcheslackCredentials);



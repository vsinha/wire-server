var apn = require('apn');

// configure server options and export
var serverType = process.argv[2] || 'dev';
switch (serverType) {
    case 'dev':
        console.log("Starting server as dev");
        var options = {
            cert: "certificates/devCert.pem",
            key: "certificates/devKey.pem",
            production: false
        };
        break;
    case 'prod':
        console.log("Starting server as prod");
        var options = {
            cert: "certificates/prodCert.pem",
            key: "certificates/prodKey.pem",
            production: true
        };
        break;
}

// init apn connection and export
var apnConnection = new apn.Connection(options);

module.exports.apnConnection = apnConnection

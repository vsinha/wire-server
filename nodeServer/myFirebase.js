var Firebase = require('firebase');


var serverType = process.argv[2] || 'dev';

switch (serverType) {
  case 'dev':
    var ref = new Firebase('https://vivid-torch-3032.firebaseio.com/');
    var firebaseSecret = "ENAo24P9qfkiEMqfwaJPEXlXSr4w919YHfbN1IKm";
    break;
  case 'prod':
    var ref = new Firebase('https://wire-production.firebaseio.com/');
    var firebaseSecret = "UdWvl5Ayn6sEqm53dj76aFD7zQr4ev9QRudLJLkA";
    break;
}

var authAdmin = function (callback) {
    ref.authWithCustomToken(firebaseSecret, function(err, authData) {
        if (!err) {
            console.log('Authenticated Admin');
            module.exports.adminRef = ref;
            callback();
        } else {
            console.log("Auth Error");
        }
    });
};

module.exports.ref = ref;
module.exports.authAdmin = authAdmin;

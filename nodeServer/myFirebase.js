var Firebase = require('firebase');
//var ref = new Firebase('https://vivid-torch-3032.firebaseio.com/');
//var firebaseSecret = "ENAo24P9qfkiEMqfwaJPEXlXSr4w919YHfbN1IKm";
var ref = new Firebase('https://wire-production.firebaseio.com/');
var firebaseSecret = "UdWvl5Ayn6sEqm53dj76aFD7zQr4ev9QRudLJLkA";

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

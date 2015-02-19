var apn = require("apn");

// configure server options and export
var serverType = process.argv[2] || "dev";
switch (serverType) {
    case "dev":
        console.log("Starting server as dev");
        var options = {
            cert: "certificates/devCert.pem",
            key: "certificates/devKey.pem",
            production: false
        };
        break;
    case "prod":
        console.log("Starting server as prod");
        var options = {
            cert: "certificates/prodCert.pem",
            key: "certificates/prodKey.pem",
            production: true
        };
        break;
}

// init apn connection 
var apnConnection = new apn.Connection(options);
var ref;

var addNotificationToFirebase = function(notificationKey, notificationObj) {
    // add the notification
    var pushRef = ref.child("notifications/" + notificationKey).set(notificationObj);

    // add index to the user's notifications
    ref.child("users/" + notificationObj.user_id + "/notifications/" + notificationKey).set(true);
}

var sendPushNotificationToUserId = function (userId, pushNote, successCallback) {
    ref.child("users/" + userId + "/installation")
    .once("value", function (snap) {
        var installation = snap.val();
        if (installation && installation.device_token) {
            console.log("sending push notification to " + userId + ": " + pushNote.alert);
            var device = deviceFromTokenString(installation.device_token);
            apnConnection.pushNotification(pushNote, device);
            successCallback();
        }
    });
};

var deviceFromTokenString = function (deviceToken) {
    var b64token = deviceToken;
    var buf = new Buffer(b64token, "base64");
    var device = new apn.Device(buf);
    return device;
};

var addNotificationToFirebaseAndSendPush = function(notificationKey, notificationObj, pushNote, callback) {
    ref = require("./myFirebase").adminRef;

    // check if the notification has already been created
    ref.child("notifications/" + notificationKey + "/push_notification_sent").once("value", function(snap) {
        console.log("checking notification: " + notificationKey + " " + snap.val());
        if (!snap.val() || snap.val() == false) {
            console.log("notification hasn't been sent!");
            addNotificationToFirebase(notificationKey, notificationObj);

            sendPushNotificationToUserId(notificationObj.user_id, pushNote, function() {
                // use this for flagging sent notifications:
                ref.child("notifications/" + notificationKey + "/push_notification_sent").set(true);
                callback();
            });
        } else {
            console.log("notification has been sent!");
        }
    });
};

module.exports.apnConnection = apnConnection;
module.exports.addNotificationToFirebaseAndSendPush = addNotificationToFirebaseAndSendPush;


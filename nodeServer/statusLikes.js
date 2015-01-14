var apn = require('apn');

var serverType = process.argv[2] || 'dev';
switch (serverType) {
  case 'dev':
    var options = {
        cert: "certificates/devCert.pem",
        key: "certificates/devKey.pem",
        production: false
    };
    break;
  case 'prod':
    var options = {
        cert: "certificates/prodCert.pem",
        key: "certificates/prodKey.pem",
        production: true
    };
    break;
}
var apnConnection = new apn.Connection(options);

var ref;
var start = function() {
    console.log('Likes Push Server');
    ref = require('./myFirebase').adminRef;
    listenForNewStatusLikesAndSendNotifications();
};

var listenForNewStatusLikesAndSendNotifications = function() {
    ref.child('status_likes')
    .on('child_added', function (snap) {
        if (snap.val() === "new") {
            var params = snap.name().split(':');
            var statusId = params[0];
            var likeUserId = params[1];
            addStatusLikeNotificationToFirebase(statusId, likeUserId);
        }
    });
};

var addStatusLikeNotificationToFirebase = function (statusId, likeUserId) {
    if (statusId && likeUserId) {
        // Get Status Content
        getStatusFromId(statusId, function (status) {

            // Create Notification Object
            var notification = createNotificationObject(status, likeUserId);

            // Save Notification To Firebase
            saveNotificationToFirebase(notification);

            // Send Apple Push Notification
            sendApplePushNotification(notification);

            // Set status_likes index to sent
            setStatusLikesIndex(statusId, likeUserId, "push_sent");
        });
    } else {
        console.log("Error in addStatusLikeNotificationToFirebase(): Missing Info");
        console.log("statusId: ", statusId);
        console.log("likeUserId", likeUserId);
    }
};

var getStatusFromId = function (statusId, callback) {
    ref.child('statuses/'+statusId).once('value', function (snap) {
        var status = snap.val();
        status.id = statusId;
        callback(status);
    });
};

var createNotificationObject = function (status, likeUserId) {
    var notification = {
        user_id : status.user_id,
        like_user_id : likeUserId,
        status_id : status.id,
        created_at : Date.now(),
        type : "status_like"
    };
    return notification;
};

var saveNotificationToFirebase = function (notification) {
    // Add Notification to 
    var pushRef = ref.child('/notifications/').push(notification);
    
    var notificationId = pushRef.name();
    // Add Index To users/username/notifications
    ref.child('users/'+notification.user_id+'/notifications/'+notificationId).set(true);
};

var sendApplePushNotification = function (notification) {
    ref.child('users/' + notification.user_id + '/installation')
    .once('value', function (snap) {
        var installation = snap.val();
        if (installation && installation.device_token) {
            getNameFromUserId(notification.like_user_id, function (name) {
                var note = configureStatusLikePushNote(name);
                var device = deviceFromTokenString(installation.device_token);

                apnConnection.pushNotification(note, device);
            });
        }
    });
};

var getNameFromUserId = function(userId, callback) {
    ref.child('users/' + userId + '/public_profile/name')
    .once('value', function (snap) {
        var name = snap.val();
        callback(name);
    });
};

var deviceFromTokenString = function (deviceToken) {
    var b64token = deviceToken;
    var buf = new Buffer(b64token, 'base64');
    var device = new apn.Device(buf);
    return device;
};

var configureStatusLikePushNote = function (name) {
      var note = new apn.Notification();
      console.log('sending push notification: ' + name + ' liked your status');
      note.alert = name +' liked your status';
      return note;
};

var setStatusLikesIndex = function (statusId, likeUserId, value) {
    ref.child('status_likes/'+statusId+':'+likeUserId).set(value);
};


module.exports.start = start;

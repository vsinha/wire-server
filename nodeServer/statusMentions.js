// var Firebase = require('firebase');
// var ref = new Firebase('https://vivid-torch-3032.firebaseio.com/');

var apn = require('apn');
var options = {
    production: false
};

var apnConnection = new apn.Connection(options);

var ref;
var start = function () {
    console.log('Starting Push Server');
    ref = require('./myFirebase').adminRef;
    listenForNewMessagesAndSendNotifications();
};

var getUserIdFromUsername = function(username, callback) {
    ref.child('usernames/' + username)
    .once('value', function (snap) {
        var userId = snap.val();
        callback(userId);
    });
};

var getUsernameFromUserId = function(userId, callback) {
    ref.child('users/' + userId + 'public_profile/username')
    .once('value', function (snap) {
        var username = snap.val();
        callback(username);
    });
};

var listenForNewMessagesAndSendNotifications = function () {
    ref.child('statuses')
    .on('child_added', function (snap) {
        var status = snap.val();
        status.id = snap.name();

        var regex = /@.*?\s/;
        var usernames = status.text.match(regex);
        if (usernames) {
            for (var i = 0; i < usernames.length; i++) {
                var username = usernames[i];
                console.log("found mention of ", usernames);
                username = username.substring(1, username.length-1);
                getUserIdFromUsername(username, function (userId) {
                    addMentionNotificationToDb(status, userId);
                });
            }
        }
    });
};

var addMentionNotificationToDb = function (status, userId) {
    // Check If A Notification Has Already Been Created 
    // For the Status And the Username mentioned
    var statusUserIdKey = status.id+':'+userId;
    ref.child('mention_notifications/'+statusUserIdKey)
    .once('value', function (snap) {
        if ( !snap.val() ) {
            // Add Notification
            var notification = {
                type: 'mention',
                status: status.id,
                user_id: userId
            };

            var pushRef = ref.child('notifications').push(notification);
            var notificationId = pushRef.name();

            // Add Index To users/username/notifications
            ref.child('users/'+userId+'/notifications/'+notificationId).set(true);

            // Send Push
            sendPushNotification(status, userId);

            // Add Notification Index
            ref.child('mention_notifications/'+statusUserIdKey).set(true);
        }
    });
};

var sendPushNotification = function (status, userId) {
    ref.child('users/' + userId + '/installation')
    .once('value', function (snap) {
        var installation = snap.val();
        if (installation) {
            if (installation.deviceToken) {
                var device = deviceFromTokenString(installation.deviceToken);
                var note = configureMentionPushNote(status);
                apnConnection.pushNotification(note, device);
            }
        }
    });
};

var deviceFromTokenString = function (deviceToken) {
    var b64token = deviceToken;
    var buf = new Buffer(b64token, 'base64');
    var device = new apn.Device(buf);
    return device;
};

var configureMentionPushNote = function (status) {
    getUsernameFromUserID(status.userId, function(username) {
        var note = new apn.Notification();
        console.log('@' + username + ' mentioned you in a status');
        note.alert = '@' + username + ' mentioned you in a status';
        return note;
    });
};

var startFeedbackChecker = function () {
    // Set Up Apple Push Feedback Logger
    var feedbackOptions = {
        "batchFeedback": true,
        "interval": 5
    };

    var feedback = new apn.Feedback(feedbackOptions);
    feedback.on("feedback", function(devices) {
        devices.forEach(function(item) {
            // Do something with item.device and item.time;
            console.log(item);
        });
    });
};


module.exports.start = start;
module.exports.startFeedback = startFeedbackChecker;

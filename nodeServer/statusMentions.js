var apn = require("apn");
var apnServices = require("./apnServices");

var ref;
var start = function () {
    console.log("Starting Status Mentions Push Server");
    ref = require("./myFirebase").adminRef;
    listenForNewMessagesAndSendNotifications();
};

var listenForNewMessagesAndSendNotifications = function () {
    ref.child("statuses").on("child_changed", function (childSnap, prevChild) {
        var status = childSnap.val();
        status.id = childSnap.name();

        var regex = /@.*?\s/;
        var usernames = status.text.match(regex);
        if (usernames) {
            for (var i = 0; i < usernames.length; i++) {
                var username = usernames[i];
                console.log("found mention of ", username);
                username = username.substring(1, username.length-1);

                getUserIdFromUsername(username, function (userId) {
                    var notificationKey = status.id + ":" + userId;

                    var notificationObj = {
                        type: "mention",
                        status_id: status.id,
                        user_id: userId,
                        created_at: Date.now(),
                        push_notification_sent: false
                    };

                    var pushNote = configureMentionPushNote(username);
                    apnServices.addNotificationToFirebaseAndSendPush(notificationKey, notificationObj, pushNote, 
                        function() {}
                    );
                });
            }
        }
    });
};

var configureMentionPushNote = function (username) {
      var note = new apn.Notification();
      note.alert = "@" + username +" mentioned you in a status";
      return note;
};

var getUserIdFromUsername = function(username, callback) {
    ref.child("usernames/" + username)
    .once("value", function (snap) {
        var userId = snap.val();
        callback(userId);
    });
};

var getUsernameFromUserId = function(userId, callback) {
    ref.child("users/" + userId + "/public_profile/username")
    .once("value", function (snap) {
        var username = snap.val();
        callback(username);
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
            console.log("feedback", item);
        });
    });
};

module.exports.start = start;
module.exports.startFeedback = startFeedbackChecker;

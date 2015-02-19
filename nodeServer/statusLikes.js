var apn = require("apn");
var apnServices = require("./apnServices");

var ref;
var start = function() {
    console.log("Likes Push Server");
    ref = require("./myFirebase").adminRef;
    listenForNewStatusLikesAndSendNotifications();
};

var listenForNewStatusLikesAndSendNotifications = function() {
    ref.child("status_likes").on("child_added", function (snap) {
        if (snap.val() === "new") {
            var params = snap.name().split(":");
            var statusId = params[0];
            var likeUserId = params[1];

            if (statusId && likeUserId) {
                getStatusFromId(statusId, function(status) {
                    var notificationKey = status.id + ":" + likeUserId;

                    var notificationObj = {
                        type: "status_like",
                        user_id: status.user_id,
                        like_user_id: likeUserId,
                        status_id: status.id,
                        created_at: Date.now(),
                        push_notification_sent: false
                    };

                    // create note and send push
                    getNameFromUserId(likeUserId, function(name) {
                        var pushNote = configureStatusLikePushNote(name);
                        apnServices.addNotificationToFirebaseAndSendPush(notificationKey, notificationObj, pushNote, 
                          function() {}
                        );
                    });
                });
            } else {
                console.log("Error in addStatusLikeNotificationToFirebase(): Missing Info");
                console.log("statusId: ", statusId);
                console.log("likeUserId", likeUserId);
            }
        }
    });
};

var configureStatusLikePushNote = function (name) {
      var note = new apn.Notification();
      note.alert = name +" liked your status";
      return note;
};

var getStatusFromId = function (statusId, callback) {
    ref.child("statuses/"+statusId).once("value", function (snap) {
        var status = snap.val();
        status.id = statusId;
        callback(status);
    });
};

var getNameFromUserId = function(userId, callback) {
    ref.child("users/" + userId + "/public_profile/name")
    .once("value", function (snap) {
        var name = snap.val();
        callback(name);
    });
};

module.exports.start = start;

var apn = require("apn");
var apnServices = require("./apnServices");

var RECENT_HOURS_AGO = 6;
var NEARBY_MILES = 10;

var ref;
var start = function() {
    console.log("New Status Push Server");
    ref = require("./myFirebase").adminRef;
    listenForNewStatusesAndSendNotifications();
};

var listenForNewStatusesAndSendNotifications = function() {
    ref.child("statuses").on("child_added", function (snap) {
        var status = snap.val();
        // TODO: Use promises.
        getUserHasOtherRecentStatus(user.id, function(userHasOtherRecentStatus) {
            // Don't notify the user's friends if the user has posted a status in
            // the last RECENT_HOURS_AGO hours.
            if (userHasOtherRecentStatus) {
                return;
            }

            getUserFromUserId(userId, function(user) {
                // TODO: Use GeoFire for location queries.
                // https://github.com/firebase/geofire-js
                for (var i=0; i<user.friends.length; i++) {
                    var friendId = user.friends[i];
                    getUserFromUserId(friendId, function(friend) {
                        // Don't notify the user's friend if they are more than
                        // NEARBY_MILES away from each other.
                        if (!usersAreNearby(user, friend)) {
                            return;
                        }

                        // Notify the user's friend.
                        var notificationKey = status.id + ":" + friend.id;
                        var notificationObj = {
                            type: "status",
                            user_id: status.user_id,
                            status_id: status.id,
                            created_at: Date.now(),
                            push_notification_sent: false
                        };
                        var pushNote = configureStatusPushNote(
                            user.public_profile.name,
                            status
                        ); 
                        apnServices.addNotificationToFirebaseAndSendPush(
                            notificationKey,
                            notificationObj,
                            pushNote, 
                            function() {}
                        );
                    });
                }
            });
        });
    })
};

/* 
 * Return true if the user with the given user id has posted a status in the last
 * RECENT_HOURS_AGO hours, and false otherwise.
 */
var getUserHasOtherRecentStatus = function(userId, callback) {
    // TODO: Keep all of a user's statuses, and have a flag marking the current
    // status.
    // Get the timestamp representing RECENT_HOURS_AGO hours ago.
    var date = new Date();
    date.setHours(date.getHours() - RECENT_HOURS_AGO);
    var sixHoursAgo = date.valueOf();

    // Check whether the user has posted any statuses in the last RECENT_HOURS_AGO
    // hours.
    ref.child("users/" + userId + "/created_at")
    .startAt(sixHoursAgo)
    .once("value", function(snap) {
        var statuses = snap.val();
        if (statuses.length === 0) {
            callback(false);
        } else {
            callback(true);
        }
    });
};

var getUserFromUserId = function(userId, callback) {
    ref.child("users/" + userId)
    .once("value", function (snap) {
        var user = snap.val();
        callback(user);
    });
};

/*
 * Return true if the user and their friend are at most NEABY_MILES miles away from each
 * other right now, and false otherwise.
 */
var usersAreNearby = function(user, friend) {
    var milesAway = distance(
        user.location.lat,
        user.location.long,
        friend.location.lat,
        friend.location.long
    );
    return (milesAway <= NEARBY_MILES)
};

/*
 * Use the Haversine Formula to calculate the distance between two points. Return
 * the distance in miles.
 * http://en.wikipedia.org/wiki/Haversine_formula
 */
function distance(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var a = 
         0.5 - Math.cos((lat2 - lat1) * Math.PI / 180)/2 + 
         Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
         (1 - Math.cos((lon2 - lon1) * Math.PI / 180))/2;
    var km = R * 2 * Math.asin(Math.sqrt(a));
    var miles = km * .621371;
    return miles;
};

/*
 * Create a notification that lets the user's friend know that they're down.
 */
var configureStatusPushNote = function(name, status) {
    var note = new apn.Notification();
    // TODO: Remove "is down for", and the default text.
    note.alert = name + status;
    return note;
};

module.exports.start = start;

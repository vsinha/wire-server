var apn = require('apn');

var ref;
var apnConnection;
var start = function () {
    console.log('Started group message notifications');

    ref = require('./myFirebase').adminRef;
    apnConnection = require('./apnServices').apnConnection;

    listenForGroupCreationAndSendNotifications();
    listenForNewGroupMessagesAndSendNotifications();
};

// notify users when they are added to a group chat
var listenForGroupCreationAndSendNotifications = function() {
    // listen for newly created groups
    ref.child('group_chats/group')
    .on('child_added', function (snap) {
        var groupId = snap.name();
        var groupCreatorId = snap.val().created_by;
        var groupName = snap.val().name;
        console.log('new group created: ', groupId);

        watchForNewMemberFromGroupId(groupId, function(newlyAddedUserId) {
            // send a notification to the added member
            // if (newlyAddedUser != newGroupCreator) {
            
            // check if a notification has already been created 
            var addToGroupNotificationKey = groupId + ':' + newlyAddedUserId;
            ref.child('group_added_notifications/' + addToGroupNotificationKey)
            .once('value', function(snap) {
                if (!snap.val()) {
                    // add notification
                    var notification = {
                        type: "added_to_group",
                        group_id: groupId,
                        user_id: newlyAddedUserId
                    }

                    var pushRef = ref.child('notifications').push(notification);
                    var notificationId = pushRef.name();

                    // add index to the user's notifications
                    ref.child('users/' + newlyAddedUserId + '/notifications/' + notificationId).set(true);

                    // create note and send push
                    getNameFromUserId(groupCreatorId, function(creatorName) {
                        var pushNote = configureGroupAddPushNote(creatorName, groupName);
                        sendPushNotificationToUserId(newlyAddedUserId, pushNote, function() {
                            // execute this on success
                            ref.child('group_added_notifications/' + addToGroupNotificationKey).set(true);
                        });
                    });
                }
            });
        });
    });
};

var configureGroupAddPushNote = function (username, groupName) {
      var note = new apn.Notification();
      console.log('sending push notification: @' 
          + username + ' added you to group: ' + groupName);
      note.alert = '@' + username +' added you to group: ' + groupName;
      return note;
};

var sendPushNotificationToUserId = function (userId, pushNote, successCallback) {
    ref.child('users/' + userId + '/installation')
    .once('value', function (snap) {
        var installation = snap.val();
        if (installation && installation.device_token) {
            var device = deviceFromTokenString(installation.device_token);
            apnConnection.pushNotification(pushNote, device);
            successCallback();
        }
    });
};

var deviceFromTokenString = function (deviceToken) {
    var b64token = deviceToken;
    var buf = new Buffer(b64token, 'base64');
    var device = new apn.Device(buf);
    return device;
};


var watchForNewMemberFromGroupId = function (groupId, callback) {
    ref.child('group_chats/members/' + groupId)
    .on('child_added', function (snap) {
        var userAddedToGroup = snap.name();
        console.log("user in group: ", userAddedToGroup);

        callback(userAddedToGroup);
    });
};

var getNameFromUserId = function(userId, callback) {
    ref.child('users/' + userId + '/public_profile/name')
    .once('value', function (snap) {
        var name = snap.val();
        callback(name);
    });
};

// notify users when there are messages in group chats 
// in which they participate and they have notifications enabled
var listenForNewGroupMessagesAndSendNotifications = function() {
};

module.exports.start = start;

var apn = require('apn');
var apnServices = require('./apnServices');

var ref;
var start = function () {
    console.log('Started group message notifications');

    ref = require('./myFirebase').adminRef;

    listenForGroupCreationAndSendNotifications();
    listenForNewGroupMessagesAndSendNotifications();
};

// notify users when they are added to a group chat
var listenForGroupCreationAndSendNotifications = function() {
    // listen for newly created groups
    ref.child('group_chats/group').on('child_added', function (snap) {
        var groupId = snap.name();
        var groupCreatorId = snap.val().created_by;
        var groupName = snap.val().name;

        if (!snap.val().expired) {
            console.log("watching group: " + groupName);
            watchForNewMemberFromGroupId(groupId, function(newlyAddedUserId) {
                // send a notification to the added member
                if (newlyAddedUserId != groupCreatorId) {
                    var notification = {
                        key: groupId + ':' + newlyAddedUserId,
                        type: "added_to_group",
                        group_id: groupId,
                        user_id: newlyAddedUserId,
                        created_at: Date.now()
                    }

                    // create note and send push
                    getNameFromUserId(groupCreatorId, function(creatorName) {
                        var pushNote = configureGroupAddPushNote(creatorName, groupName);
                        apnServices.addNotificationToFirebaseAndSendPush(notification, pushNote,
                            function() {}
                        );
                    });
                }
            });
        } else { 
            console.log("group " + groupName + " is expired");
        }
    });
};

var configureGroupAddPushNote = function (username, groupName) {
      var note = new apn.Notification();
      note.alert = '@' + username +' added you to group: ' + groupName;
      return note;
};

var getNameFromUserId = function(userId, callback) {
    ref.child('users/' + userId + '/public_profile/name')
    .once('value', function (snap) {
        var name = snap.val();
        callback(name);
    });
};

var watchForNewMemberFromGroupId = function (groupId, callback) {
    ref.child('group_chats/members/' + groupId)
    .on('child_added', function (snap) {
        var userAddedToGroup = snap.name();
        console.log("new user " + userAddedToGroup + " in group " + groupId);
        callback(userAddedToGroup);
    });
};


// notify users when there are messages in group chats 
// in which they participate and they have notifications enabled
var listenForNewGroupMessagesAndSendNotifications = function() {
};

module.exports.start = start;

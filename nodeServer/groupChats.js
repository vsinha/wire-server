var apn = require("apn");
var apnServices = require("./apnServices");

var ref;
var start = function () {
    console.log("Started group message notifications");

    ref = require("./myFirebase").adminRef;

    listenForGroupCreationAndSendNotifications();
    listenForNewGroupMessagesAndSendNotifications();
};

// notify users when they are added to a group chat
var listenForGroupCreationAndSendNotifications = function() {
    // listen for newly created groups
    watchLivingGroups( function (groupId, group) {
        var groupCreatorId = group.created_by;
        var groupName = group.name;

        watchForNewMemberFromGroupId(groupId, function(newlyAddedUserId, memberUserId) {
            if (newlyAddedUserId === memberUserId) { return; }

            // send a notification to the added member
            var notification = {
                key: groupId + ":" + newlyAddedUserId,
                type: "added_to_group",
                group_id: groupId,
                member_user_id: memberUserId,
                user_id: newlyAddedUserId,
                created_at: Date.now()
            };

            getNameFromUserId(memberUserId, function(memberName) {
                var pushNote = configureGroupAddPushNote(memberName, groupName);
                apnServices.addNotificationToFirebaseAndSendPush(notification, pushNote,
                    function() {}
                );
            });
        });
    });
};

var configureGroupAddPushNote = function (username, groupName) {
      var note = new apn.Notification();
      note.alert = username +" added you to a group: " + groupName;
      return note;
};

var getNameFromUserId = function(userId, callback) {
    ref.child("users/" + userId + "/public_profile/name")
    .once("value", function (snap) {
        var name = snap.val();
        callback(name);
    });
};

var watchForNewMemberFromGroupId = function (groupId, callback) {
    ref.child("group_chats/members/" + groupId).on("child_added", function (snap) {
        var userAddedToGroup = snap.name();
        var memberUserId = snap.val();
        console.log(memberUserId + "added " + userAddedToGroup + " to group " + groupId);
        callback(userAddedToGroup, memberUserId);
    });
};

// notify users when there are messages in group chats 
// in which they participate and they have notifications enabled
var listenForNewGroupMessagesAndSendNotifications = function() {
    watchLivingGroups( function(groupId, group) {

        watchForNewMessagesFromGroupId(groupId, group, function(newMessage) {

            getEachSubscribedUserInGroup(groupId, function(userId) {
                console.log(userId + " " + newMessage.user_id);
                if (userId === newMessage.user_id) { return; }

                var datestamp = String(newMessage.created_at);
                datestamp = datestamp.replace(".","");

                var notification = {
                    key: groupId + ":" + datestamp + ":" + userId;
                    type: "message",
                    group_id: groupId,
                    user_id: userId,
                    created_at: Date.now()
                };

                getNameFromUserId(newMessage.user_id, function(creatorName) {
                    var pushNote = configureGroupMessagePushNote(creatorName, group.name, 
                        newMessage.text);
                    apnServices.addNotificationToFirebaseAndSendPush(notification, pushNote, 
                        function () {}
                    );
                });
            });
        });
    });
};

var configureGroupMessagePushNote = function (username, groupName, messageText) {
    var note = new apn.Notification();
    note.alert = username + " to " + groupName + ": " + messageText;
    return note;
}

var getEachSubscribedUserInGroup = function(groupId, callback) {
    ref.child("group_chats/notifications/" + groupId).once("value", function(snap) {
        var users = snap.val();
        if (users != null) { // at least someone is subscribed for notifications
            for (user in users) {
                console.log("userId: " + user);
                if (!users.hasOwnProperty(user)) { continue; }
                    // call our callback for each subscribed user
                    callback(user);
            }
        } else {
            console.log("no one subscribed to notifications in " + groupId);
        }
    });
};

var watchLivingGroups = function(callback) {
    ref.child("group_chats/group").on("child_added", function(snap) {
        var groupId = snap.name();
        var group = snap.val();
        if (!group.expired) { 
            callback(groupId, group);
        }
    });
};

var watchForNewMessagesFromGroupId = function(groupId, group, callback) {
    console.log("waiting for messages in: " + group.name);

    ref.child("group_chats/messages/" + groupId).on("child_added", function(snap) {
        var newMessage = snap.val();
        console.log("new message: " + newMessage.text);
        callback(newMessage);
    });
};

module.exports.start = start;

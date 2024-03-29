var graph = require('fbgraph');
var fbAppSecret = '57464bed46f744b1b89de8b892049a9a';
graph.setAppSecret(fbAppSecret);

var ref;
var start = function () {
    // Give Server Admin Access
    console.log('Started Friend Sync');
    ref = require('./myFirebase').adminRef;
    listenForNewUsersAndSyncFriends();
};

var listenForNewUsersAndSyncFriends = function () {
    // Listen For New Users
    ref.child('users')
    .on('child_added', function (snap) {
        // When New User Signs Up, Query Facebook For other friends who use the app.
        var userId = snap.name();
        console.log("detected new userId (syncing friends): ", userId);
        getFacebookAuthFromUserId(userId, function(facebook_auth) {
            ref.child('user_mappings/facebook/'+facebook_auth)
            .once('value', function (snap) {
                try {
                    var accessToken = snap.val().accessToken;
                    var fbUserId = snap.val().id;
                    if (accessToken && fbUserId) {
                        getUserFriends(accessToken, fbUserId);
                    }
                } catch (err) {
                    console.log("failed to sync friends for: ", userId);
                }
            });
        });
    });
};

var getUserFriends = function (accessToken, fbUserId) {
    var params = {
        access_token: accessToken,
    };

    graph.get( '/'+fbUserId+'/friends', params, function (err, res) {
        if (err) {
            console.log('Error: ', err);
        } else {
            // Automatically sync those Facebook friends with Chatter friends
            syncUserFriends(fbUserId, res.data);
        }
    });
};


var syncUserFriends = function (fbUserId, friends) {
    // Find Username for new user
    getUserIdFromFbUserId(fbUserId, function (rootUserId) {
        console.log('Syncing Friends For '+rootUserId);
        // For each friend get username by fbUserId
        for (var i = 0; i < friends.length; i++) {
            var friendFbUserId = friends[i].id;
            getUserIdFromFbUserId(friendFbUserId, function (friendUserId) {
                // Add each user to eachothers friends
                addFriendFromUserId(rootUserId, friendUserId);
                addFriendFromUserId(friendUserId, rootUserId);
            });
        };
    });
};

var getUserIdFromFbUserId = function (fbUserId, callback) {
    ref.child('user_mappings/facebook/facebook:'+fbUserId)
    .once('value', function (snap) {
        if (snap.val()) {
            callback(snap.val().user_id);
        }
    });
};

var getFacebookAuthFromUserId = function(userId, callback) {
    ref.child('users/'+userId+'/facebook_auth')
    .once('value', function (snap) {
        callback(snap.val());
    });
};

var addFriendFromUserId = function (userId, friendUserId) {
    ref.child('users/'+userId+'/friends/'+friendUserId)
    .set(true);
};

module.exports.start = start;

// Sample Response From FB Graph /fbUserId/friends
// {
//     data: [{
//         name: 'Donna Shepardsky',
//         id: '289302101261550'
//     }, {
//         name: 'Elizabeth Schrocksky',
//         id: '1535015630066740'
//     }],
//     paging: {
//         next: 'https://graph.facebook.com/v2.1/1484710011804756/friends?access_token=CAAU2ChfKMTABAADh7aBLtRIlZBM2BBHJz3Lsp0tMXZCtNypkTfOkox4N4QJcF2fN8whdHaPhpCyEcsMlOGj0y7I9blaxOP7AgIDDBXag8mZBdbb7BZAd9mCarmzAZAlsX8u1ZBbkHRZBu5BrmvmVOq3DYmJgXdChJbjNK10NOy2Tt3LNNDWLYlCh5FfnLskYj3ZBDeZBksXlujZCJMxN6PLKmcGd4DLMdsa5wZD&limit=5000&offset=5000&__after_id=enc_AezXJPfaT2ZLDxsdWxpQh5ebZkO1AqqrBtiouxpDGnaqvY5f2YSvB7gntHSoDj3A2tj_eAFBquawXfCRcKiuQ8LY'
//     },
//     summary: {
//         total_count: 2
//     }
// }

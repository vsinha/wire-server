
var myFirebase = require('./myFirebase');
var friendSync = require('./friendSync');
var statusMentions = require('./statusMentions');

myFirebase.authAdmin(function () {
    friendSync.start();
    statusMentions.start();
    statusMentions.startFeedback();
});



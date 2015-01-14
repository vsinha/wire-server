var myFirebase = require('./myFirebase');
var friendSync = require('./friendSync');
var statusMentions = require('./statusMentions');
var statusLikes = require('./statusLikes');
var groupChats = require('./groupChats');

console.log("Starting server as:", process.argv[2] || 'dev');

myFirebase.authAdmin(function () {
    friendSync.start();
    statusMentions.start();
    statusMentions.startFeedback();
    statusLikes.start();
    groupChats.start();
});


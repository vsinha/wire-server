var myFirebase = require('./myFirebase');

myFirebase.authAdmin(function () {
    console.log("Converting Timestamps");
    ref = require('./myFirebase').adminRef;
    convertStatuses();
});

var ref;
var convertStatuses = function () {
    console.log("Converting Statuses");
    ref.child('statuses')
    .on('child_added', function (snap) {
        var status = snap.val();
        var statusId = snap.name();
        if (isNaN(status.created_at)) {
            // Convert To UNIX Timestamp
            var unixDate = Date.parse(status.created_at);
            
            // Save Dates To Firebase
            ref.child('statuses/'+statusId+'/created_at').set(unixDate);
        }
    });
};
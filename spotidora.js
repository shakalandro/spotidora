var sp = getSpotifyApi(1);
var models = sp.require('sp://import/scripts/api/models');
var auth = sp.require('sp://import/scripts/api/auth');

var player = models.player;
var fbAccess;

exports.init = init;


/* Playlist stuff starts */

var myAwesomePlaylist = new models.Playlist("My Awesome Playlist");
var daftPunkSearch = new models.Search("Daft Punk");
daftPunkSearch.localResults = models.LOCALSEARCHRESULTS.APPEND;

daftPunkSearch.tracks.forEach(function(track) {
	//myAwesomePlaylist.add(track.name);
	console.log(track.name);
});

// Currently playing. 
//myAwesomePlaylist.add(models.player.track);
myAwesomePlaylist.observe(models.EVENT.RENAME, function() {
	console.log("Playlist renamed!");
});

/* Playlist stuff ends */

auth.authenticateWithFacebook('345161178882446', ['friends_status',
												  'friends_actions.music'], {
	onSuccess : function(accessToken, ttl) {
		console.log("Success! Here's the access token: " + accessToken);
		fbAccess = accessToken;
	},

	onFailure : function(error) {
		console.log("Authentication failed with error: " + error);
	},

	onComplete : function() { }
});

function init() {
	console.log("Spotidora App Starting");
    updatePageWithTrackDetails();

    player.observe(models.EVENT.CHANGE, function (e) {

        // Only update the page if the track changed
        if (e.data.curtrack == true) {
            updatePageWithTrackDetails();
        }
    });
}

function updatePageWithTrackDetails() {
    var header = document.getElementById("header");

    // This will be null if nothing is playing.
    var playerTrackInfo = player.track;

    if (playerTrackInfo == null) {
        header.innerText = "Nothing playing!";
    } else {
        var track = playerTrackInfo.data;
        header.innerHTML = track.name + " on the album " + track.album.name + " by " + track.album.artist.name + ".";
    }
}

// populate trackListWrapper with tracks
var views = sp.require("sp://import/scripts/api/views");

var tpl = new models.Playlist();
var tempList = new views.List(tpl);
tpl.add(models.Track.fromURI("spotify:track:3zpYM630ntLtWOyJu1divO"));
tpl.add(models.Track.fromURI("spotify:track:7FmI3ygVG04KIhikMHKOKB"));
tpl.add(models.Track.fromURI("spotify:track:4X4ZHPOgp5DLh3tYZD5YYU"));

document.getElementById('trackListWrapper').appendChild(tempList.node);
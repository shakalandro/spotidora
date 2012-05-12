var sp;
var models;
var auth;
var player;
var fbAccess;

$(document).ready(function() {
	sp = getSpotifyApi(1);
	models = sp.require('sp://import/scripts/api/models');
	auth = sp.require('sp://import/scripts/api/auth');
	
	player = models.player;
	
	auth.authenticateWithFacebook('345161178882446', ['friends_status',
												  'friends_actions.music'], {
		onSuccess : function(accessToken, ttl) {
			console.log("Success! Here's the access token: " + accessToken);
			fbAccess = accessToken;
			init();
		},
	
		onFailure : function(error) {
			console.log("Authentication failed with error: " + error);
		},
	
		onComplete : function() { }
	});
	testLocalStorage();
	/*
	var views = sp.require("sp://import/scripts/api/views");

	var tpl = new models.Playlist();
	var tempList = new views.List(tpl);
	tpl.add(models.Track.fromURI("spotify:track:3zpYM630ntLtWOyJu1divO"));
	tpl.add(models.Track.fromURI("spotify:track:7FmI3ygVG04KIhikMHKOKB"));
	tpl.add(models.Track.fromURI("spotify:track:4X4ZHPOgp5DLh3tYZD5YYU"));
	
	document.getElementById('trackListWrapper').appendChild(tempList.node);
	*/
});


//https://developer.spotify.com/technologies/apps/docs/beta/833e3a06d6.html
function createPlaylist(searchQuery, playlistName) {
	var myAwesomePlaylist = new models.Playlist(playlistName);
	var search = new models.Search(searchQuery);
	search.localResults = models.LOCALSEARCHRESULTS.APPEND;
	search.observe(models.EVENT.CHANGE, function() {
		search.tracks.forEach(function(track) {
			console.log(track.name);
			myAwesomePlaylist.add(track);
		});
	});
	search.appendNext();
	// Currently playing. 
	//myAwesomePlaylist.add(models.player.track);
	myAwesomePlaylist.observe(models.EVENT.RENAME, function() {
		console.log("Playlist renamed!");
	});
}

// Returns top song with the given data.
function getTrackWithData (songData) {
	var toReturn;
	var search = new models.Search(songName);
	search.localResults = models.LOCALSEARCHRESULTS.APPEND;
	search.observe(models.EVENT.CHANGE, function() {
		search.tracks.forEach(function(track) {
			toReturn = track;
		});
	});
	for (i = 0; i < 1; i++) {
		search.appendNext();
	}
	return toReturn;	
}

// Returns array with 5 or less songs of the given name.
function getSongsWithName (songName) {
	var toReturn = [];
	var search = new models.Search(songName);
	search.localResults = models.LOCALSEARCHRESULTS.APPEND;
	search.observe(models.EVENT.CHANGE, function() {
		search.tracks.forEach(function(track) {
			toReturn.push(track);
		});
	});
	for (i = 0; i < 5; i++) {
		search.appendNext();
	}
	return toReturn;
}

function testLocalStorage () {
    if (localStorage)  {
        console.log("Local storage supported");  
    } else  {
        console.log("Local storage unsupported");
    }
}

function init() {
	console.log("Spotidora App Starting");
    updatePageWithTrackDetails();
    getUserFriends();

    player.observe(models.EVENT.CHANGE, function (e) {
        // Only update the page if the track changed
        if (e.data.curtrack == true) {
            updatePageWithTrackDetails();
        }
    });
}

/*
 * takes an associative array friendsSongs[friend][song]
 * and filters songs that are added to the playlist
 */
function filterSongs(friendsSongs) {
}

/**
 * Adds a song to the playlist
 */
function addSongToPlayList(songData) {
}

/*
	Makes an fb call on url. When it completes it will call one of the handlers,
	which should have the following signatures.
	
	void success(data, paging_info);
	void failure(xhr, status);
*/
function makeFBAjaxCall(url, success, failure) {
	$.ajax({
        url: url,
		data: {access_token: fbAccess},
		dataType: "json"
    }).done(function(data) {
    	success(data['data'], data['paging']);
    }).fail(failure);
}

function getFriendsMusicTastes() {
	var friendId;
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
	
function getListens() {
	console.log("sending music request");
	makeFBAjaxCall("https://graph.facebook.com/roy.miv/music.listens",
	function(data, paging) {
		console.log(data);
	},
	function() {
		console.log("failure");
	});
}

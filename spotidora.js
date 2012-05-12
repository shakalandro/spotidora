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
});

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

function init() {
	console.log("Spotidora App Starting");
    updatePageWithTrackDetails();
    pullFacebookDataTest();

    player.observe(models.EVENT.CHANGE, function (e) {

        // Only update the page if the track changed
        if (e.data.curtrack == true) {
            updatePageWithTrackDetails();
        }
    });
}

function pullFacebookDataTest() {
    $.ajax({
        url: "https://graph.facebook.com/me/friends",
		data: {access_token: fbAccess}
    }).done(function(data) {
	    $('body').append(data);
    }).fail(function(xhr, status) {
    	$('body').append(status);
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

/*
function getListens() {
	console.log("sending ajax request");
	$.get({
		url: "https://graph.facebook.com/roy.miv/music.listens?access_token=" + fbAccess ,
		success: function(response) {
			console.log("response received: " + response);
			var data = $("<p>");
			data.innerHTML = response;
			$("music").addChild(response);
		}
		error: function(data) {
			console.log("request failed: " + data);
		}
	});
}*/

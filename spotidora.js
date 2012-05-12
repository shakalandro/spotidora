var sp;
var models;
var views;
var auth;
var player;
var fbAccess;

var SPOTIFY_APP_NAME = 'Spotify';
var NUM_SONGS = 100;

$(document).ready(function() {
	//remove me!!!!!!!!!!!!!
	localStorage.clear();

	sp = getSpotifyApi(1);
	models = sp.require('sp://import/scripts/api/models');
	auth = sp.require('sp://import/scripts/api/auth');
	views = sp.require("sp://import/scripts/api/views");
	
	player = models.player;
	
	$('#goButton').click(function() {
		$(this).hide();
		start();
	});
	addSongToMainList(getSongWithName("blah"));
	
});

function start() {
	auth.authenticateWithFacebook('345161178882446', ['friends_status',
												  'friends_actions.music'], {
		onSuccess : function(accessToken, ttl) {
			console.log("Success! Here's the access token: " + accessToken);
			fbAccess = accessToken;
			getUserFriends();
		},
	
		onFailure : function(error) {
			console.log("Authentication failed with error: " + error);
		},
	
		onComplete : function() { }
	});
	
	if (!localStorage.heard) {
		localStorage.heard = JSON.stringify([]);
	}
	if (!localStorage.seen) {
		localStorage.seen = JSON.stringify([]);
	}
}

function addSongToMainList (track) {
	console.log("Adding " + track + " to main list.");
	var tpl = new models.Playlist();
	var tempList = new views.List(tpl);
	tpl.add(track);
	document.getElementById('trackListWrapper').appendChild(tempList.node);
}


//https://developer.spotify.com/technologies/apps/docs/beta/833e3a06d6.html
function getPlayListWithName(playlistName) {
	var toReturn = models.Playlist.fromName(playlistName);
}

function createPlaylist(searchQuery, playlistName) {
	var myAwesomePlaylist = new models.Playlist(playlistName);
	var search = new models.Search(searchQuery);
	search.localResults = models.LOCALSEARCHRESULTS.APPEND;
	search.observe(models.EVENT.CHANGE, function() {
		search.tracks.forEach(function(track) {
			//console.log(track.name);
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

// Returns array with 1 or less songs of the given name.
function getSongWithName (songName) {
	console.log("Getting song with name " + songName);
	var toReturn = [];
	var search = new models.Search("Paranoid Android");
	search.localResults = models.LOCALSEARCHRESULTS.APPEND;
	search.observe(models.EVENT.CHANGE, function() {
		if (search.tracks[0]) {
			console.log("Got track " + search.tracks[0] );
			return search.tracks[0];
		}
	});
	for (i = 0; i < 1; i++) {
		search.appendNext();
	}
	//return toReturn[0];
}

function testLocalStorage () {
    if (localStorage)  {
        console.log("Local storage supported");
    } else  {
        console.log("Local storage unsupported");
    }
}

function go() {
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

function getUserFriends() {
	makeFBAjaxCall("https://graph.facebook.com/me/friends",
		function(friends) {
			getMusic(friends);
  	    }, function() {
			$('body').append('friends error');
		}
	);	
}

/*
 * takes an associative array friendsSongs[friend][song]
 * and filters songs that are added to the playlist
 *
 * Currently filters out old fb post and duplicate songs.
 *
 */

function filterSongs(uid, songs) {
	var newSongs = [];
	console.log(localStorage.seen);
	var seen = JSON.parse(localStorage.seen);
	var heard = JSON.parse(localStorage.heard);
	$.each(songs, function(idx, s) {
		if (s['application']['name'] == SPOTIFY_APP_NAME &&
				seen.indexOf(s['id']) == -1) {
			var from = friendId;
			var songId = s['data']['song']['id'];
			var songTitle = s['data']['song']['title'];
			var time = s['start_time'];
			console.log(songId, songTitle, time);
			if (heard.indexOf(songId) == -1) {
				newSongs.push({
					id: songId,
					title: songTitle,
					stamp: time
				});	
				heard[songId] = [from];
			} else {
				heard[songId].push(from);
			}
			seen.push(s['id']);
		}
	});
	newSongs.sort(function(s1, s2) {
		return (new Date(s1['stamp'])) < (new Date(s2['stamp']));
	});
	for (var i = 0; i < NUM_SONGS; i++) {
		addSongToPlayList(newSongs[i]['id'], newSongs[i]['title']);
	}
	localStorage.heard = JSON.stringify(heard);
	localStorage.seen = JSON.stringify(seen);
}

/**
 * Adds a song to the playlist
 */
function addSongToPlayList(id, songTitle) {
	console.log("Adding " + songTitle + " to main playlist");
	//var track = getSongWithName(songTitle);
	console.log("Getting song with name " + songTitle);
	var toReturn = [];
	var search = new models.Search(songTitle);
	search.localResults = models.LOCALSEARCHRESULTS.APPEND;
	search.observe(models.EVENT.CHANGE, function() {
		if (search.tracks[0]) {
			console.log("Got track " + search.tracks[0] );
			addSongToMainList(track);
		}
	});
	for (i = 0; i < 1; i++) {
		search.appendNext();
	}
}


/*
	If we see a song from a friend we have not seen before, then add them to localStorage
	If we get a vote then set 
*/

function upvoteSong(friend, song) {

}

function downvoteSong(friend, song) {
}

/*
	Makes an fb call on url. When it completes it will call one of the handlers,
	which should have the following signatures.
	
	void success(data, paging_info);
	void failure(xhr, status);
*/
function makeFBAjaxCall(url, success, failure) {
	console.log("Making Ajax call to " + url);
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
/*
    if (playerTrackInfo == null) {
        //header.innerText = "Nothing playing!";
    } else {
        var track = playerTrackInfo.data;
        //header.innerHTML = track.name + " on the album " + track.album.name + " by " + track.album.artist.name + ".";
    }
    */
}
	
function getMusic(friends) {
	var music = {};
	var received = 0;
	for (var i = 0; i < friends.length; i++) {
		var friendId = friends[i].id;
		
		makeFBAjaxCall("https://graph.facebook.com/" + friendId + "/music.listens",
			function(data, paging) {
				received++;
				if (data.length != 0) {
					music[data[0].from.id] = data;
				}
				if (received == friends.length)
					filterSongs(music);
			},
			function() {
				received++;
				console.log("failure");
				if (received == friends.length)
					filterSongs(music);
			}
		);
	}
}

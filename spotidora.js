var sp;
var models;
var views;
var auth;
var player;
var fbAccess;

var SPOTIFY_APP_NAME = 'Spotify';

$(document).ready(function() {
	sp = getSpotifyApi(1);
	models = sp.require('sp://import/scripts/api/models');
	auth = sp.require('sp://import/scripts/api/auth');
	views = sp.require("sp://import/scripts/api/views");
	
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
	
	if (!localStorage.heard) {
		localStorage.heard = JSON.stringify([]);
	}
	if (!localStorage.seen) {
		localStorage.seen = JSON.stringify([]);
	}
	
	/*
	var views = views = sp.require("sp://import/scripts/api/views");

	var tpl = new models.Playlist();
	var tempList = new views.List(tpl);
	tpl.add(models.Track.fromURI("spotify:track:3zpYM630ntLtWOyJu1divO"));
	tpl.add(models.Track.fromURI("spotify:track:7FmI3ygVG04KIhikMHKOKB"));
	tpl.add(models.Track.fromURI("spotify:track:4X4ZHPOgp5DLh3tYZD5YYU"));
	
	document.getElementById('trackListWrapper').appendChild(tempList.node);
	*/
});


function addSongToMainList (track) {
	var tpl = new models.Playlist();
	tpl.add(track);
	var tempList = new views.list(tpl);
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
function filterSongs(friendsSongs) {
	var newSongs = [];
	var heard = JSON.parse(localStorage.heard);
	var seen = JSON.parse(localStorage.seen);
	$.each(friendsSongs, function(friendId, songs) {
		$.each(songs, function(idx, s) {
			if (s['application']['name'] == SPOTIFY_APP_NAME &&
					seen.indexOf(s['id']) == -1) {
				var from = friendId;
				var songId = s['data']['song']['id'];
				var songTitle = s['data']['song']['title'];
				var time = s['start_time']
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
	});
	$.each(newSongs, function(idx, obj) {
		addSongToPlayList(obj['id'], obj['songTitle']);
	});
	console.log(heard);
	localStorage.heard = heard;
	localStorage.seen = seen;
}

/*
	If we see a song from a friend we have not seen before, then add them to localStorage
	If we get a vote then set 
*/

function upvoteSong(friend, song) {
	localStorage.friend
}

function downvoteSong(friend, song) {
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

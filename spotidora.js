var sp;
var models;
var views;
var auth;
var player;
var fbAccess;

var SPOTIFY_APP_NAME = 'Spotify';
var NUM_SONGS = 10;

var songsRemaining = 200;
var friendsChecked = 0;
var requestInterval;
var friends;

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
        $('#instructions').hide();
		start();
	});
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
		function(myfriends) {
			getMusic(myfriends);
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
	var seen = JSON.parse(localStorage.seen);
	var heard = JSON.parse(localStorage.heard);
	$.each(songs, function(idx, s) {
		if (s['application']['name'] == SPOTIFY_APP_NAME &&
				seen.indexOf(s['id']) == -1) {
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
				heard[songId] = [uid];
			} else {
				heard[songId].push(uid);
			}
			seen.push(s['id']);
		}
	});
	newSongs.sort(function(s1, s2) {
		return (new Date(s1['stamp'])) < (new Date(s2['stamp']));
	});
	for (var i = 0; i < Math.min(NUM_SONGS, newSongs.length); i++) {
		addSongToPlayList(newSongs[i]['id'], newSongs[i]['title']);
	}
	localStorage.heard = JSON.stringify(heard);
	localStorage.seen = JSON.stringify(seen);
}

/*
	If we see a song from a friend we have not seen before, then add them to localStorage
	If we get a vote then set 
*/

function upvoteSong(friend, song) {

}

function downvoteSong(friend, song) {
}

/**
 * Adds a song to the playlist
 */
function addSongToPlayList(songId, songTitle) {

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

    if (playerTrackInfo == null) {
        header.innerText = "Nothing playing!";
    } else {
        var track = playerTrackInfo.data;
        header.innerHTML = track.name + " on the album " + track.album.name + " by " + track.album.artist.name + ".";
    }
}
	
function getMusic(myfriends) {
	friends = myfriends;
	requestInterval = setInterval(requestSongs, 500);	
}

function requestSongs() {
	if (friends.length == 0 || songsRemaining <= 0) {
		clearInterval(requestInterval);
	}
	var index = Math.floor(Math.random() * (friends.length - 10));
	var makeRequests = friends.splice(index, 10);
	$.each(makeRequests, function(i, l) {
		makeFBAjaxCall("https://graph.facebook.com/" + l.id + "/music.listens",
			function(data, paging) {
				friendsChecked += makeRequests.length;
				if (data.length != 0) {
					songsRemaining -= data.length;
					filterSongs(data[0].from.id, data);
				}
			},
			function() {
				console.log("get songs by friend failure");
			});	
	});
}

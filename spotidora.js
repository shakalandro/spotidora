var SPOTIFY_APP_NAME = 'Spotify';
var TOTAL_SONG_POSTS = 100;
var TOTAL_NUM_SONGS = 50;
var SONGS_PER_PERSON = 8;
// The rate in milliseconds that we make api requests
var SONG_RATE = 100;
var LOADER_SPEED = 100;

var sp = getSpotifyApi(1);
var models = sp.require('sp://import/scripts/api/models');
var auth = sp.require('sp://import/scripts/api/auth');
var views = sp.require("sp://import/scripts/api/views");

var fbAccess;
var player;
var playlistModel;
var playlistView;

var friendsChecked = 0;
var songTimer;
var loaderInterval;
var friends;

$(document).ready(function() {
	$('#loader').hide();
	localStorage.clear();

	if (!localStorage.heard) {
		localStorage.heard = JSON.stringify({});
	}
	if (!localStorage.seen) {
		localStorage.seen = JSON.stringify([]);
	}

	$('#goButton').click(function() {
        $('#instructions').hide();
        $('#loader').show();
        loaderInterval = setInterval(function() {
        	var old = parseInt($('#loader').css('backgroundPositionX'));
        	$('#loader').css('backgroundPositionX', (old + 30) % 360 + 'px');
        }, LOADER_SPEED);
		$(this).addClass('small');
		authenticate();
	});
});

function authenticate() {
	auth.authenticateWithFacebook('345161178882446',
			['friends_status', 'friends_actions.music'], {
		onSuccess : function(accessToken, ttl) {
			console.log("Authentication Success! Here's the access token: " + accessToken);
			fbAccess = accessToken;
			start();
		}, onFailure : function(error) {
			console.log("Authentication failed with error: " + error);
		}, onComplete : function() {
			console.log("Authentication finished");
		}
	});
}

function start() {
	if (!playlistModel) {
		playlistModel = new models.Playlist();
		var list = new views.List(playlistModel);	
		$('#playlist').append(list.node);
	}
	
	makeFBAjaxCall("https://graph.facebook.com/me/friends",
		function(myfriends) {
			friends = myfriends.shuffle();
			getMusic();
  	    }, function() {
			authenticate();
		}
	);	
}

function getMusic() {
	songTimer = setTimeout(function() {
		requestSongs(0, TOTAL_SONG_POSTS, {});
	}, SONG_RATE);
}

function requestSongs(i, songsLeft, songs) {
	if (i <= friends.length && songsLeft > 0) {
		clearTimeout(songTimer);
		songTimer = null;
		makeFBAjaxCall("https://graph.facebook.com/" + friends[i].id + "/music.listens",
			function(data, paging) {
				if (data.length) {
					var index = Math.min(SONGS_PER_PERSON, data.length);
					songsLeft -= index;
					songs[data[0].from.id] = data.slice(0, index - 1);
				}
				songTimer = setTimeout(function() {
					requestSongs(i + 1, songsLeft, songs);
				}, SONG_RATE);
			}, function() {
				console.log("Could not get songs by friend failure");
			}
		);
	} else {
		filterSongs(songs);
	}
}

function filterSongs(friendSongs) {
	var newSongs = [];
	var seen = JSON.parse(localStorage.seen);
	var heard = JSON.parse(localStorage.heard);
	$.each(friendSongs, function(friend, songs) {
		$.each(songs, function(idx, s) {
			try {
				if (seen.indexOf(s.id) == -1) {
					var songId = s.data.song.id;
					var songTitle = s.data.song.title;
					var time = s.start_time;
					var friend = s.from.name;
					if (!heard[songId]) {
						console.log('Song (' + songId + ') ' + songTitle + ' accepted from ' + friend);
						newSongs.push({
							stamp: time,
							from: friend,
							id: songId,
							title: songTitle
						});	
						heard[songId] = [friend];
					} else {
						console.log('Ignoring duplicate song (' + songId + '): ' + songTitle);
						heard[songId].push(friend);
					}
					seen.push(s['id']);
				} else {
					console.log('Ignoring duplicate post ' + s['id']);
				}
			} catch(e) {
				console.log('Problem parsing listen post', e, s);
			}
		});
	});
	console.log('Number of accepted songs ' + newSongs.length);
	newSongs.sort(function(s1, s2) {
		return (new Date(s1['stamp'])) < (new Date(s2['stamp']));
	});
	for (var i = 0; i < Math.min(TOTAL_NUM_SONGS, newSongs.length); i++) {
		addSong(newSongs[i]);
	}
	localStorage.heard = JSON.stringify(heard);
	localStorage.seen = JSON.stringify(seen);
}

function addSong(songObj) {
	var search = new models.Search(songObj['title']);
	search.localResults = models.LOCALSEARCHRESULTS.APPEND;
	search.observe(models.EVENT.CHANGE, function() {
		if (search.tracks[0]) {
			console.log("Got track " + search.tracks[0] + ' from ' + songObj['from']);
			addSongToPlaylist(search.tracks[0], songObj);
		}
	});
	search.appendNext();
}

function addSongToPlaylist(track, songObj) {
	if (track) {
		playlistModel.add(track);
		$('#friends ul').append($('<li>').text(songObj.from));
		$('#loader').hide();
		clearInterval(loaderInterval);
		loaderInterval = null;
	}
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

Array.prototype.shuffle = function() {
 	var len = this.length;
	var i = len;
	while (i--) {
	 	var p = parseInt(Math.random()*len);
		var t = this[i];
  		this[i] = this[p];
  		this[p] = t;
 	}
 	return this;
};
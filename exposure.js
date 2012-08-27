/*
Exposure
Authors: Roy McElmurry, Tyler Rigsby, Gabriel Groen, Ambar Choudhury
*/

jQuery(function($) {


	var SPOTIFY_APP_NAME = 'Exposure';
	// The number of song posts to read from FB
	var TOTAL_SONG_POSTS = 100;
	// The number of unique songs to read from FB posts
	var TOTAL_NUM_SONGS = 50;
	// The number of songs to parse from a given FB friend
	var SONGS_PER_PERSON = 8;
	// The rate in milliseconds that we make api requests
	var SONG_RATE = 50;
	// How quickly does the loader spin
	var LOADER_SPEED = 100;

	// Spotify API objects
	sp = getSpotifyApi(1);
	models = sp.require('sp://import/scripts/api/models');
	auth = sp.require('sp://import/scripts/api/auth');
	views = sp.require('sp://import/scripts/api/views');

	var fbAccess;
	var player = models.player;
	var playlistModel;

	var friendsChecked = 0;
	var friends;
	var sortStyle;

	$('#throbber').hide();
	localStorage.clear();

	if (!localStorage.heard) {
		localStorage.heard = JSON.stringify({});
	}
	if (!localStorage.seen) {
		localStorage.seen = JSON.stringify([]);
	}

	$('#goButton').click(function() {
        $('#instructions').hide();
        $('#throbber').show();
        $('#throbber span').text('Authenticating');
		$(this).addClass('small');
		authenticate();
	});

	// Set default sort style
	$('#sortStyles div:last-child').addClass('chosen');
	sortStyle = 1;
	$('#sortStyles div').click(function() {
		$('#sortStyles div').removeClass('chosen');
		$(this).addClass('chosen');
		sortStyle = parseInt($(this).text());
	});

	player.observe(models.EVENT.CHANGE, function(e) {
		if (player.track != null) {
			$('#trackInfo')
				.text('Playing: ' + player.track.name);
		} else {
			$('#trackInfo').empty();
		}
	});

	function authenticate() {
		auth.authenticateWithFacebook('345161178882446',
				['friends_status', 'friends_actions.music'], {
			onSuccess : function(accessToken, ttl) {
				console.log("Authentication Success! Here's the access token: " + accessToken);
				fbAccess = accessToken;
				getFriendsData();
			}, onFailure : function(error) {
				console.log("Authentication failed with error: " + error);
			}, onComplete : function() {
				console.log("Authentication finished");
			}
		});
	}

	function getFriendsData() {
		$('#throbber span').text('Creeping');
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
		setTimeout(function() {
			requestSongs(0, TOTAL_SONG_POSTS, new SongList());
		}, SONG_RATE);
	}

	function requestSongs(i, songsLeft, songList) {
		if (i <= friends.length && songsLeft > 0) {
			makeFBAjaxCall("https://graph.facebook.com/" + friends[i].id + "/music.listens",
				function(data, paging) {
					$('#throbber span').text(
						'Stalking Friends (' +
						parseInt(((TOTAL_SONG_POSTS - songsLeft) / TOTAL_SONG_POSTS) * 100) +
						'%)'
					);
					if (data.length) {
						var index = Math.min(SONGS_PER_PERSON, data.length);
						songsLeft -= index;
						parseSongData(data.slice(0, index - 1), songList);
					}
					setTimeout(function() {
						requestSongs(i + 1, songsLeft, songList);
					}, SONG_RATE);
				}, function() {
					console.log("Could not get songs by friend failure");
				}
			);
		} else {
			filterSongs(songList);
		}
	}

	function parseSongData(songs, songList) {
		$.each(songs, function(idx, s) {
			try {
				songList.add({
					ts: new Date(s.publish_time),
					friendName: s.from.name,
					friendID: s.from.id,
					songID: s.data.song.id,
					songTitle: s.data.song.title
				});
			} catch(e) {
				console.log('Problem parsing song post', e, s, songList);
			}
		});
	}

	// Parses all of the FB posts and filters out duplicate songs and songs that have already been heard.
	function filterSongs(songList) {
		$('#throbber span').text('Filtering');
		var seen = JSON.parse(localStorage.seen);
		var heard = JSON.parse(localStorage.heard);

		var songs = [];
		$.each(songList.list, function(idx, s) {
			if (seen.indexOf(s.songID) == -1) {
				if (!heard[s.songID]) {
					songs.push(s);
					heard[s.songID] = [s.friendID];
				} else {
					console.log('Ignoring duplicate song (' + s.songID + '): ' + s.songTitle);
					heard[s.songID].push(s.friendID);
				}
				seen.push(s['id']);
			} else {
				console.log('Ignoring duplicate post ' + s['id']);
			}
		});

		songList.list = songs;

		console.log('Number of accepted songs ' + songList.size());
		//songList.sortBy('ts');
		songList.shuffle();

		displaySongs(songList);

		localStorage.heard = JSON.stringify(heard);
		localStorage.seen = JSON.stringify(seen);
	}

	function getTimeString(diffmillis) {
		if (diffmillis < 1000) {
			return 'Just now';
		} else if (diffmillis < 1000 * 60 * 60) {
			return parseInt(diffmillis / (1000 * 60)) + ' Minutes Ago';
		} else if (diffmillis < 1000 * 60 * 60 * 24) {
			return parseInt(diffmillis / (1000 * 60 * 60)) + ' Hours Ago';
		} else if (diffmillis < 1000 * 60 * 60 * 24 * 100) {
			return parseInt(diffmillis / (1000 * 60 * 60 * 24)) + ' Days Ago';
		} else {
			return 'A While Ago';
		}
	}

	function displaySongs(songList) {
		if (!playlistModel) {
			playlistModel = new models.Playlist();
			var playlistView = new views.List(playlistModel, function(track) {
				var exposureData = songList.findBy('uri', track.data.uri);
				var trackView = new views.Track(track,
						views.Track.FIELD.NAME |
           				views.Track.FIELD.ARTIST |
           				views.Track.FIELD.DURATION |
           				views.Track.FIELD.ALBUM);
				if (exposureData.length) {
					exposureData = exposureData[0];

					//inject name field
					var name = document.createTextNode(
						exposureData.friendName + ' (' +
						getTimeString((new Date()).diff(exposureData.ts)) +
						')'
					);

					//inject facebook profile pic
					var img = document.createElement('img');
					img.src = 'https://graph.facebook.com/' + exposureData.friendID + '/picture';
					img.className = 'friendPic';
					img.alt = 'facebook profile picture of ' + exposureData.friendName;

					var span = document.createElement('span');
					span.appendChild(img);
					span.appendChild(name);

					trackView.node.insertBefore(span, trackView.node.firstChild);
				}
				return trackView;
			});
			$('#playlist').append(playlistView.node);
		}

		getSpotifySongs(0, songList.list);
	}

	function getSpotifySongs(i, songs) {
		if (i < songs.length) {
			$('#throbber span').text(
				'Finding Songs (' +
				parseInt((i / songs.length) * 100) +
				'%)'
			);
			var search = new models.Search(songs[i].songTitle);
			search.localResults = models.LOCALSEARCHRESULTS.APPEND;
			search.observe(models.EVENT.CHANGE, function() {
				var firstResult = search.tracks[0];
				if (firstResult) {
					songs[i].uri = firstResult.data.uri;
					playlistModel.add(firstResult);
				} else {
					console.log('ERROR: no song found for ' + songs[i].songTitle, songs[i], search);
				}
				getSpotifySongs(i + 1, songs);
			});
			search.appendNext();
		} else {
			songList = songs;
			$.each(songs, function(idx, e) {
				console.log(e.ts);
			});
			$('#throbber').hide();
			$('#throbber span').empty();
		}
	}

	/*
		Makes an fb call on url. When it completes it will call one of the handlers,
		which should have the following signatures.

		void success(data, paging_info);
		void failure(xhr, status);
	*/
	function makeFBAjaxCall(url, success, failure, options) {
		var defaults = $.extend({
		        url: url,
				data: {access_token: fbAccess},
				dataType: "json"
		    }, options
		);
		$.ajax(defaults)
			.done(function(data) {
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

	Date.prototype.diff = function(other) {
		return this.getTime() - other.getTime();
	}

	function SongList() {
		this.list = [];
	}

	SongList.prototype.size = function() {
		return this.list.length;
	}

	SongList.prototype.add = function(songData) {
		this.list.push(songData);
	}

	SongList.prototype.findBy = function(field, value) {
		var items = [];
		$.each(this.list, function(idx, song) {
			if (song[field] && song[field] === value) {
				items.push(song);
			}
		});
		return items.length ? items : null;
	}

	SongList.prototype.sortBy = function(field) {
		console.log(this.list);
		this.list.sort(function(s1, s2) {
			return s1[field] < s2[field];
		});
	}

	SongList.prototype.shuffle = function() {
		this.list.shuffle();
		return this;
	}

	SongList.prototype.remove = function(idx) {
		if (idx >= this.list.length) {
			console.log('ERROR: tried to remove ' + idx + ', but list has only ' + this.list.length);
		}
		return this.list.splice(idx, 1);
	}
});

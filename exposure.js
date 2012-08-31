/*
Exposure, a social music discovery Spotify app
Origanal Authors: Roy McElmurry, Tyler Rigsby, Gabriel Groen, Ambar Choudhury
Major overhaul by Roy McElmurry and Gabriel Groen
*/

jQuery(function($) {
	"use strict";
	jQuery.error = console.error;

	var DEBUG = true;

	var SPOTIFY_APP_NAME = 'Exposure';
	// The number of unique songs to read from FB posts
	var TOTAL_NUM_SONGS = DEBUG ? 10 : 50;
	// The number of songs to parse from a given FB friend
	var SONGS_PER_PERSON = 4;
	// The rate in milliseconds that we make api requests
	var SONG_RATE = 100;

	// Spotify API objects
	var sp = getSpotifyApi(1);
	var models = sp.require('sp://import/scripts/api/models');
	var auth = sp.require('sp://import/scripts/api/auth');
	var views = sp.require('sp://import/scripts/api/views');

	// facebook access token and access token expiration date
	var fbAccess;
	var fbAccessTtl;

	// the spotify player model object and the spotify playlist instance
	var player = models.player;
	var playlistModel;

	// exposure specific metadata about songs in playlist
	var songList = [];
	var sortStyle;

	// temp data for remembering which songs have been heard and which posts have been seen
	var seen;
	var heard;

	$('#throbber').hide();
	$('#trackInfo').hide();

	if (DEBUG) {
		localStorage.clear();
	}

	// Initialize the playlist when the go or refresh buttons are clicked
	$('#goButton, #refresh').click(function() {
		playlistModel = new models.Playlist();
		var playlistView = new views.List(playlistModel, function(track) {
			var exposureData = findBy(songList, 'uri', track.data.uri);
			var trackView = new views.Track(track,
					views.Track.FIELD.STAR |
					views.Track.FIELD.SHARE |
					views.Track.FIELD.NAME |
       				views.Track.FIELD.ARTIST |
       				views.Track.FIELD.DURATION);

			//inject heard time column
			var heardTime = document.createTextNode(getTimeString((new Date()).diff(exposureData.ts)));

			var heardSpan = document.createElement('span');
			heardSpan.className = 'sp-track-field-heard';
			heardSpan.appendChild(heardTime);

			trackView.node.insertBefore(heardSpan, trackView.node.lastChild);

			//inject friend column
			var friend = document.createTextNode(exposureData.friendName);

			var friendImg = document.createElement('img');
			friendImg.src = exposureData.friendPic;
			friendImg.className = 'friendPic';
			friendImg.alt = 'facebook profile picture of ' + exposureData.friendName;

			var friendSpan = document.createElement('span');
			friendSpan.className = 'sp-track-field-friend';
			friendSpan.appendChild(friendImg);
			friendSpan.appendChild(friend);

			trackView.node.insertBefore(friendSpan, trackView.node.firstChild.nextSibling.nextSibling);

			return trackView;
		});

		// creating the column headers ui
		var columnHeaderData = [
			{'className': 'star', 'text': ''},
			{'className': 'share', 'text': ''},
			{'className': 'friend', 'text': 'Friend'},
			{'className': 'name', 'text': 'Title'},
			{'className': 'artist', 'text': 'Artist'},
			{'className': 'heard', 'text': 'Heard'},
			{'className': 'duration', 'text': 'Time'},
		];

		var headers = document.createElement('div');
		headers.className = 'sp-item';

		var headersList = document.createElement('div');
		headersList.className = 'sp-list';
		headersList.id = 'sp-headers';
		headersList.appendChild(headers);

		$.each(columnHeaderData, function(idx, column) {
			var span = document.createElement('span');
			span.className = 'sp-track-field-' + column.className;
			span.innerHTML = column.text;
			headers.appendChild(span);
		});

		$('#playlist')
			.empty()
			.append(headersList)
			.append(playlistView.node);

		seen = localStorageGetJSON('seen');
		heard = localStorageGetJSON('heard');
        $('#instructions').hide();
        $('#throbber').show();
        $('header').removeClass('startHeader');
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

	// Add album widget when a new song is started
	player.observe(models.EVENT.CHANGE, function(e) {
		console.log('Player Event:', e);
		$('#trackInfo').show();
		if (player.track != null) {
			var exposureData = findBy(songList, 'uri', player.track.data.uri);
			console.log(player.track, exposureData);

			var overallWrapper = $('<div>').hide();

			var positioningWrapper = $('<div>')
				.addClass('albumWrapper')
				.append($('<img>', {
					'class': 'albumArt',
					'src': player.track.data.album.cover,
					'alt': 'album art'
				}))
				.hover(function() {
					$(this).find('.contentWrapper').toggleClass('invisible');
				}, function() {
					$(this).find('.contentWrapper').toggleClass('invisible');
				})
				.appendTo(overallWrapper);

			var profilePicDiv = $('<div>')
				.addClass('profilePicWrapper')
				.append(
					$('<img>', {
						'src': exposureData.friendPic + '?type=normal',
						'class': 'albumFriendPic',
						'alt': 'fb profile pic'
					})
				);

			var contentWrapper = $('<div>')
					.addClass('contentWrapper')
					.toggleClass('invisible', 3000)
					.append(profilePicDiv)
					.append($('<h3>').text(exposureData.friendName))
					.append($('<h2>').text(player.track.data.name))
					.append($('<h3>').text(player.track.data.artists[0].name))
					.appendTo(positioningWrapper);

			$('#trackInfo').prepend(overallWrapper);
			overallWrapper.fadeIn('slow');
		}
	});

	// Login with facebook if we need to
	function authenticate() {
		if (!fbAccess|| fbAccessTtl < (new Date())) {
			auth.authenticateWithFacebook('345161178882446',
					['friends_status', 'friends_actions.music'], {
				onSuccess : function(accessToken, ttl) {
					console.log("Authentication Success! Here's the access token: ", accessToken);
					fbAccess = accessToken;
					fbAccessTtl = ttl;
					getFriendsData();
				}, onFailure : function(error) {
					console.log("Authentication failed with error: " + error);
				}, onComplete : function() {
					console.log("Authentication finished");
				}
			});
		} else {
			getFriendsData();
		}
	}

	// get the list of facebook friends
	function getFriendsData() {
		$('#throbber span').text('Creeping On You');
		makeFBAjaxCall("https://graph.facebook.com/me/friends",
			function(myfriends) {
				var friends = myfriends.shuffle();
				getMusicPosts(friends);
	  	    }, function() {
				authenticate();
			}
		);
	}

	// run through each friend in turn gathering the 'listens' posts and adding them to the list
	function getMusicPosts(friends) {
		setTimeout(function() {
			getPostsFromFriend(friends, 0, 0);
		}, SONG_RATE);
	}

	// gets 'listens' posts for a particular friend and adds them to the list
	// if they meet the current filter criteria
	// TODO: don't ignore 'listens' paging
	function getPostsFromFriend(friends, i, songsFound) {
		if (i < friends.length && songsFound <= TOTAL_NUM_SONGS) {
			makeFBAjaxCall("https://graph.facebook.com/" + friends[i].id + "/music.listens",
				function(data, paging) {
					var index = 0;
					while (index < data.length) {
						var songData = parseSongPost(data[index]);
						if (!filterSong(songData)) {
							songsFound += index;
							$('#throbber span').text(
								'Stalking Friends (' +
								parseInt((songsFound / TOTAL_NUM_SONGS) * 100) +
								'%)'
							);
							songList.push(songData);
						}
						if (moveOn(index, friends[i])) {
							break;
						} else {
							index++;
						}
					}
					setTimeout(function() {
						getPostsFromFriend(friends, i + 1, songsFound);
					}, SONG_RATE);
				}, function() {
					console.log("Could not get songs by friend failure");
				}
			);
		} else {
			displaySongs();
		}
	}

	// returns an exposure metadata object given a facebook 'listens' post object
	// returns null if anything goes wrong
	function parseSongPost(songPost) {
		try {
			return {
				ts: new Date(songPost.publish_time),
				friendName: songPost.from.name,
				friendID: songPost.from.id,
				friendPic: 'https://graph.facebook.com/' + songPost.from.id + '/picture',
				songID: songPost.data.song.id,
				songTitle: songPost.data.song.title
			};
		} catch(e) {
			console.log('Problem parsing song post', e, songPost, songList);
			return null;
		}
	}

	// returns whether the search for songs should move on to the next friend
	// or continue with the current friend
	function moveOn(idx, friend) {
		return idx >= SONGS_PER_PERSON;
	}

	// returns false if the given song should be added from the list
	// returns true if the given song should be filtered from the list
	function filterSong(songData) {
		if (!seen[songData.songID]) {
			if (!heard[songData.songID]) {
				heard[songData.songID] = [songData.friendID];
				return false;
			} else {
				console.log('Filtered duplicate song:', songData, heard);
				heard[songData.songID].push(songData.friendID);
			}
			seen.push(songData.songID);
		} else {
			console.log('Filtered duplicate facebook post:', songData, seen);
		}
		return true;
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

	function displaySongs() {
		getSpotifySongs(0);
	}

	function getSpotifySongs(i) {
		if (i < songList.length) {
			$('#throbber span').text(
				'Finding Songs (' +
				parseInt((i / songList.length) * 100) +
				'%)'
			);
			var search = new models.Search(songList[i].songTitle);
			search.localResults = models.LOCALSEARCHRESULTS.APPEND;
			search.observe(models.EVENT.CHANGE, function() {
				var firstResult = search.tracks[0];
				if (firstResult) {
					songList[i].uri = firstResult.data.uri;
					playlistModel.add(firstResult);
				} else {
					console.log('ERROR: no song found for ' + songList[i].songTitle, songList[i], search);
				}
				getSpotifySongs(i + 1, songList);
			});
			search.appendNext();
		} else {
			$('#throbber').hide();
			$('#throbber span').empty();
			localStorageSetJSON('heard', heard);
			localStorageSetJSON('seen', seen);
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

	function localStorageGetJSON(key) {
		return localStorage[key] ? JSON.parse(localStorage[key]) : [];
	}

	function localStorageSetJSON(key, value) {
		localStorage[key] = JSON.stringify(value);
	}

	Array.prototype.shuffle = function() {
	 	var len = this.length;
		var i = len;
		while (i--) {
		 	var p = parseInt(Math.random() * len);
			var t = this[i];
	  		this[i] = this[p];
	  		this[p] = t;
	 	}
	 	return this;
	};

	Date.prototype.diff = function(other) {
		return this.getTime() - other.getTime();
	}

	function findBy(list, field, value) {
		var item = null;
		$.each(list, function(idx, song) {
			if (song[field] && song[field] === value) {
				item = song;
				return false;
			}
		});
		return item;
	}

	function sortBy(list, field) {
		console.log(list);
		list.sort(function(s1, s2) {
			return s1[field] < s2[field];
		});
	}
});

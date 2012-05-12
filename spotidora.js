var sp = getSpotifyApi(1);
var models = sp.require('sp://import/scripts/api/models');
var player = models.player;

exports.init = init;

require("auth");
require("https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js");

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
        url: "http://graph.facebook.com/me/friends",
	data: {access_token: fbAccess}
    }).done(function(data) {
	    $('body').append(data);
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
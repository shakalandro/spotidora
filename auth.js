var auth = p.require('sp://import/scripts/api/auth');

auth.authenticateWithFacebook('345161178882446', ['friends_status',
												  'friends_actions.music'
												  'user_actions.music'], {
	onSuccess : function(accessToken, ttl) {
		console.log("Success! Here's the access token: " + accessToken);
	},

	onFailure : function(error) {
		console.log("Authentication failed with error: " + error);
	},

	onComplete : function() { }
});
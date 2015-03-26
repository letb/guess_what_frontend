
// Router works only with views

define([
	'backbone',
	'views/scoreboard',
	'views/main',
	'views/game',
	'views/login'
], function(
	Backbone,
	scoreboardView,
	mainView,
	gameView,
	loginView
) {
	var Router = Backbone.Router.extend({
		routes: {
			'scoreboard': 'scoreboardAction',
			'game': 'gameAction',
			'login': 'loginAction',
			'*default': 'defaultActions'
		},

		scoreboardAction: function() {
			mainView.hide();
			scoreboardView.show();
		},

		gameAction: function() {
			mainView.hide();
			gameView.show();
		},

		loginAction: function() {
			mainView.hide();
			loginView.show();
		},

		defaultActions: function() {
			scoreboardView.hide();
			gameView.hide();
			loginView.hide();
			mainView.show();
		},
	});

	return new Router();
});

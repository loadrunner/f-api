process.env.TZ = "UTC";
var express = require('express');
var app = express();
var bodyparser = require('body-parser');
var oauth2orize = require('oauth2orize');
var oauth = oauth2orize.createServer();
var passport = require('passport');
var login = require('connect-ensure-login');
var db = require('./db');
var utils = require('./utils');

//resources
var clients = require('./resources/clients.js');
var products = require('./resources/products.js');
var invoices = require('./resources/invoices.js');
var receipts = require('./resources/receipts.js');
var users = require('./resources/users.js');

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(bodyparser.urlencoded({ extended : false }));
app.use(bodyparser.json());
app.use(require('express-session')({ secret : 'big_secret',resave : true, saveUninitialized : true }));
app.use(passport.initialize());
app.use(passport.session());
//app.use(express.errorHandler({ dumpExceptions : true, showStack : true }));

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

app.get('/', function (req, res) {
	res.send('Factori API');
	//res.render('index');
});


var oauthApps = [{
	name : 'test_cl',
	secret : 'big_s'
}];

passport.use(new (require('passport-local').Strategy)(function (username, password, done) {
	db.models.User.findOne({username : username}, function (err, user) {
		if (err)
			return done(err);
		if (!user)
			return done(null, false);
		if (user.password != password)//TODO : use hash!!!
			return done(null, false);
		return done(null, user);
	});
}));


passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	db.models.User.findOne({_id : db.types.ObjectId(id)}, function (err, user) {
		done(err, user);
	});
});

passport.use(new (require('passport-http').BasicStrategy)(
	function(username, password, done) {
		console.log("basicstrategy");
		for (var i = 0; i < oauthApps.length; i++)
			if (oauthApps[i].name == username && oauthApps[i].secret == password)
				return done(null, oauthApps[i]);
		
		return done(null, false);
	}
));

passport.use(new (require('passport-oauth2-client-password').Strategy)(
	function(clientId, clientSecret, done) {
		console.log("clientpassstrategy");
		for (var i = 0; i < oauthApps.length; i++)
			if (oauthApps[i].name == clientId && oauthApps[i].secret == clientSecret)
				return done(null, oauthApps[i]);
		
		return done(null, false);
	}
));

passport.use(new (require('passport-http-bearer').Strategy)(
	function(token, done) {
		db.models.OAuthAccessToken.findOne({token : token}, function(err, token) {
			if (err)
				return done(err);
			if (!token)
				return done(null, false);
			
			db.models.User.findOne({_id : token.user_id}, function(err, user) {
				if (err)
					return done(err);
				
				if (!user)
					return done(null, false);
				
				var info = { scope : '*' }
				done(null, user, info);
			});
		});
	}
));

oauth.serializeClient(function(client, done) {
	return done(null, client.name);
});

oauth.deserializeClient(function(id, done) {
	for (var i = 0; i < oauthApps.length; i++)
		if (oauthApps[i].name == id)
			return done(null, oauthApps[i]);
		
		return done(null, false);
});

oauth.grant(oauth2orize.grant.code(function(client, redirectURI, user, ares, done) {
	console.log("grant auth code");
	var code = utils.uid(16)
	
	var authCode = db.models.OAuthCode({code : code, client_id : client.name, redirect_uri : redirectURI, user_id : user._id});
	authCode.save(function (err, obj) {
		if (err)
			done(err);
		else
			done(null, code);
	});
}));

oauth.exchange(oauth2orize.exchange.code(function(client, code, redirectURI, done) {
	console.log("exchange auth code with token");
	db.models.OAuthCode.findOne({code : code}, function(err, authCode) {
		console.log(authCode);
		console.log(client);
		if (err)return done(err);
		if (authCode === undefined || authCode === null)
			return done(null, false);
		if (client === undefined || client === null || client.name !== authCode.client_id)
			return done(null, false);
	//	if (redirectURI !== authCode.redirectURI) { return done(null, false); }
		authCode.remove(function(err) {
			if(err)
				return done(err);
			var token = utils.uid(256);
			var accessToken = db.models.OAuthAccessToken({token : token, user_id : authCode.user_id, client_id : authCode.client_id});
			accessToken.save(function(err) {
				if (err)
					done(err);
				else
					done(null, token);
			});
		});
	});
}));

oauth.exchange(oauth2orize.exchange.password(function(client, username, password, scope, done) {
	db.models.User.findOne({username : username}, function(err, user) {
		if (err)
			return done(err);
		if (client === undefined || client === null)
			return done(null, false);
		if (user === null)
			return done(null, false);
		if (password !== user.password)
			return done(null, false);
		
		//TODO : implement scope and expire
		var token = utils.uid(256);
		var accessToken = db.models.OAuthAccessToken({token : token, user_id : user._id, client_id : client.id});
		accessToken.save(function(err) {
			if (err)
				done(err);
			else
				done(null, token);
		});
	});
}));

app.get('/oauth/login', function (req, res) {
	res.render('login');
});

app.post('/oauth/login', passport.authenticate('local', { successReturnToOrRedirect : '/oauth/authorize', failureRedirect : '/oauth/login' }));

app.get('/oauth/authorize', login.ensureLoggedIn('/oauth/login'),

oauth.authorization(function(clientId, redirectURI, done) {
	console.log("authxx");
	for (var i = 0; i < oauthApps.length; i++)
			if (oauthApps[i].name == clientId)
				return done(null, oauthApps[i], redirectURI);
	
	return done(null, false);
}),
function(req, res){
	res.render('dialog', { transactionID : req.oauth2.transactionID, user : req.user, client : req.oauth2.client });
});

app.post('/oauth/authorize', /*login.ensureLoggedIn('/oauth/login'), */oauth.decision());

app.post('/oauth/token', passport.authenticate([/*'basic', */'oauth2-client-password'], { session : false }), oauth.token(), oauth.errorHandler());

app.use('/clients', passport.authenticate('bearer', { session : false }), clients.router);
app.use('/products', passport.authenticate('bearer', { session : false }), products.router);
app.use('/invoices', passport.authenticate('bearer', { session : false }), invoices.router);
app.use('/receipts', passport.authenticate('bearer', { session : false }), receipts.router);
app.use('/users', passport.authenticate('bearer', { session : false }), users.router);

app.listen(3000);

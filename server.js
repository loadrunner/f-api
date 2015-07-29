var express = require('express');
var app = express();
var bodyparser = require('body-parser');
var oauth2orize = require('oauth2orize');
var oauth = oauth2orize.createServer();
var passport = require('passport');
var login = require('connect-ensure-login');
var db = require('./db');
var utils = require('./utils');

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


var clients = [{
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
		for (var i = 0; i < clients.length; i++)
			if (clients[i].name == username && clients[i].secret == password)
				return done(null, clients[i]);
		
		return done(null, false);
	}
));

passport.use(new (require('passport-oauth2-client-password').Strategy)(
	function(clientId, clientSecret, done) {
		console.log("clientpassstrategy");
		for (var i = 0; i < clients.length; i++)
			if (clients[i].name == clientId && clients[i].secret == clientSecret)
				return done(null, clients[i]);
		
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
	for (var i = 0; i < clients.length; i++)
		if (clients[i].name == id)
			return done(null, clients[i]);
		
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
//passport.authenticate(['local'], { session : false }),
oauth.authorization(function(clientId, redirectURI, done) {
	console.log("authxx");
	for (var i = 0; i < clients.length; i++)
			if (clients[i].name == clientId)
				return done(null, clients[i], redirectURI);
	
	return done(null, false);
}),
function(req, res){
	res.render('dialog', { transactionID : req.oauth2.transactionID, user : req.user, client : req.oauth2.client });
});

app.post('/oauth/authorize', /*login.ensureLoggedIn('/oauth/login'), */oauth.decision());

app.post('/oauth/token', passport.authenticate([/*'basic', */'oauth2-client-password'], { session : false }), oauth.token(), oauth.errorHandler());

app.get('/first_endpoint', passport.authenticate('bearer', { session : false }), function (req, res) {
	res.json({
		"co" : "fo",
		"user" : req.user
	});
});


var clientsRouter = express.Router();

clientsRouter.get('/', function(req, res, next) {
	db.models.Client.find({
			user_id : req.user._id
	}, function (err, clients) {
		if (err)
			return next(err);
		
		res.json(clients);
	});
});

clientsRouter.post('/', function(req, res, next) {
	db.models.Client.create({
		user_id : req.user._id,
		name    : req.body.name,
		cui     : req.body.cui
	}, function (err, doc) {
		if (err)
			return next(err);
		
		res.json(doc);
	});
});

clientsRouter.get('/:id', function(req, res, next) {
	db.models.Client.findById(req.params.id, function (err, doc) {
		if (err)
			return next(err);
		
		if (!doc.user_id.equals(req.user._id))
			return res.status(404).send('Not found');
		
		res.json(doc);
	});
});

clientsRouter.put('/:id', function(req, res, next) {
	db.models.Client.findById(req.params.id, function (err, doc) {
		if (err)
			return next(err);
		
		if (!doc.user_id.equals(req.user._id))
			return res.status(404).send('Not found');
		
		doc.name = req.body.name;
		doc.cui = req.body.cui;
		
		doc.save(function () {// TODO: maybe check for error
			res.json(doc);
		})
	});
});

clientsRouter.delete('/:id', function(req, res, next) {
	db.models.Client.findById(req.params.id, function (err, doc) {
		if (err)
			return next(err);
		
		if (!doc.user_id.equals(req.user._id))
			return res.status(404).send('Not found');
		
		doc.remove(function () {// TODO: maybe check for error
			res.json(doc);
		});
	});
});

app.use('/clients', passport.authenticate('bearer', { session : false }), clientsRouter);

var invoicesRouter = express.Router();

invoicesRouter.get('/', function(req, res, next) {
	db.models.Invoice.find({
			user_id : req.user._id
	}, function (err, invoices) {
		if (err)
			return next(err);
		
		res.json(invoices);
	});
});

invoicesRouter.post('/', function(req, res, next) {
	if (!req.body)
		return next(err);
	if (!req.body.client_id)
		return next(err);
	
	db.models.Client.findById(req.body.client_id, function (err, client) {
		if (err)
			return next(err);
		
		if (!client.user_id.equals(req.user._id))
			return res.status(400).send('Bad request');
		
		db.models.Invoice.create({
			user_id : req.user._id,
			client  : {
				_id  : client._id,
				name : client.name,
				cui  : client.cui
			},
			number  : req.body.number
		}, function (err, doc) {
			if (err)
				return next(err);
			
			res.json(doc);
		});
	});
});

invoicesRouter.get('/:id', function(req, res, next) {
	db.models.Invoice.findById(req.params.id, function (err, doc) {
		if (err)
			return next(err);
		
		if (!doc.user_id.equals(req.user._id))
			return res.status(404).send('Not found');
		
		res.json(doc);
	});
});

invoicesRouter.put('/:id', function(req, res, next) {
	db.models.Invoice.findById(req.params.id, function (err, invoice) {
		if (err)
			return next(err);
		
		if (!invoice.user_id.equals(req.user._id))
			return res.status(404).send('Not found');
		
		db.models.Client.findById(req.body.client_id, function (err, client) {
			if (err)
				return next(err);
			
			if (!invoice.user_id.equals(req.user._id))
				return res.status(400).send('Bad request');
			
			invoice.number = req.body.number;
			
			invoice.save(function () {// TODO: maybe check for error
				res.json(invoice);
			})
		});
	});
});

invoicesRouter.delete('/:id', function(req, res, next) {
	db.models.Invoice.findById(req.params.id, function (err, doc) {
		if (err)
			return next(err);
		
		if (!doc.user_id.equals(req.user._id))
			return res.status(404).send('Not found');
		
		doc.remove(function () {// TODO: maybe check for error
			res.json(doc);
		});
	});
});

app.use('/invoices', passport.authenticate('bearer', { session : false }), invoicesRouter);

var usersRouter = express.Router();

usersRouter.get('/', function(req, res, next) {
	db.models.User.find({
			_id : req.user._id //TODO: maybe add admin rights
	}, function (err, clients) {
		if (err)
			return next(err);
		
		res.json(clients);
	});
});

usersRouter.get('/me', function(req, res, next) {
	db.models.User.findById(req.user._id, function (err, doc) {
		if (err)
			return next(err);
		
		res.json(doc);
	});
});

app.use('/users', passport.authenticate('bearer', { session : false }), usersRouter);

app.listen(3000);

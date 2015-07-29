var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/facturi');
var db = mongoose.connection;
db.on('error', function (err) {
	console.log("MongoDB error: %s", err);
	process.code(1);
});

var models = {};

var OAuthCodeSchema = mongoose.Schema({
	code         : String,
	client_id    : String, //oauth client
	redirect_uri : String,
	user_id      : mongoose.Schema.Types.ObjectId
});
models.OAuthCode = mongoose.model('OAuthCode', OAuthCodeSchema);

var OAuthAccessTokenSchema = mongoose.Schema({
	token     : String,
	client_id : String, //oauth client
	user_id   : mongoose.Schema.Types.ObjectId
});
models.OAuthAccessToken = mongoose.model('OAuthAccessToken', OAuthAccessTokenSchema);

var UserSchema = mongoose.Schema({
	_id        : { type : mongoose.Schema.Types.ObjectId, auto: true },
	username   : String,
	password   : String,
	email      : String,
	first_name : String,
	last_name  : String,
	phone      : String
});
models.User = mongoose.model('User', UserSchema);

var ClientSchema = mongoose.Schema({
	_id     : { type : mongoose.Schema.Types.ObjectId, auto: true },
	user_id : mongoose.Schema.Types.ObjectId,
	name    : String,
	cui     : String
});
models.Client = mongoose.model('Client', ClientSchema);

exports.connection = db;
exports.models = models;
exports.types = mongoose.Types;

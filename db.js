var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/facturi');
var db = mongoose.connection;
db.on('error', function (err) {
	console.log("MongoDB error: %s", err);
	process.code(1);
});

var models = {};

var AuthorizationCodeSchema = mongoose.Schema({
	code: String,
	client_id: String,
	redirect_uri: String,
	user_id: String
});
models.AuthorizationCode = mongoose.model('AuthorizationCode', AuthorizationCodeSchema);

var AccessTokenSchema = mongoose.Schema({
	token: String,
	client_id: String,
	user_id: String
});
models.AccessToken = mongoose.model('AccessToken', AccessTokenSchema);

var UserSchema = mongoose.Schema({
	username: String,
	password: String
});
models.User = mongoose.model('User', UserSchema);

var ClientSchema = mongoose.Schema({
	name: String
});
models.Client = mongoose.model('Client', ClientSchema);

exports.connection = db;
exports.models = models;
exports.types = mongoose.Types;

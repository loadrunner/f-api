var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/facturi');
var db = mongoose.connection;
db.on('error', function (err) {
	console.log("MongoDB error: %s", err);
	if (err)
		return;
	
	process.code(1);
});

var timestampPlugin = function (schema, options) {
	schema.add({
		created_at : { type: Date },
		updated_at : { type: Date }
	});
	
	schema.pre('save', function (next) {
		var now = Date.now();
		
		if (!this.created_at)
			this.created_at = now;
		
		this.updated_at = now;
		
		next();
	});
};

var models = {};

var OAuthCodeSchema = mongoose.Schema({
	code         : String,
	client_id    : String, //oauth client
	redirect_uri : String,
	user_id      : mongoose.Schema.Types.ObjectId
});
OAuthCodeSchema.plugin(timestampPlugin);
models.OAuthCode = mongoose.model('OAuthCode', OAuthCodeSchema);

var OAuthAccessTokenSchema = mongoose.Schema({
	token     : String,
	client_id : String, //oauth client
	user_id   : mongoose.Schema.Types.ObjectId
});
OAuthAccessTokenSchema.plugin(timestampPlugin);
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
UserSchema.plugin(timestampPlugin);
models.User = mongoose.model('User', UserSchema);

var ClientSchema = mongoose.Schema({
	_id          : { type : mongoose.Schema.Types.ObjectId, auto : true },
	user_id      : { type : mongoose.Schema.Types.ObjectId, required : true },
	name         : { type : String, required : true, minlength : 2, maxlength : 100 },
	cif          : { type : String, required : true },
	address      : { type : String, required : false, minlength : 0, maxlength : 100 },
	city         : { type : String, required : true, minlength : 3, maxlength : 50 },
	county       : { type : String, required : true, minlength : 2, maxlength : 50 },
	country      : { type : String, required : true, minlength : 2, maxlength : 50 },
	bank_name    : { type : String, required : false, minlength : 0, maxlength : 50 },
	bank_account : { type : String, required : false, minlength : 0, maxlength : 50 }
});
ClientSchema.plugin(timestampPlugin);
models.Client = mongoose.model('Client', ClientSchema);
models.Client.schema.path('cif').validate(function (value) {
	return /^(RO)?([0-9]{5,14})$/i.test(value);
}, 'Invalid CIF');

var ProductSchema = mongoose.Schema({
	_id     : { type : mongoose.Schema.Types.ObjectId, auto: true },
	user_id : mongoose.Schema.Types.ObjectId,
	name    : String,
	price   : Number
});
ProductSchema.plugin(timestampPlugin);
models.Product = mongoose.model('Product', ProductSchema);

var InvoiceSchema = mongoose.Schema({
	_id      : { type : mongoose.Schema.Types.ObjectId, auto: true },
	user_id  : mongoose.Schema.Types.ObjectId,
	client   : {
		_id          : { type : mongoose.Schema.Types.ObjectId, required : false },
		name         : { type : String, required : true, minlength : 2, maxlength : 100 },
		cif          : { type : String, required : true },
		address      : { type : String, required : false, minlength : 0, maxlength : 100 },
		city         : { type : String, required : true, minlength : 3, maxlength : 50 },
		county       : { type : String, required : true, minlength : 2, maxlength : 50 },
		country      : { type : String, required : true, minlength : 2, maxlength : 50 },
		bank_name    : { type : String, required : false, minlength : 0, maxlength : 50 },
		bank_account : { type : String, required : false, minlength : 0, maxlength : 50 }
	},
	code     : { type : String, required: true },
	number   : { type : Number, required: true },
	date     : { type : Date, required: true },
	due_date : { type : Date, required: true },
	products : [{
		_id      : { type : mongoose.Schema.Types.ObjectId, required : false },
		name     : { type : String, required: true, minlength : 1, maxlength : 100 },
		price    : { type : Number, required: true, min : 0 },
		quantity : { type : Number, required: true, min : 0 },
	}],
	author_name   : { type : String, required: false },
	author_id     : { type : String, required: false },
	delegate_name : { type : String, required: false },
	delegate_id   : { type : String, required: false },
	transport     : { type : String, required: false }
});
InvoiceSchema.plugin(timestampPlugin);
models.Invoice = mongoose.model('Invoice', InvoiceSchema);
models.Invoice.schema.path('client.cif').validate(function (value) {
	return /^(RO)?([0-9]{5,14})$/i.test(value);
}, 'Invalid CIF');

var ReceiptSchema = mongoose.Schema({
	_id        : { type : mongoose.Schema.Types.ObjectId, auto: true },
	user_id    : { type : mongoose.Schema.Types.ObjectId, required : true },
	invoice_id : { type : mongoose.Schema.Types.ObjectId, required : false },
	client     : {
		_id          : { type : mongoose.Schema.Types.ObjectId, required : false },
		name         : { type : String, required : true, minlength : 2, maxlength : 100 },
		cif          : { type : String, required : true },
		address      : { type : String, required : false, minlength : 0, maxlength : 100 },
		city         : { type : String, required : true, minlength : 3, maxlength : 50 },
		county       : { type : String, required : true, minlength : 2, maxlength : 50 },
		country      : { type : String, required : true, minlength : 2, maxlength : 50 }
	},
	code        : { type : String, required: true },
	number      : { type : Number, required: true },
	date        : { type : Date, required: true },
	value       : { type : Number, required: true, min : 0.0001 },
	description : { type : String, required: false }
});
ReceiptSchema.plugin(timestampPlugin);
models.Receipt = mongoose.model('Receipt', ReceiptSchema);
models.Receipt.schema.path('client.cif').validate(function (value) {
	return /^(RO)?([0-9]{5,14})$/i.test(value);
}, 'Invalid CIF');

exports.connection = db;
exports.models = models;
exports.types = mongoose.Types;

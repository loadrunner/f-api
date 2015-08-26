var express = require('express');
var db = require('../db');

var router = express.Router();

router.get('/', function(req, res, next) {
	db.models.User.find({
		_id : req.user._id //TODO: add admin rights requirement
	}, function (err, users) {
		if (err)
			return next(err);
		
		res.json(users);
	});
});

router.get('/me', function(req, res, next) {
	db.models.User.findById(req.user._id, function (err, doc) {
		if (err)
			return next(err);
		
		res.json(doc);
	});
});

exports.router = router;

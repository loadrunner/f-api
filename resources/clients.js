var express = require('express');
var db = require('../db');

var router = express.Router();

router.get('/', function(req, res, next) {
	db.models.Client.find({
		user_id : req.user._id
	}, function (err, clients) {
		if (err)
			return next(err);
		
		res.json(clients);
	});
});

router.post('/', function(req, res, next) {
	db.models.Client.create({
		user_id      : req.user._id,
		name         : req.body.name,
		cif          : req.body.cif,
		address      : req.body.address,
		city         : req.body.city,
		county       : req.body.county,
		country      : req.body.country,
		bank_name    : req.body.bank_name,
		bank_account : req.body.bank_account
	}, function (err, doc) {
		if (err) {
			var result = {
				message : err.message,
				errors  : []
			};
			
			for (var key in err.errors)
				result.errors.push(err.errors[key].message);
			
			return res.status(400).json(result);
		}
		
		res.json(doc);
	});
});

router.get('/:id', function(req, res, next) {
	db.models.Client.findById(req.params.id, function (err, doc) {
		if (err)
			return next(err);
		
		if (!doc.user_id.equals(req.user._id))
			return res.status(404).send('Not found');
		
		res.json(doc);
	});
});

router.put('/:id', function(req, res, next) {
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

router.delete('/:id', function(req, res, next) {
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

exports.router = router;

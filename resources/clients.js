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
		user_id : req.user._id,
		name    : req.body.name,
		cui     : req.body.cui
	}, function (err, doc) {
		if (err)
			return next(err);
		
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

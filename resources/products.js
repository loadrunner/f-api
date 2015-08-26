var express = require('express');
var db = require('../db');

var router = express.Router();

router.get('/', function(req, res, next) {
	db.models.Product.find({
		user_id : req.user._id
	}, function (err, products) {
		if (err)
			return next(err);
		
		res.json(products);
	});
});

router.post('/', function(req, res, next) {
	db.models.Product.create({
		user_id : req.user._id,
		name    : req.body.name,
		price   : req.body.price
	}, function (err, doc) {
		if (err)
			return next(err);
		
		res.json(doc);
	});
});

router.get('/:id', function(req, res, next) {
	db.models.Product.findById(req.params.id, function (err, doc) {
		if (err)
			return next(err);
		
		if (!doc.user_id.equals(req.user._id))
			return res.status(404).send('Not found');
		
		res.json(doc);
	});
});

router.put('/:id', function(req, res, next) {
	db.models.Product.findById(req.params.id, function (err, doc) {
		if (err)
			return next(err);
		
		if (!doc.user_id.equals(req.user._id))
			return res.status(404).send('Not found');
		
		doc.name = req.body.name;
		doc.price = req.body.price;
		
		doc.save(function () {// TODO: maybe check for error
			res.json(doc);
		})
	});
});

router.delete('/:id', function(req, res, next) {
	db.models.Product.findById(req.params.id, function (err, doc) {
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

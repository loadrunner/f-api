var express = require('express');
var db = require('../db');
var utils = require('../utils.js');
var router = express.Router();

router.get('/', function(req, res, next) {
	db.models.Receipt.find({ user_id : req.user._id })
	.sort(utils.parseSort(req.query.sort, ['created_at', 'code', 'number', 'value'], { created_at : 1 }))
	.skip(utils.parseOffset(req.query.offset))
	.limit(utils.parseLimit(req.query.limit, 100, 50))
	.exec(function (err, receipts) {
		if (err)
			return next(err);
		
		res.json(receipts);
	});
});

router.post('/', function(req, res, next) {
	if (!req.body)
		return res.status(400);
	if (!req.body.client)
		return res.status(400).send('Invalid client info');
	
	var save = function (client) {
		db.models.Receipt.create({
			user_id     : req.user._id,
			client      : client,
			invoice_id  : req.body.invoice_id,
			code        : req.body.code,
			number      : req.body.number,
			date        : req.body.date,
			value       : req.body.value,
			description : req.body.description
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
	};
	
	var findClient = function () {
		var client = {
			name         : req.body.client.name,
			cif          : req.body.client.cif,
			address      : req.body.client.address,
			city         : req.body.client.city,
			county       : req.body.client.county,
			country      : req.body.client.country
		};
		
		if (req.body.client._id) {
			db.models.Client.findById(req.body.client._id, function (err, doc) {
				if (err || !doc)
					return next(err);
				
				if (!doc.user_id.equals(req.user._id))
					return res.status(400).send('Bad request');
				
				client['_id'] = doc._id;
				save(client);
			});
		} else {
			save(client);
		}
	};
	
	if (req.body.invoice_id) {
		db.models.Invoice.findById(req.body.invoice_id, function (err, doc) {
			if (err || !doc)
				return next(err);
			
			if (!doc.user_id.equals(req.user._id))
				return res.status(400).send('Bad request');
			
			findClient();
		});
	} else {
		findClient();
	}
});

router.get('/:id', function(req, res, next) {
	db.models.Receipt.findById(req.params.id, function (err, doc) {
		if (err)
			return next(err);
		
		if (!doc.user_id.equals(req.user._id))
			return res.status(404).send('Not found');
		
		res.json(doc);
	});
});

router.put('/:id', function(req, res, next) {
	db.models.Receipt.findById(req.params.id, function (err, receipt) {
		if (err)
			return next(err);
		
		if (!receipt.user_id.equals(req.user._id))
			return res.status(404).send('Not found');
		
		var save = function (client) {
			receipt.code        = req.body.code;
			receipt.client      = client;
			receipt.invoice_id  = req.body.invoice_id;
			receipt.number      = req.body.number;
			receipt.date        = req.body.date;
			receipt.value       = req.body.value;
			receipt.description = req.body.description;
			
			receipt.save(function (err, doc) {
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
			})
		};
		
		var findClient = function () {
			var client = {
				name         : req.body.client.name,
				cif          : req.body.client.cif,
				address      : req.body.client.address,
				city         : req.body.client.city,
				county       : req.body.client.county,
				country      : req.body.client.country
			};
			
			if (req.body.client._id) {
				db.models.Client.findById(req.body.client._id, function (err, doc) {
					if (err || !doc)
						return next(err);
					
					if (!receipt.user_id.equals(req.user._id))
						return res.status(400).send('Bad request');
					
					client['_id'] = doc._id;
					save(client);
				});
			} else {
				save(client);
			}
		};
		
		if (req.body.invoice_id) {
			db.models.Invoice.findById(req.body.invoice_id, function (err, doc) {
				if (err || !doc)
					return next(err);
				
				if (!doc.user_id.equals(req.user._id))
					return res.status(400).send('Bad request');
				
				findClient();
			});
		} else {
			findClient();
		}
	});
});

router.delete('/:id', function(req, res, next) {
	db.models.Receipt.findById(req.params.id, function (err, doc) {
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

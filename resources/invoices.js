var express = require('express');
var db = require('../db');

var router = express.Router();

router.get('/', function(req, res, next) {
	db.models.Invoice.find({
		user_id : req.user._id
	}, function (err, invoices) {
		if (err)
			return next(err);
		
		res.json(invoices);
	});
});

router.post('/', function(req, res, next) {
	if (!req.body)
		return res.status(400);
	if (!req.body.client)
		return res.status(400).send('Invalid client info');
	
	var save = function (client) {
		db.models.Invoice.create({
			user_id  : req.user._id,
			client   : client,
			number   : req.body.number,
			date     : req.body.date,
			due_date : req.body.due_date
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
	
	var client = {
		user_id      : req.user._id,
		name         : req.body.client.name,
		cif          : req.body.client.cif,
		address      : req.body.client.address,
		city         : req.body.client.city,
		county       : req.body.client.county,
		country      : req.body.client.country,
		bank_name    : req.body.client.bank_name,
		bank_account : req.body.client.bank_account
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
});

router.get('/:id', function(req, res, next) {
	db.models.Invoice.findById(req.params.id, function (err, doc) {
		if (err)
			return next(err);
		
		if (!doc.user_id.equals(req.user._id))
			return res.status(404).send('Not found');
		
		res.json(doc);
	});
});

router.put('/:id', function(req, res, next) {
	db.models.Invoice.findById(req.params.id, function (err, invoice) {
		if (err)
			return next(err);
		
		if (!invoice.user_id.equals(req.user._id))
			return res.status(404).send('Not found');
		
		var save = function (client) {
			invoice.number        = req.body.number;
			invoice.date          = req.body.date;
			invoice.due_date      = req.body.due_date;
			invoice.client        = client;
			invoice.products      = req.body.products || [];
			invoice.author_name   = req.body.author_name;
			invoice.author_id     = req.body.author_id;
			invoice.delegate_name = req.body.delegate_name;
			invoice.delegate_id   = req.body.delegate_id;
			invoice.transport     = req.body.transport;

			invoice.save(function (err, doc) {
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
		
		var client = {
			user_id      : req.user._id,
			name         : req.body.client.name,
			cif          : req.body.client.cif,
			address      : req.body.client.address,
			city         : req.body.client.city,
			county       : req.body.client.county,
			country      : req.body.client.country,
			bank_name    : req.body.client.bank_name,
			bank_account : req.body.client.bank_account
		};
		
		if (req.body.client._id) {
			db.models.Client.findById(req.body.client._id, function (err, doc) {
				if (err || !doc)
					return next(err);
				
				if (!invoice.user_id.equals(req.user._id))
					return res.status(400).send('Bad request');
				
				client['_id'] = doc._id;
				save(client);
			});
		} else {
			save(client);
		}
	});
});

router.delete('/:id', function(req, res, next) {
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

var products = function(req, res, next) {
	var products = req.body;
	if (!products || !Array.isArray(products) || products.length <= 0)
		return res.status(400).send('Bad request');
	
	db.models.Invoice.findById(req.params.id, function (err, invoice) {
		if (err)
			return next(err);
		
		if (!invoice.user_id.equals(req.user._id))
			return res.status(404).send('Not found');
		
		db.models.Product.find({
			user_id : req.user._id
		}, function (err, allproducts) {
			if (err)
				return next(err);
			
			for (var i = 0; i < products.length; i++) {
				if (products[i]._id) {
					var found = false;
					for (var j = 0; j < allproducts.length; j++)
						if (products[i]._id == allproducts[j]._id) {
							found = true;
							break;
						}
					if (!found)
						return res.status(400).send('Bad request');
				}
			}
			
			invoice.products = products;
			
			invoice.save(function (err, doc) {
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
	});
};
router.post('/:id/products', products);
router.put('/:id/products', products);

exports.router = router;

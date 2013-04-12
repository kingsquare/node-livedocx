(function () {
	'use strict';

	var soap, _, url, async, soapSanitize, queue = [];

	soap = require('soap');
	_ = require('underscore');
	url = 'https://api.livedocx.com/2.1/mailmerge.asmx?wsdl';
	async = require('async');

	//crappy soap client can not hanlde accept empty strings!
	soapSanitize = function (values) {
		var result = { keys: [], values: [] };
		_.each(values, function (value, key) {
			if (_.isNumber(value)) {
				value = String(value);
			}
			if (!_.isString(value)) {
				throw new Error(key + ': ' + value + ' is not a string');
			}
			if (value !== '') {
				result.keys.push(key);
				result.values.push(value);
			}
		});
		return result;
	};

	//crappy soap client can not operate asynchroneous in any way! If encoding is in progress, WAIT for it to finish!
	process.on('message', function(options) {
		var next, log;

		//check, result received!
		if (!options) {
			process.exit();
		}

		next = function (err, fileBuffer) {
			if (err) {
				log('Got error!');
				log(err);
			}
			process.send({
				err: err,
				result: fileBuffer
			});
			//process.exit();
		};

		log = function(message) {
			if (options.debug) {
				console.log(message);
			}
		};

		soap.createClient(url, function(err, client) {
			if (err) {
				return next(err);
			}
			log('Client created');

			client.LogIn({ username: options.username, password: options.password }, function(err) {
				log('Logged in');
				var tasks = [];
				if (err) {
					return next(err);
				}

				//parallel is not support by soap client
				tasks.push(function (callback) {
					client.SetLocalTemplate({
						format: options.templateFormat,
						template: options.template
					}, function (err) {
						log('Set local template')
						callback(err);
					});
				});

				//sanitizing values may fail!
				try {
					// SetBlockFieldValues
					_.each(options.variables, function (value, key) {
						var blockFieldConfig;
						if (_.isArray(value)) {
							blockFieldConfig = {
								blockName: key,
								blockFieldValues: []
							};

							_.each(value, function (subValue) {
								var sanitizedValues = soapSanitize(subValue);
								blockFieldConfig.blockFieldValues.push({
									ArrayOfString: [{
										string: sanitizedValues.keys
									}, {
										string: sanitizedValues.values
									}]
								});
							});

							tasks.push(function (callback) {
								client.SetBlockFieldValues(blockFieldConfig, function (err) {
									log('Set blockFieldConfig for ' + key);
									callback(err);
								});
							});
							delete options.variables[key];
						}
					});
				} catch (e) {
					log(e);
					return next(e);
				}

				// Set the rest of the values
				tasks.push(function (callback) {
					var sanitizedValues;
					log('Starting other values');
					try {
						sanitizedValues = soapSanitize(options.variables);
					} catch (e) {
						if (options.debug) {
							log(e);
						}
						return callback(e);
					}
					client.SetFieldValues({ fieldValues: [{
						ArrayOfString: [{
							string: sanitizedValues.keys
						}, {
							string: sanitizedValues.values
						}]
					}]}, function (err, result) {
						log('Set other values');
						callback(err, result);
					});
				});

				//Go!
				async.series(tasks, function (err) {
					if (err) {

						return next(err);
					}
					log('All prepared!, creating document');
					client.CreateDocument({}, function (err) {
						if (err) {
							return next(err);
						}
						log('Document Created');

						client.RetrieveDocument({ format: options.resultFormat }, function (err, result) {
							if (err) {
								return next(err);
							}
							log('Document Retrieved');

							return next(null, result.RetrieveDocumentResult);
						});
					});
				});
			});
		});
	});
}());

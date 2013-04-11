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
	queue = async.queue(function (options, next) {
		function log(message) {
			if (options.debug) {
				console.log(message);
			}
		}
		log('Starting job');
		log(options);

		soap.createClient(url, function(err, client) {
			if (err) {
				return next(err);
			}
			log('Client created');

			client.LogIn({ username: options.username, password: options.password }, function(err) {
				var tasks = [];
				if (err) {
					return next(err);
				}

				//parallel is not support by soap client
				tasks.push(function (callback) {
					client.SetLocalTemplate({
						format: options.templateFormat,
						template: options.template
					}, callback);
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
									log(client.lastRequest);
									callback(err);
								});
							});
							delete options.variables[key];
						}
					});
				} catch (e) {
					return next(e);
				}

				// Set the rest of the values
				tasks.push(function (callback) {
					var sanitizedValues;
					try {
						sanitizedValues = soapSanitize(options.variables);
					} catch (e) {
						return callback(e);
					}
					client.SetFieldValues({ fieldValues: [{
						ArrayOfString: [{
							string: sanitizedValues.keys
						}, {
							string: sanitizedValues.values
						}]
					}]}, function (err, result) {
						log(client.lastRequest);
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

							return next(null, new Buffer(result.RetrieveDocumentResult, 'base64'));
						});
					});
				});
			});
		});
	}, 1);

	module.exports = function (options, next) {
		options.variables = options.variables || {};
		options.templateFormat = options.templateFormat || 'DOCX';
		options.resultFormat = options.resultFormat || 'PDF';
		queue.push(options, next);
	};
}());

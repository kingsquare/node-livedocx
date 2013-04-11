var soap , _, url, async;

soap = require('soap');
_ = require('underscore');
url = 'https://api.livedocx.com/2.1/mailmerge.asmx?wsdl';
async = require('async');

module.exports = exports = function (options, next) {

	function log(arguments) {
		if (options.debug) {
			console.log(arguments);
		}
	}

	options.variables = options.variables || {};
	options.templateFormat = options.templateFormat || 'DOCX';
	options.resultFormat = options.resultFormat || 'PDF';

	soap.createClient(url, function(err, client) {
		if (err) {
			return next(err)
		}
		log('Client created');

		client.LogIn({ username: options.username, password: options.password }, function(err) {
			var tasks = [];
			if (err) {
				log(client.lastRequest);
				return next(err)
			}

			//parallel is not support by soap client
			tasks.push(function (callback) {
				client.SetLocalTemplate({
					format: options.templateFormat,
					template: options.template
				}, callback)
			});

			// SetBlockFieldValues
			_.each(options.variables, function (value, key) {
				var blockFieldConfig;
				if (_.isArray(value)) {
					blockFieldConfig = {
						blockName: key,
						blockFieldValues: []
					};

					_.each(value, function (subValue) {
						blockFieldConfig.blockFieldValues.push({
							ArrayOfString: [{
								string: _.keys(subValue)
							}, {
								string: _.values(subValue)
							}]
						});
					});

					tasks.push(function (callback) {
						client.SetBlockFieldValues(blockFieldConfig, callback);
					});
					delete options.variables[key];
				}
			});

			// Set the rest of the values
			tasks.push(function (callback) {
				client.SetFieldValues({ fieldValues: [{
					ArrayOfString: [{
						string: _.keys(options.variables)
					}, {
						string: _.values(options.variables)
					}]
				}]}, function (err, result) {
					callback(err, result)
				});
			});

			//Go!
			async.series(tasks, function (err) {
				if (err) {
					log(client.lastRequest);
					return next(err)
				}
				log('All prepared!, creating document');
				client.CreateDocument({}, function (err) {
					if (err) {
						return next(err)
					}
					log('Document Created');

					client.RetrieveDocument({ format: options.resultFormat }, function (err, result) {
						if (err) {
							return next(err)
						}
						log('Document Retrieved');

						return next(null, new Buffer(result.RetrieveDocumentResult, 'base64'));
					});
				});
			});
		});
	});
};

(function () {
	'use strict';

	var soap, _, url, async, soapSanitize, queue = [], assert, http;

	soap = require('soap');
	_ = require('underscore');
	url = 'https://api.livedocx.com/2.1/mailmerge.asmx?wsdl';
	async = require('async');
	assert = require('assert');
	http = require('./node_modules/soap/lib/http.js');

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
			var cookies = [];

			if (err) {
				return next(err);
			}
			log('Client created');

			// crappy soap client can not handle cookies
			// awfull override to be able to retrieve authentication cookies and add them to requests!
			client._invoke = function(method, argumentz, location, callback) {
				var self = this,
						name = method.$name,
						input = method.input,
						output = method.output,
						style = method.style,
						defs = this.wsdl.definitions,
						ns = defs.$targetNamespace,
						encoding = '',
						message = '',
						xml = null,
						soapAction = this.SOAPAction ? this.SOAPAction(ns, name) : (method.soapAction || (((ns.lastIndexOf("/") != ns.length - 1) ? ns + "/" : ns) + name)),
						headers = {
							SOAPAction: '"' + soapAction + '"',
							'Content-Type': "text/xml; charset=utf-8"
						},
						options = {},
						alias;

				function findKey(obj, val) {
					for (var n in obj) if (obj[n] === val) return n;
				}

				alias = findKey(defs.xmlns, ns);

				// HACKING IN COOKIES PART I
				if (cookies.length > 0) {
					headers.Cookie = cookies.join(';');
				};

				if (input.parts) {
					assert.ok(!style || style == 'rpc', 'invalid message definition for document style binding');
					message = self.wsdl.objectToRpcXML(name, argumentz, alias, ns);
					(method.inputSoap === 'encoded') && (encoding = 'soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" ');
				}
				else if (typeof(argumentz) === 'string') {
					message = argumentz;
				}
				else {
					assert.ok(!style || style == 'document', 'invalid message definition for rpc style binding');
					message = self.wsdl.objectToDocumentXML(input.$name, argumentz, input.targetNSAlias, input.targetNamespace);
				}
				xml = "<soap:Envelope " +
						"xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\" " +
						encoding +
						this.wsdl.xmlnsInEnvelope + '>' +
						"<soap:Header>" +
						(self.soapHeaders ? self.soapHeaders.join("\n") : "") +
						"</soap:Header>" +
						"<soap:Body>" +
						message +
						"</soap:Body>" +
						"</soap:Envelope>";

				self.lastRequest = xml;

				http.request(location, xml, function(err, response, body) {
					if (err) {
						callback(err);
					}
					else {
						try {
							var obj = self.wsdl.xmlToObject(body);
						}
						catch (error) {
							return callback(error, response, body);
						}
						var result = obj.Body[output.$name];
						// RPC/literal response body may contain element named after the method + 'Response'
						// This doesn't necessarily equal the ouput message name. See WSDL 1.1 Section 2.4.5
						if(!result) {
							result = obj.Body[name + 'Response'];
						}

						// HACKING IN COOKIES PART II
						if (response.headers['set-cookie'] && response.headers['set-cookie'][0]) {
							cookies.push(response.headers['set-cookie'][0].split(';')[0]);
						}
						callback(null, result, body);
					}
				}, headers, options);
			}

			client.LogIn({ username: options.username, password: options.password }, function(err, responseObject, responseRaw) {
				var tasks = [];
				if (err) {
					return next(err);
				}

				log('Logged in');

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
				log('Starting to process tasks');
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

(function () {
	'use strict';

	var soap, async, queue = [], process;

	soap = require('soap');
	async = require('async');
	process = require('child_process');

	// crappy soap client can not operate asynchroneous in a single process... fork it!
	// And limit the requests to the server somewhat
	queue = async.queue(function (options, next) {
		var childProcess = process.fork(__dirname + '/lib/childSoapProcess.js');
		childProcess.send(options);
		childProcess.on('message', function(result) {
			if (result.err) {
				next(result.err);
			} else {
				//a buffer can not be passed as message... decode it here!
				next(null, new Buffer(result.result, 'base64'));
			}
			//kill it!
			childProcess.send(false);
		});
	}, 10);

	module.exports = function (options, next) {
		options.variables = options.variables || {};
		options.templateFormat = options.templateFormat || 'DOCX';
		options.resultFormat = options.resultFormat || 'PDF';
		queue.push(options, next);
	};
}());

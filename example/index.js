var liveDocx = require('node-livedocx'), fs = require('fs');

//CONFIG
var config = {
	username: '', // enter your livedocx username here
	password: '' // enter your livedocx password here
};

if ((config.username === '') || (config.password === '')) {
	return console.log('A username and password are required.')
}

liveDocx({
	username: config.username,
	password: config.password,
	templateFormat: 'DOCX',
	template: fs.readFileSync('invoice_template.docx').toString('base64'),
	resultFormat: 'PDF',
	variables: {
		phone: '0421 3359 129',
		date: (new Date()).toString(),
		customer_number: '11',
		invoice_number: '3',
		account_number: '55',
		month: 'November',
		total_net: '€ 100.00',
		tax : '19',
		tax_value: '€ 19.0',
		total: '€ 119.0',
		connection: [
			{
				connection_number: '7777',
				connection_duration: '3:15',
				fee: '€ 10.0'
			},
			{
				connection_number: '1234',
				connection_duration: '5:15',
				fee: '€ 11.0'
			},{
				connection_number: '333',
				connection_duration: '3:25',
				fee: '€ 21.0'
			}
		]
	}
}, function(err, resultBuffer) {
	if (err) {
		return console.log('Something went wrong!', err);
	}
	fs.writeFile('result.pdf', resultBuffer);
	console.log('PDF written to disk!');
});

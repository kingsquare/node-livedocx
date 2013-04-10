Node-livedocx allows developers to generate documents by combining structured data from node.js with a template, created
in a word processor. The resulting document can be saved as a PDF, DOCX, DOC or RTF file. The concept is the same as
with mail-merge.

This library may be used as 'middleware': just pass a callback function. Any error in the generation process will be
propagated as the first argument of the callback function. See example below.

Usage:
======

- Step 1: Sign up for an account

Before you can start using LiveDocx, you must first sign up for an account, see:

https://www.livedocx.com/user/account_registration.aspx

(250 free documents per day, see http://www.livedocx.com/pub/pricing for additional plans)

- Step 2: Install node-livedocx.

run `npm install livedocx`

- Step 3: Assign your options (username, password, template and variables) and your callback function.

The callback function receives any errors and a readStream for the resulting document.

```js
require('livedocx')(options, next);
```

See example/index.js on how to set these variables properly

- Step 4: Learn more

For more information on template options, see http://www.livedocx.com/pub/documentation/templates.aspx
For more information on the used web service, see http://www.livedocx.com/pub/documentation/api.aspx


Options:
========

All options are _REQUIRED_

```js
{
    username: 'my_username', //your username @ http://www.livedocx.com/
	  password: 'my_password', // your password @ http://www.livedocx.com/
	  templateFormat: 'DOCX', // may be one of DOCX, DOC, RTF
	  template: 'SGVsbG8gV29ybGQ=', // A base64 encoded binary file, see example/index.js for an example
	  resultFormat: 'PDF', // may be one of DOCX, DOC, RTF and PDF
	  variables: {
	      foo: 'bar', //all your document variables
	      ...
	}
}
```

Example:
========

```js
var livedocx = require('livedocx');

livedocx(options, function (err,  resultBuffer) {
	if (err) {
		return console.log('Something went wrong!', err);
	}
	fs.writeFile('result.pdf', resultBuffer);
});
```

DISCLAIMER
==========

The author is not in any way related to the Livedocx service or the company behind that service.

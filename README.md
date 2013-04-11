Generate PDF using Word templates and node.js
=============================================

Node-livedocx allows developers to generate documents by combining structured data from node.js with a template, created
in a word processor. The resulting document can be saved as a PDF, DOCX, DOC or RTF file. The concept is the same as
with mail-merge.

This library may be used as 'middleware': just pass a callback function. Any error in the generation process will be
propagated as the first argument of the callback function. See example below.


Example
-------

```js
var fs = require('fs'), livedocx = require('node-livedocx'), options;

options = {
    template: fs.readFileSync('my_template.docx').toString('base64'),
    variables: {
        foo: 'bar',
        something: 'else'
        ...
    },
    ...
}

livedocx(options, function (err,  resultBuffer) {
    if (err) {
        return console.log('Something went wrong!', err);
    }
    fs.writeFile('result.pdf', resultBuffer);
});
```

Usage
-----

**Step 1**: Sign up for an account

Before you can start using LiveDocx, you must first sign up for an account, see:

https://www.livedocx.com/user/account_registration.aspx

(250 free documents per day, see http://www.livedocx.com/pub/pricing for additional plans)

**Step 2**: Install node-livedocx.

run `npm install node-livedocx`

**Step 3**: Assign your options (username, password, template and variables) and your callback function.

The callback function receives any errors and a Buffer-object for the resulting document.

See [example/index.js](https://github.com/kingsquare/node-livedocx/blob/master/example/index.js) for a full example on how to set these variables properly

**Step 4**: Learn more

For more information on template options, see http://www.livedocx.com/pub/documentation/templates.aspx

For more information on the used web service, see http://www.livedocx.com/pub/documentation/api.aspx


Options
-------

```js
{
    username: 'my_username', // REQUIRED: your username @ http://www.livedocx.com/
    password: 'my_password', // REQUIRED: your password @ http://www.livedocx.com/
    template: 'SGVsbG8gV29ybGQ=......', // REQUIRED:  A base64 encoded string version of a binary file, see example/index.js for an example
    templateFormat: 'DOCX', // Default: DOCX. Describe the type of template used. May be one of DOCX, DOC, RTF
    resultFormat: 'PDF', // Default: PDF. Describe the type of result document. May be one of DOCX, DOC, RTF and PDF
    variables: {
        foo: 'bar', //all your document variables
        ...
    }
}
```

DISCLAIMER
----------

The author is not in any way related to the Livedocx service or the company behind that service.

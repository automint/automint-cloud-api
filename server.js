var fs = require('fs');
var https = require('https');
var express = require('express'); // call express
var app = express(); // defining app using express
var bodyParser = require('body-parser'); // get body-parser
var morgan = require('morgan'); // used to see requests
var path = require('path');
var cors = require('cors');
var privateKey  = fs.readFileSync('ssl/priv.pem', 'utf8');
var certificate = fs.readFileSync('ssl/cert.cer', 'utf8');
var credentials = {key: privateKey, cert: certificate};

// APP CONFIGURATION ---------------------
// use body parser so we can grab information from POST requests
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

//CORS - Cross Site Resources Sharing
app.use(cors());

// configure our app to handle CORS requests
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type, Authorization');
    next();
});

// log all requests to the console 
app.use(morgan('combined'));

// ROUTES FOR OUR API
// ======================================

// API ROUTES ------------------------
var apiLicensingRoutesV0_1 = require('./app/routes/beta/licensing/apiv0.1')(app, express);
app.use('/licensing/0.1', apiLicensingRoutesV0_1);
var apiRoutesV0_1 = require('./app/routes/beta/cloud/apiv0.1')(app, express);
app.use('/api/0.1', apiRoutesV0_1);

// START THE SERVER
// =============================================================================
var httpsServer = https.createServer(credentials, app);
httpsServer.listen(8443);
console.log('Licensing APIs listening');
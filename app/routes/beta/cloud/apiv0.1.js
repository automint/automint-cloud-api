var https = require('https');
var moment = require('moment');
var jwt = require('jsonwebtoken');
var couchbase = require('couchbase');
const dataBucket = 'automint-sgw-cloud';
var cluster = new couchbase.Cluster('couchbase://cbs.server/');
var bucketAutomintCBSCloud = cluster.openBucket('automint-cbs-cloud');
var N1qlQuery = couchbase.N1qlQuery;

var adminPort = 4985;
var publicPort = 4984;
var options = {
    hostname: 'cbs.vrl',
    rejectUnauthorized: false
};

// Some changes

module.exports = function (app, express) {

    // get an instance of the express router
    var apiRouter = express.Router();

    apiRouter.get('/', function (req, res) {
        res.json({
            message: 'Welcome to Automint CRM - API!'
        });
    });

    apiRouter.put('/password', function (req, resp) {
        if (!req.body.name)
            return resp.json({
                "mint_code": "PA221",
                "message": "User Name not provided"
            });
        else if (!req.body.oldpass) 
            return resp.json({
                "mint_code": "PA222",
                "message": "Old Password not provided"
            });
        else if (!req.body.newpass) 
            return resp.json({
                "mint_code": "PA223",
                "message": "New Password not provided"
            });
        else {
            var name = req.body.name;
            var oldpass = req.body.oldpass;
            var newpass = req.body.newpass;
            // GET Request on Public Port to verify Old Password:
            options.method = 'GET';
            options.port = publicPort;
            options.path = '/'+ dataBucket + '/_session';
            options.auth = name + ':' + oldpass;
            var req = https.request(options, (res) => {
                var body = '';
                res.on('data', (d) => {
                    body += d;
                    var parsed = JSON.parse(body);
                    if (parsed.error == 'Unauthorized') {
                        parsed.mint_code = 'PA200'
                        return resp.json(parsed);
                    }
                    else if (parsed.error) {
                        parsed.mint_code = 'PA311';
                        return resp.json(parsed);
                    }
                    else {
                        // GET Request on Admin Port to fetch User details:
                        options.port = adminPort;
                        options.path = '/' + dataBucket + '/_user/' + name;
                        options.method = 'GET';
                        var req = https.request(options, (res) => {
                            var body = '';
                            res.on('data', (d) => {
                                body += d;
                                var parsed = JSON.parse(body);
                                if (parsed.error) {
                                    parsed.mint_code = 'PA321';
                                    return resp.json(parsed);
                                }
                                else {
                                    // PUT Request to Admin Port to change the Password:
                                    var putData = parsed;
                                    putData.password = newpass;
                                    delete putData["name"];
                                    delete putData["all_channels"];
                                    options.port = adminPort;
                                    options.path = '/' + dataBucket + '/_user/' + name;
                                    options.method = 'PUT';
                                    options.headers = {
                                        'Content-Type': 'application/json'
                                    }
                                    var req = https.request(options, (res) => {
                                        // GET Request to Public Port to check that the password is changed:
                                        options.method = 'GET';
                                        options.port = publicPort;
                                        options.path = '/' + dataBucket + '/_session';
                                        options.auth = name + ':' + newpass;
                                        var req = https.request(options, (res) => {
                                            var body = '';
                                            res.on('data', (d) => {
                                                body += d;
                                                var parsed = JSON.parse(body);
                                                if (parsed.error) {
                                                    parsed.mint_code = 'PA341';
                                                    return resp.json(parsed);
                                                }
                                                else {
                                                    parsed.mint_code = "PA100";
                                                    return resp.json(parsed);
                                                }
                                            });
                                        });
                                        req.end();
                                        req.on('error', (e) => {
                                            e.mint_code = 'PA342'
                                            return resp.json(e);
                                        });
                                    });
                                    req.on('error', (e) => {
                                        e.mint_code = 'PA331';
                                        return resp.json(e);
                                    });
                                    req.write(JSON.stringify(putData));
                                    req.end();
                                }
                            });
                        });
                        req.on('error', (e) => {
                            e.mint_code = 'PA322';
                            return resp.json(e);
                        });
                        req.end();
                    }
                });
            });
            req.end();
            req.on('error', (e) => {
                e.mint_code = 'PA312'
                return resp.json(e);
            });
        }
    });

    return apiRouter;
};
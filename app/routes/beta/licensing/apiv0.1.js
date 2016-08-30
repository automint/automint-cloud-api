var https = require('https');
var moment = require('moment');
var jwt = require('jsonwebtoken');
var couchbase = require('couchbase');
const dataBucket = 'vrl-sgw-cloud';
var cluster = new couchbase.Cluster('couchbase://cbs.server/');
var bucketAutomintLicenses = cluster.openBucket('automint-licenses');
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
            message: 'Welcome to Automint CRM - Licensing!'
        });
    });

    apiRouter.get('/activate/code/:code', function (req, res) {
        var code_id = "code:" + req.params.code;
        bucketAutomintLicenses.get(code_id, function (err, result) {
            if (err)
                res.json(err);
            else {
                res.json(result.value);
                if (!result.value.used) {
                    result.value.used = moment().utc().format();
                    bucketAutomintLicenses.upsert(code_id, result.value, function (err, result) { });
                }
            }
        });
    });

    apiRouter.post('/auth', function (req, resp) {
        if (!req.body.name)
            return resp.json({
                "mint_code": "AU311",
                "message": "User Name not provided"
            });
        else if (!req.body.password)
            return resp.json({
                "mint_code": "AU312",
                "message": "Password not provided"
            });
        else {
            var name = req.body.name;
            var password = req.body.password;
            options.method = 'GET';
            options.port = publicPort;
            options.path = '/'+ dataBucket + '/_session';
            options.auth = name + ':' + password;
            var req = https.request(options, (res) => {
                var body = '';
                res.on('data', (d) => {
                    body += d;
                    var parsed = JSON.parse(body);
                    if (parsed.error == 'Unauthorized') {
                        parsed.mint_code = 'AU200'
                        return resp.json(parsed);
                    }
                    else if (parsed.error) {
                        parsed.mint_code = 'AU321';
                        return resp.json(parsed);
                    }
                    else {
                        var user_name = "user:" + name;
                        bucketAutomintLicenses.get(user_name, function (err, result) {
                            if (err) {
                                err.mint_code = "AU330";
                                return resp.json(err);
                            }
                            else {
                                parsed.mint_code = "AU100";
                                parsed.license = result.value;
                                return resp.json(parsed);
                            }
                        });
                    }
                });
            });
            req.end();
            req.on('error', (e) => {
                e.mint_code = 'AU322'
                return resp.json(e);
            });
        }
    });
    return apiRouter;
};
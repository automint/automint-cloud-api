var moment = require('moment');
var jwt = require('jsonwebtoken');
var couchbase = require('couchbase');
var cluster = new couchbase.Cluster('couchbase://cbs.server/');
var bucketAutomintLicenses = cluster.openBucket('automint-licenses');
var N1qlQuery = couchbase.N1qlQuery;

// Some changes

module.exports = function(app, express) {

    // get an instance of the express router
    var apiRouter = express.Router();

    apiRouter.get('/', function(req, res) {
        res.json({
            message: 'Welcome to Automint CRM - Licensing!'
        });
    });

    apiRouter.post('/activate', function(req, res) {
        bucketAutomintLicenses.get(req.body.key, function(err, result) {
            if (err)
                res.json(err);
            else {
                res.json(result.value);
                if (!result.value.used) {
                    result.value.used = moment().utc().format();
                    bucketAutomintLicenses.upsert(req.body.key, result.value, function(err, result) {});
                }
            }
        });
    });

    return apiRouter;
};
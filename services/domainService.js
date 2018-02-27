/**
 * Created by ashishprasher on 25/01/18.
 */

var request                         = require('request');
var needle                          = require('needle');
var Promise                         = require('bluebird');

var logger                          = require('../Routes/logging');
var constants                       = require('../Utils/constants');

exports.getZoneId                   = getZoneId;
exports.getDnsRecord                = getDnsRecord;
exports.checkDomainAvailability     = checkDomainAvailability;
exports.createDomain                = createDomain;
exports.deleteDomain                = deleteDomain;



function getZoneId(logHandler, opts) {
  logger.log(logHandler, { EVENT : "get zone ID", OPTIONS : opts });
  return new Promise((resolve, reject) => {
    var options = {
      headers : {
        'X-Auth-Email' : opts.email,
        'X-Auth-Key'   : opts.key
      }
    };
    needle.get(
      'https://api.cloudflare.com/client/v4/zones?name=' + opts.base_domain
      + '&status=active&page=1&per_page=20&order=status&direction=desc&match=all',
      options, (err, resp) => {
        logger.log(logHandler, { EVENT : "Get zone ID response", ERROR : err, RESPONSE : resp && resp.body });
        if(err) {
          logger.logError(logHandler, { EVENT : "Error in getZoneid", ERROR : err });
          return reject(err);
        }
        if(resp && resp.body && resp.body.success && resp.body.result.length) {
          return resolve(resp.body.result[0].id);
        } 
        return reject('error');
      }
    );
  });
}

function getDnsRecord(logHandler, opts, callback) {
  var options = {
    headers : {
      'X-Auth-Email' : opts.email,
      'X-Auth-Key'   : opts.key
    }
  };
  needle.get('https://api.cloudflare.com/client/v4/zones/' +
    opts.zone_id + '/dns_records?type=A&name=' + opts.domain_name +
    '&page=1&per_page=20&order=type&direction=desc&match=all', options, (err, resp) => {
    if(err) {
      logger.logError(logHandler, err);
      return callback(err);
    } 
    if(resp.body.success) {
      if('result' in resp.body && resp.body.result.length) {
        return callback(null, resp.body.result[0].id);
      } 
      logger.logError(logHandler, resp.body);
      return callback(null);
    } 
    return callback('error');
  });
}

function checkDomainAvailability(logHandler, opts, callback) {
  var available = false;
  getZoneId(logHandler, opts, (err, zone_id) => {
    if(err) {
      logger.logError(logHandler, err);
      return callback(null, available);
    } 
    opts.zone_id = zone_id;
    getDnsRecord(logHandler, opts, (err, data) => {
      if(err) {
        logger.logError(logHandler, err);
        return callback(null, available);
      } if(data) {
        return callback(null, available);
      } 
      return callback(null, true);
    });
  });
}

function createDomain(logHandler, opts) {
  logger.log(logHandler, { EVENT : "creating domain", OPTIONS : opts });

  return new Promise((resolve, reject) => {
    var options = {
      method  : 'POST',
      url     : 'https://api.cloudflare.com/client/v4/zones/' + opts.zone_id + '/dns_records',
      headers : {
        'cache-control' : 'no-cache',
        'content-type'  : 'application/json',
        'X-Auth-Email'  : opts.email,
        'X-Auth-Key'    : opts.key
      },
      body : {
        type    : "A",
        name    : opts.domain,
        content : opts.ip || config.get('cloudFlareDetails.IP'),
        ttl     : 1
      },
      json : true
    };
    request(options, (error, response, body) => {
      logger.log(logHandler, { EVENT : "Creating domain response", ERROR : error, RESPONSE : body });
      if(error) {
        logger.logError(logHandler, { EVENT : "ERROR IN creating domain", ERROR : error });
        return reject(error);
      }
      if(body && body.success) {
        return resolve(true);
      }
      return reject(body.errors && body.errors[0] && body.errors[0].message);
    });
  });
}

function deleteDomain(logHandler, opts, callback) {
  getZoneId(logHandler, opts, (err, zone_id) => {
    if(err) {
      logger.logError(logHandler, err);
      return callback(err);
    }
    opts.zone_id = zone_id;
    getDnsRecord(logHandler, opts, (err, data) => {
      if(err) {
        return callback(err);
      }
      if(!data) {
        return callback(null);
      }
      var options = {
        headers : {
          'X-Auth-Email' : email || config.get('cloudFlareDetails.EMAIL'),
          'X-Auth-Key'   : key || config.get('cloudFlareDetails.KEY'),
          'Content-Type' : 'application/json'
        }
      };
      needle.delete(
        'https://api.cloudflare.com/client/v4/zones/' + zone_id + '/dns_records/' + record, null,
        options, (err, resp) => {
          if(err) {
            logger.logError(logHandler, err);
            return callback(err);
          }
          if(resp && resp.body.success == true) {
            return callback(null);
          } 
          return callback('failure');
        }
      );
    });
  });
}

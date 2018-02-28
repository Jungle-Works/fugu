'use_strict';

const logger           = require('./Routes/logging');
const cache            = require('memory-cache');
const constants        = require('./Utils/constants');
const async            = require('async');
const _                = require('underscore');
const dbquery          = require('./DAOManager/query');
const pushNotification = require('./Controller/pushNotification');


let logHandler = {
  apiModule  : "cache",
  apiHandler : "buildcache"
};

let validCacheKeys = [];
_.each(constants.cache, (value, key) => {
  validCacheKeys.push(value);
});
let validCacheKeysSet = new Set(validCacheKeys);
logger.info(logHandler, "Valid Cache Keys", validCacheKeys);



exports.buildcache = function (callback) {
  let asyncTasks = [];
  asyncTasks.push(businessProperties.bind(null));
  async.series(asyncTasks, (error) => {
    if(error) {
      logger.logError(logHandler, "Error occurred while initializing cache ", error);
      return callback();
    }
    exports.invalidateCache();
    logger.trace(logHandler, "Cache build successful ", cache.exportJson());
    return callback();
  });

  function businessProperties(callback) {
    let opts = {};
    opts.business_id = 0;
    dbquery.getBusinessConfiguration(logHandler, opts, (error, result) => {
      if(error) {
        return callback(error);
      }
      let option = {};
      option[0] = result;
      cache.put(constants.cache.BUSINESS_PROPERTY, option);
      return callback();
    });
  }
};


exports.invalidateCache = function (key) {
  if(key) {
    if(validCacheKeysSet.has(key)) {
      cache.put(key, {});
      logger.info(logHandler, "Cache Invalidated with key", key);
    } else {
      logger.error(logHandler, "Invalidated Cache key ", key);
    }
    return;
  }
  pushNotification.clearAllAPNSConnections();
  cache.put(constants.cache.BUSINESS_DEVICE_MAPPINGS, {});
  cache.put(constants.cache.BUSINESS_PROPERTY, {});
  cache.put(constants.cache.SERVER_LOGGING, {});
  logger.info(logHandler, "Full Cache Invalidated");
};

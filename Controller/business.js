

const _                             = require('underscore');
const md5                           = require('MD5');
const Promise                       = require('bluebird');
const moment                        = require('moment');
const async                         = require('async');
const cache                         = require('memory-cache');
const config                        = require('config');
const RESP                          = require('../Config').responseMessages;
const dbHandler                     = require('../database').dbHandler;
const logger                        = require('../Routes/logging');
const sendEmail                     = require('../Notification/email').sendEmailToUser;
const utils                         = require('../Controller/utils');
const constants                     = require('../Utils/constants');
const UniversalFunc                 = require('../Utils/universalFunctions');
const dbquery                       = require('../DAOManager/query');
const businessService               = require('../services/business');
const authService                   = require('../services/auth');
const agentService                  = require('../services/agent');
const utilityService                = require('../services/utility');
const cachebuilder                  = require('../cachebuilder');
const billingService                = require('../services/billing');

exports.getConfiguration            = getConfiguration;
exports.editConfiguration           = editConfiguration;
exports.getDevices                  = getDevices;
exports.editDevice                  = editDevice;
exports.getBusinessInfo             = getBusinessInfo;
exports.editBusinessInfo            = editBusinessInfo;
exports.addBusinessCannedMessages   = addBusinessCannedMessages;
exports.getBusinessCannedMessages   = getBusinessCannedMessages;
exports.editBusinessCannedMessages  = editBusinessCannedMessages;
exports.signUp                      = signUp;
exports.addDevice                   = addDevice;
exports.getBusinessStats            = getBusinessStats;
exports.getAllBusinessStats         = getAllBusinessStats;
exports.editBusinessStats           = editBusinessStats;


function getConfiguration(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let businessInfo = payload.businessInfo;
      let businessDetails = yield businessService.getInfo(logHandler, businessInfo);
      let businessProperties =  yield businessService.getConfiguration(logHandler, { business_id : businessInfo.business_id });
      businessProperties.business_image = businessDetails.business_image || "";
      return businessProperties;
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}

function editConfiguration(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      yield businessService.editConfiguration(logHandler, payload.businessInfo.business_id, payload);
      return {};
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}

function getDevices(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let businessInfo = {};
    businessInfo.business_id = payload.businessInfo.business_id;
    let businessDeviceDetails = yield businessService.getDeviceDetails(logHandler, businessInfo);

    let result = {
      device_details : businessDeviceDetails
    };
    logger.trace(logHandler, { EVENT : "Final response" }, { RESULT : result });

    return result;
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, { EVENT : "GET DEVICES" }, { MESSAGE : error.message });
    UniversalFunc.sendError(error, res);
  });
}

function addDevice(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let businessInfo = {};
    businessInfo.business_id = payload.businessInfo.business_id;
    let businessDeviceDetails = yield businessService.getDeviceDetails(logHandler, businessInfo);

    let appType = constants.defaultAppType;
    let maxAppType = Math.max(...businessDeviceDetails.map(object => object.app_type));
    if(maxAppType && maxAppType > 0) {
      appType = maxAppType + 1;
    }
    let criteria = {
      businessId : payload.businessInfo.business_id,
      appName    : payload.app_name
    };
    let result = yield  businessService.getDeviceDetailsByAppName(logHandler, criteria);
    if(!_.isEmpty(result)) {
      throw new Error("Duplicate App Name");
    }
    let insertPayload = {};
    insertPayload.business_id = businessInfo.business_id;
    insertPayload.app_type = appType;
    insertPayload.app_name = payload.app_name;
    yield businessService.insertDeviceDetails(logHandler, insertPayload);

    return {};
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.ENTRY_ADDED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, { EVENT : "ADD DEVICE" }, { MESSAGE : error.message });
    UniversalFunc.sendError(error, res);
  });
}

function editDevice(logHandler, payload, res) {
  payload.business_id = payload.businessInfo.business_id;
  payload.file_type = "pem";
  payload.randomizeFileName = true;
  Promise.coroutine(function* () {
    // fetch device details
    let agentInfo = payload.userInfo;
    let businessDeviceDetails = yield businessService.getDeviceDetails(logHandler, agentInfo);
    let defaultDetails;
    for (let details of businessDeviceDetails) {
      if(details.app_type == payload.app_type) {
        defaultDetails = details;
        break;
      }
    }

    if(payload.app_name) {
      let criteria = {
        businessId : payload.businessInfo.business_id,
        appName    : payload.app_name
      };
      let result = yield  businessService.getDeviceDetailsByAppName(logHandler, criteria);
      if(!_.isEmpty(result) && payload.app_type != result[0].app_type) {
        throw new Error("Duplicate App Name");
      }
    }
    // upload pem file
    if(payload.files && payload.files.length > 0) {
      payload.file = payload.files[0];
      let uploadLocation = yield utilityService.uploadFile(logHandler, payload);
      payload.certificate = uploadLocation.url;
    }

    // TODO : move to proper caching
    // update and invalidate cache
    if(!defaultDetails) {
      throw new Error("No App found with given app type");
    }
    let businessDetails = yield businessService.updateDeviceDetails(logHandler, payload);
    cachebuilder.invalidateCache();
    let options = {
      url    : config.get('fuguChatURL') + constants.API_END_POINT.CACHE_RELOAD,
      method : 'POST',
      json   : {}
    };
    utilityService.sendHttpRequest(logHandler, options);


    let result = {
      message         : "business device details updated successfully",
      businessDetails : businessDetails
    };
    logger.trace(logHandler, { EVENT : "Final response" }, { RESULT : result });

    return result;
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.ENTRY_EDIT_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, { EVENT : "UPDATE DEVICE CONFIG" }, { MESSAGE : error.message });
    UniversalFunc.sendError(error, res);
  });
}

function getBusinessInfo(logHandler, payload, res) {
  payload.business_id = payload.businessInfo.business_id;
  Promise.coroutine(function* () {
    let selectPayload = {
      select_columns : ["business_name", "app_secret_key", "address", "contact_person", "business_image", "contact_number", "email", "custom_notification"],
      where_clause   : {
        business_id : payload.business_id
      }
    };
    let result = yield  businessService.getInfoCommon(logHandler, selectPayload);
    if(!result.length) {
      throw new Error("Business not found");
    }
    logger.trace(logHandler, { EVENT : "Final response" }, { RESULT : result[0] });
    return result[0];
  })().then((data) => {
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, { ERROR : error });
    UniversalFunc.sendError(error, res);
  });
}

function editBusinessInfo(logHandler, payload, res) {
  payload.business_id = payload.businessInfo.business_id;
  Promise.coroutine(function* () {
    // upload business image
    if(!_.isEmpty(payload.files)) {
      payload.file = payload.files[0];
      payload.file_type = "image";
      payload.randomizeFileName = true;
      let uploadLocation = yield utilityService.uploadFile(logHandler, payload);
      payload.business_image = uploadLocation.url;
    }


    // update business info
    let updatePayload = {
      update_fields : payload,
      where_clause  : {
        business_id : payload.business_id
      }
    };
    yield businessService.updateInfo(logHandler, updatePayload);

    return {};
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.BUSINESS_INFO_UPDATE_SUCCESSFUL, data, res);
  }, (error) => {
    logger.error(logHandler, { EVENT : "EDIT BUSINESS INFO ERROR" }, { MESSAGE : error.message });
    UniversalFunc.sendError(error, res);
  });
}

function addBusinessCannedMessages(logHandler, payload, callback) {
  let opts                             = {};
  opts.title                       = payload.title;
  opts.message                     = payload.message;
  opts.sku                         = payload.sku;
  opts.business_id                 = payload.businessInfo.business_id;

  let asyncTasks = [];
  asyncTasks.push(getCannedMessageInDB.bind(null, opts));
  asyncTasks.push(addCannedMessageInDB.bind(null, opts));

  function getCannedMessageInDB(opts, callback) {
    let values = [opts.business_id, opts.sku, opts.title];
    let sql = 'SELECT * FROM business_canned_messages WHERE business_id = ? AND ( sku = ? OR title = ?) ';
    dbHandler.query(logHandler, "getCannedMessageFromDB", sql, values, (err, response) => {
      if(err) {
        return callback(err);
      }
      if(response.length) {
        let errorCause = (opts.title == response[0].title) ? 'title' : 'sku';
        return callback(new Error(`Canned message already exist with given ${errorCause}`));
      }
      callback();
    });
  }

  function addCannedMessageInDB(opts, callback) {
    let values = [opts.business_id, opts.title, opts.message];
    let insertParams = ["`business_id`", "`title`", "`message`"];

    if(utils.isDefined(opts.sku)) {
      insertParams.push("`sku`");
      values.push(opts.sku);
    }

    let insertSql = insertParams.join(", ");
    let insertValues = new Array(insertParams.length).fill("?").join(', ');
    let sql = "INSERT INTO `business_canned_messages` ( " + insertSql + " ) " +
      "VALUES ( " + insertValues + " ) ;";

    dbHandler.query(logHandler, "addCannedMessageInDB", sql, values, (err, response) => {
      if(err) {
        callback(err);
      } else {
        opts.response = { insertId : response.insertId };
        logger.trace(logHandler, "Canned message added to db ", response);
        callback();
      }
    });
  }

  async.series(asyncTasks, (error) => {
    if(error) {
      logger.error(logHandler, "Error occurred while adding canned messages ", error);
      return callback(error);
    }
    logger.trace(logHandler, "final response ", opts.response);
    return callback(null, opts.response);
  });
}

function getBusinessCannedMessages(logHandler, payload, callback) {
  let opts                             = {};
  opts.access_token                = payload.access_token;
  opts.sku                         = payload.sku;
  opts.title                       = payload.title;
  opts.business_id                 = payload.businessInfo.business_id;

  let asyncTasks = [];
  // asyncTasks.push(checkIfAccessTokenValid.bind(null, logHandler, opts));
  asyncTasks.push(getCannedMessagesFromDB.bind(null, opts));

  function getCannedMessagesFromDB(opts, callback) {
    let values = [opts.business_id];

    let sql = "SELECT id as message_id , title, message, sku FROM `business_canned_messages` WHERE business_id = ? ";
    if(utils.isDefined(opts.sku)) {
      sql += " AND sku LIKE ? ";
      values.push("%" + opts.sku + "%");
    }
    if(utils.isDefined(opts.title)) {
      sql += " AND title LIKE ? ";
      values.push("%" + opts.title + "%");
    }

    dbHandler.query(logHandler, "getCannedMessagesFromDB", sql, values, (err, response) => {
      if(err) {
        return callback(err);
      }
      opts.response = response;
      return callback();
    });
  }

  async.series(asyncTasks, (error) => {
    if(error) {
      logger.error(logHandler, "Error occurred while get canned messages ", error);
      return callback(error);
    }
    return callback(null, opts.response);
  });
}

function editBusinessCannedMessages(logHandler, payload, callback) {
  let opts                             = {};
  opts.access_token                = payload.access_token;
  opts.message_id                  = payload.message_id;
  opts.title                       = payload.title;
  opts.message                     = payload.message;
  opts.sku                         = payload.sku;
  opts.is_enabled                  = utils.isDefined(payload.delete_message) ? ((payload.delete_message) == 1 ? 0 : 1) : 1;
  opts.business_id                 = payload.businessInfo.business_id;

  let asyncTasks = [];
  // asyncTasks.push(checkIfAccessTokenValid.bind(null, logHandler, opts));
  asyncTasks.push(editCannedMessagesInDB.bind(null, opts));

  function editCannedMessagesInDB(opts, callback) {
    let values = [];
    let setClause = [];
    let possibleValues = ['title', 'message', 'sku', 'is_enabled'];

    for (let i = 0; i < possibleValues.length; i++) {
      let key = possibleValues[i];
      if(key in opts) {
        setClause.push(key + " = ? ");
        values.push(opts[key]);
      }
    }
    if(setClause.length == 0) {
      return callback();
    }
    values.push(opts.business_id);
    values.push(opts.message_id);

    let sql = "UPDATE `business_canned_messages` SET  " + setClause.join(", ") + "WHERE business_id = ? AND id = ?";

    dbHandler.query(logHandler, "update canned messages", sql, values, (err, response) => {
      if(err) {
        return callback(err);
      }
      return callback();
    });
  }

  async.series(asyncTasks, (error) => {
    if(error) {
      return callback(error);
    }
    return callback(null, {});
  });
}


function signUp(logHandler, payload) {
  return new Promise((resolve, reject) => {
    payload.email    = payload.email.trim();
    payload.originalPassword = payload.password;
    payload.password = md5(payload.password);
    payload.business_name = payload.business_name || "";
    payload.device_type   = payload.device_type || 0;
    payload.contact_person = payload.full_name || "";
    Promise.coroutine(function* () {
      // check existing agent and auth user
      let existingAgent = yield agentService.getInfo(logHandler, { email : payload.email });
      if(existingAgent.length > 0) {
        throw new Error("Email Id already registered with us");
      }
      let authUserDetails = yield authService.getAuthUserDetails(logHandler, { email : payload.email });
      if(!_.isEmpty(authUserDetails)) {
        throw new Error("Please login using tookan credentials !!");
      }


      let createPayload = {};
      createPayload.business_name  = payload.business_name;
      createPayload.email          = payload.email;
      createPayload.contact_number = payload.contact_number;
      createPayload.contact_person = payload.contact_person;
      createPayload.full_name      = payload.full_name;
      createPayload.password       = payload.password;
      createPayload.device_type    = payload.device_type;
      createPayload.config         = payload.config;
      createPayload.ip             = payload.ip;
      let businessInfo = yield businessService.createBusiness(logHandler, createPayload);


      let registerPayload = {};
      registerPayload.email = payload.email;
      registerPayload.full_name = payload.full_name;
      registerPayload.password  = payload.originalPassword;
      registerPayload.phone_number  = payload.contact_number;
      yield authService.registerUser(logHandler, registerPayload);

      let result = {
        email          : payload.email,
        business_id    : businessInfo.business_id,
        app_secret_key : businessInfo.app_secret_key
      };
      logger.trace(logHandler, { EVENT : "Final response" }, { RESULT : result });
      return result;
    })().then(
      (data) => { resolve(data); },
      (error) => { reject(error); }
    );
  });
}

function checkIfAccessTokenValid(logHandler, opts, callback) {
  const access_token = opts.access_token;
  if(!utils.isDefined(access_token)) {
    return callback(new Error("Access token not passed "));
  }
  let sql = "SELECT * FROM `users` WHERE `access_token` = ? ";
  dbHandler.query(logHandler, "check token", sql, [access_token], (err, resp) => {
    if(err) {
      return callback("There was some problem in the checkIfAccessTokenValid query" + err);
    }
    if(resp.length < 1) {
      logger.trace(logHandler, "The access Token is invalid", { req : opts }, { res : resp });
      return callback(RESP.ERROR.eng.INVALID_TOKEN);
    }

    opts.business_id = resp[0].business_id;
    return callback(null, opts);
  });
}

function checkIfAppSecretKeyValid(logHandler, opts, callback) {
  const app_secret_key = opts.app_secret_key;
  if(!utils.isDefined(app_secret_key)) {
    return callback(new Error("App secret key not passed "));
  }

  let sql = "SELECT * FROM `business_details` WHERE `app_secret_key` = ? ";
  dbHandler.query(logHandler, "check secret key", sql, [app_secret_key], (err, resp) => {
    if(err) {
      return callback("There was some problem in the checkIfAppSecretKeyValid query" + err);
    }
    if(resp.length < 1) {
      logger.trace(logHandler, "The app secret key is invalid", { req : opts }, { res : resp });
      return callback(RESP.ERROR.eng.INVALID_TOKEN_ACCESS_DENIED);
    }

    opts.business_id = resp[0].business_id;
    return callback(null, opts);
  });
}


function getBusinessStats(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let error = {};
      let businessDetails;
      let responseToSend = [];

      if(payload.business_id) {
        businessDetails = yield businessService.getInfo(logHandler, { business_id : payload.business_id });
      }

      if(_.isEmpty(businessDetails)) {
        error.errorResponse = RESP.ERROR.eng.INVALID_BUSINESS_ID;
        throw error;
      }
      businessDetails.business_expiry_date = '';
      businessDetails.per_agent_cost = 0;
      let businessStats = yield businessService.getBusinessStats(logHandler, businessDetails.business_id);
      _.each(businessStats, (value, key) => {
        logger.trace(logHandler, "getBusinessStats loop", key, value);
        value = (value == null) ? '' : value;
        businessDetails[key] = value;
      });

      let totatAgents = yield agentService.getTotalAgentsCount(logHandler, businessDetails.business_id);

      let businessExpiryDate = yield billingService.getTrialExpiryDate(logHandler, payload.business_id);

      if(!_.isEmpty(businessExpiryDate)) {
        businessDetails.expiry_date = businessExpiryDate[0].expiry_date || '';
      }

      let businessBillinDetails = yield billingService.getBillingPlanDetails(logHandler, { business_id : payload.business_id });
      let billingProperties = yield billingService.getBillingProperties(logHandler, payload.business_id);

      if(!_.isEmpty(billingProperties)) {
        businessDetails.per_agent_cost = billingProperties.per_agent_cost || 0;
      }

      if(!_.isEmpty(businessBillinDetails)) {
        businessDetails.per_agent_cost =  businessBillinDetails[0].per_agent_cost;
      }
      businessDetails.total_agents = totatAgents[0].total_agents || 0;
      responseToSend.push(businessDetails);
      return responseToSend;
    })().then(
      (data) => { resolve(data); },
      (error) => {
        reject(error);
      }
    );
  });
}


function getAllBusinessStats(logHandler) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      return yield businessService.getAllBusinessStats(logHandler);
    })().then(
      (data) => { resolve(data); },
      (error) => {
        reject(error);
      }
    );
  });
}

function editBusinessStats(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      if(!payload.businessInfo) {
        throw new Error("Please Provide Business Id");
      }
      if(payload.int_bus) {
        let object = {};
        object.update_fields = {
          int_bus : payload.int_bus
        };

        object.where_clause = {
          business_id : payload.business_id
        };
        yield businessService.updateInfo(logHandler, object);
      }
      if(payload.per_agent_cost) {
        let businessPlan = yield billingService.getBillingPlanDetails(logHandler, payload);

        if(!_.isEmpty(businessPlan)) {
          yield billingService.updateBillingPlan(logHandler, payload);
        } else {
          yield billingService.editProperties(logHandler, payload);
        }
      }

      if(payload.expiry_date) {
        let businessExpiryDate = new Date(payload.expiry_date);
        let businessExpiryDetails = yield billingService.getTrialExpiryDate(logHandler, payload.business_id);
        if(_.isEmpty(businessExpiryDetails)) {
          throw new Error("Trial not started yet");
        }
        if(businessExpiryDate && (businessExpiryDate < payload.businessInfo.created_at)) {
          throw new Error("Expiry date cannot be less than the business created date");
        }

        yield billingService.updateTrialExpiryDate(logHandler, { business_id : payload.businessInfo.business_id, expiry_date : payload.expiry_date });
      }
    })().then(
      (data) => { resolve(data); },
      (error) => { reject(error); }
    );
  });
}

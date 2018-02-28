/**
 * Created by vidit on 7/7/17.
 */
const Promise                       = require('bluebird');
const md5                           = require('MD5');
const _                             = require('underscore');
const config                        = require('config');
const dbHandler                     = require('../database').dbHandler;
const logger                        = require('../Routes/logging');
const dbquery                       = require('../DAOManager/query');
const constants                     = require('../Utils/constants');
const sendEmail                     = require('../Notification/email').sendEmailToUser;
const utils                         = require('../Controller/utils');
const authService                   = require('../services/auth');
const agentService                  = require('../services/agent');
const utilityService                = require('../services/utility');
const billingService                = require('../services/billing');


exports.insertNew                    = insertNew;
exports.getInfo                      = getInfo;
exports.getInfoUsingEmail            = getInfoUsingEmail;
exports.getDeviceDetails             = getDeviceDetails;
exports.insertDeviceDetails          = insertDeviceDetails;
exports.updateDeviceDetails          = updateDeviceDetails;
exports.getInfoCommon                = getInfoCommon;
exports.updateInfo                   = updateInfo;
exports.getInfoUsingReseller         = getInfoUsingReseller;
exports.getDeviceDetailsByAppName    = getDeviceDetailsByAppName;
exports.getInfoUsingAppSecretKey     = getInfoUsingAppSecretKey;
exports.getConfiguration             = getConfiguration;
exports.addBusinessActivity          = addBusinessActivity;
exports.syncAndGetBusinessOwner      = syncAndGetBusinessOwner;
exports.createBusiness               = createBusiness;
exports.getBusinessStats             = getBusinessStats;
exports.getAllBusinessStats          = getAllBusinessStats;
exports.editConfiguration            = editConfiguration;
exports.getBusinessDeviceDetails     = getBusinessDeviceDetails;


function insertNew(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = "INSERT INTO business_details set ? ";
    let businessInfo = {
      app_secret_key : md5(payload.email + Math.random()),
      business_name  : payload.business_name,
      email          : payload.email,
      contact_number : payload.contact_number,
      contact_person : payload.contact_person
    };

    if(payload.reseller_info) {
      businessInfo.reseller_id = payload.reseller_info.reseller_id;
      businessInfo.reseller_reference_id = payload.reseller_info.reseller_reference_id;
      businessInfo.custom_notification = payload.reseller_info.custom_notification;
    }

    let queryObj = {
      query : query,
      args  : [businessInfo],
      event : "Inserting new business"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      businessInfo.business_id = result.insertId;
      resolve(businessInfo);
    }, (error) => {
      reject(error);
    });
  });
}

function getInfo(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT *
      FROM
        business_details
      WHERE 
        business_id = ? 
    `;
    let queryObj = {
      query : query,
      args  : [payload.business_id],
      event : "Get Business Info "
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      if(result.length <= 0) { return reject(new Error("No business found with given business id : " + payload.business_id)); }
      resolve(result[0]);
    }, (error) => {
      reject(error);
    });
  });
}

function getInfoUsingAppSecretKey(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT *
      FROM
        business_details
      WHERE 
        app_secret_key = ? 
    `;
    let queryObj = {
      query : query,
      args  : [payload.app_secret_key],
      event : "Get Business Info "
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      if(result.length <= 0) {
        logger.error(logHandler, "No business found with given app_secret_key : " + payload.app_secret_key);
        return reject(new Error("No business found with given credentials / Invalid secret key"));
      }
      resolve(result[0]);
    }, (error) => {
      reject(error);
    });
  });
}

function getInfoUsingEmail(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT *
      FROM
        business_details
      WHERE 
        email = ? 
    `;
    let queryObj = {
      query : query,
      args  : [payload.email],
      event : "Get Business Info Using Email "
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function getInfoUsingReseller(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT *
      FROM
        business_details
      WHERE 
        reseller_id = ? AND reseller_reference_id = ?
    `;
    let queryObj = {
      query : query,
      args  : [payload.reseller_id, payload.reseller_reference_id],
      event : "Get Business Info Using Reseller Info"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getDeviceDetails(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT *
      FROM
        business_device_mappings
      WHERE 
        business_id = ? 
    `;
    let queryObj = {
      query : query,
      args  : [payload.business_id],
      event : "Get Business Device Mappings "
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}
function getDeviceDetailsByAppName(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT business_id, app_type
      FROM
        business_device_mappings
      WHERE 
        business_id = ?
      and
        app_name = ? 
    `;
    let queryObj = {
      query : query,
      args  : [payload.businessId, payload.appName],
      event : "Get Business Device Mappings By App Name"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function editConfiguration(logHandler, business_id, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      if(!payload) {
        return {};
      }
      let allowedConfig = yield Promise.promisify(dbquery.getBusinessConfiguration).call(this, logHandler, { business_id : 0 });

      let placeHolders = [];
      let values = [];
      _.each(allowedConfig, (value, key) => {
        if(key in payload) {
          placeHolders.push("(" + new Array(3).fill("?").join(',') + ")");
          values = values.concat([business_id, key, payload[key]]);
        }
      });
      let placeHolder = placeHolders.join(', ');
      let sql = `REPLACE INTO business_property (business_id, property, value) VALUES ${placeHolder} `;
      dbHandler.query(logHandler, "editConfiguration", sql, values, (err, response) => {
        if(err) {
          throw err;
        }
        return response;
      });
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}

function getInfoCommon(logHandler, payload) {
  return new Promise((resolve, reject) => {
    logger.trace(logHandler, { EVENT : "GET Business Info using getInfoCommon" }, { PAYLOAD : payload });
    if(_.isEmpty(payload.where_clause)) {
      return reject(new Error("Where condition Empty"));
    }

    // where
    let whereCondition = "";
    let values = [];
    _.each(payload.where_clause, (value, key) => {
      whereCondition += " AND " + key + " = ? ";
      values.push(value);
    });

    // select
    let select = "*";
    if(!_.isEmpty(payload.select_columns)) {
      select = payload.select_columns.join(",");
    }


    let query = `Select ${select}  from business_details where 1=1 ${whereCondition}`;
    let queryObj = {
      query : query,
      args  : values,
      event : "Get Business Info Common"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function insertDeviceDetails(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = "INSERT INTO business_device_mappings set ? ";
    let insertObj = {};
    insertObj.business_id = payload.business_id;
    insertObj.app_type  = payload.app_type;
    insertObj.api_key = payload.api_key;
    insertObj.certificate = payload.certificate;
    insertObj.topic = payload.topic;
    insertObj.app_name  = payload.app_name;

    let queryObj = {
      query : query,
      args  : [insertObj],
      event : "Insert business device details"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(insertObj);
    }, (error) => {
      reject(error);
    });
  });
}

function updateDeviceDetails(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = "UPDATE business_device_mappings set ? WHERE business_id = ? AND app_type = ?";
    let updateObj = {};
    (payload.app_name)      ? updateObj.app_name = payload.app_name : 0;
    (payload.api_key)       ? updateObj.api_key = payload.api_key : 0;
    (payload.certificate)   ? updateObj.certificate = payload.certificate : 0;
    (payload.topic)         ? updateObj.topic = payload.topic : 0;
    (payload.passphrase)    ? updateObj.passphrase = payload.passphrase : 0;
    updateObj.updated_at = new Date();

    let queryObj = {
      query : query,
      args  : [updateObj, payload.business_id, payload.app_type],
      event : "Updating business device details"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(updateObj);
    }, (error) => {
      reject(error);
    });
  });
}

function updateInfo(logHandler, payload) {
  return new Promise((resolve, reject) => {
    logger.trace(logHandler, { EVENT : "Updating business info " }, { PAYLOAD : payload });
    if(_.isEmpty(payload.update_fields)) {
      return reject(new Error("Update Fields Missing"));
    }
    if(_.isEmpty(payload.where_clause)) {
      return reject(new Error("Where condition Empty"));
    }


    let updateObj = {};
    updateObj.updated_at = new Date();
    let validUpdateColumns = new Set(["business_name", "business_image", "address", "contact_person", "contact_number", "enabled",
      "reseller_id", "reseller_reference_id", "int_bus"]);
    _.each(payload.update_fields, (value, key) => {
      if(validUpdateColumns.has(key) && (value === null || value == 0 || value)) {
        updateObj[key] = value;
      }
    });


    let values = [];
    let whereCondition = "";
    _.each(payload.where_clause, (value, key) => {
      whereCondition += " AND " + key + " = ? ";
      values.push(value);
    });



    let query = `UPDATE business_details set  ?  where 1=1 ${whereCondition}`;
    let queryObj = {
      query : query,
      args  : [updateObj].concat(values),
      event : "Updating reseller info"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function getConfiguration(logHandler, opts) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let business_id = opts.business_id;

      let result = yield Promise.promisify(dbquery.getBusinessConfiguration).call(this, logHandler, { business_id : 0 });
      let businessConfig = yield Promise.promisify(dbquery.getBusinessConfiguration).call(this, logHandler, { business_id : business_id });
      _.each(businessConfig, (value, key) => {
        result[key] = value;
      });

      return result;
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}


function addBusinessActivity(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = "INSERT INTO business_activity set ? ";

    let queryObj = {
      query : query,
      args  : [payload],
      event : "addBusinessActivity"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getBusinessOwner(logHandler, business_id) {
  return new Promise((resolve, reject) => {
    let query = `SELECT 
                    u.*,
                    bd.business_name AS business_name,
                    bd.address AS business_address
                FROM
                    users u
                        JOIN
                    business_details bd ON bd.business_id = u.business_id
                        AND bd.email = u.email
                WHERE
                    bd.business_id = ? AND u.user_type = 2`;

    let queryObj = {
      query : query,
      args  : [business_id],
      event : "getBusinessOwner"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function syncAndGetBusinessOwner(logHandler, business_id) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let businessOwner = yield getBusinessOwner(logHandler, business_id);
      if(_.isEmpty(businessOwner)) {
        throw new Error("business owner not found");
      }
      businessOwner = businessOwner[0];

      let businessOwnerAuthDetails = yield authService.getAuthUserDetails(logHandler, { email : businessOwner.email });
      if(_.isEmpty(businessOwnerAuthDetails)) {
        throw new Error("owner not found in auth");
      }

      // sync info
      if(businessOwnerAuthDetails.access_token != businessOwner.access_token || businessOwnerAuthDetails.password != businessOwner.password) {
        let opts = {
          user_id      : businessOwner.user_id,
          access_token : businessOwnerAuthDetails.access_token,
          password     : businessOwnerAuthDetails.password
        };
        yield agentService.updateInfo(logHandler, opts);
        businessOwner.access_token = businessOwnerAuthDetails.access_token;
        businessOwner.password     = businessOwnerAuthDetails.password;
      }

      businessOwner.auth_user_id = businessOwnerAuthDetails.user_id;
      return businessOwner;
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}



function createBusiness(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let businessInfo = yield insertNew(logHandler, payload);
      utils.addAllKeyValues(businessInfo, payload);
      yield editConfiguration(logHandler, businessInfo.business_id, payload.config);
      payload.user_sub_type = constants.userSubType.ADMIN;
      yield agentService.insertNew(logHandler, payload);


      if(utils.isEnv('production')) {
        let emailContent = { full_name : "Fugu Chat", email : payload.email + " , contact no : " + payload.contact_number + " , name : " + payload.full_name };
        sendEmail(constants.emailType.REQUEST_MAIL, emailContent, constants.FUGU_EMAIL, "New Business SignUp");
      }
      if(!payload.disable_autopilot) {
        utilityService.initiateAutoPilotCampaign(logHandler, payload);
      }

      let expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (payload.trialDays || constants.billing.trialDays));
      billingService.insertTrialExpiryDate(logHandler, { business_id : payload.business_id, expiry_date : expiryDate });

      if(!payload.disable_autopilot) {
        sendEmail(constants.emailType.WELCOME_MAIL, { owner_name : utils.toTitleCase(payload.full_name) }, payload.email, constants.mailSubject.WELCOME_MAIL);
      }
      
      utilityService.getAddressFromIP(logHandler, payload.ip, payload);
      

      return businessInfo;
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}

function getBusinessStats(logHandler, business_id) {
  return new Promise((resolve, reject) => {
    let query = "select (select count(*) from users_conversation where business_id = ? ) as total_messages_of_business, (select count(*) from channels where business_id = ?) as total_chats, (select created_at from users_conversation where business_id = ? order by created_at desc limit 1 ) as last_message_at";

    let queryObj = {
      query : query,
      args  : [business_id, business_id, business_id],
      event : "getBusinessStats"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result[0]);
    }, (error) => {
      reject(error);
    });
  });
}

function getAllBusinessStats(logHandler) {
  return new Promise((resolve, reject) => {
    let query = "select business_id, business_name,email, contact_number, int_bus, created_at from business_details order by business_id";

    let queryObj = {
      query : query,
      args  : [],
      event : "getAllBusinessStats"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getBusinessDeviceDetails(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let query = "SELECT api_key, certificate, app_name, topic FROM business_device_mappings WHERE business_id = ? AND app_type = ? ";

    let queryObj = {
      query : query,
      args  : [opts.business_id, opts.app_type],
      event : "getBusinessDeviceDetails"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

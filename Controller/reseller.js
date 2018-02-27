/**
 * Created by vidit on 28/7/17.
 */



const md5                           = require('MD5');
const Promise                       = require('bluebird');
const moment                        = require('moment');
const _                             = require('underscore');
const config                        = require('config');
const RESP                          = require('../Config').responseMessages;
const logger                        = require('../Routes/logging');
const businessService               = require('../services/business');
const resellerService               = require('../services/reseller');
const constants                     = require('../Utils/constants');
const UniversalFunc                 = require('../Utils/universalFunctions');
const UserController                = require('../Controller/userController');
const utilityService                = require('../services/utility');
const agentService                  = require('../services/agent');
const sendEmail                     = require('../Notification/email').sendEmailToUser;
const utils                         = require('../Controller/utils');



exports.activateBusiness            = activateBusiness;
exports.deactivateBusiness          = deactivateBusiness;
exports.getBusinessInfo             = getBusinessInfo;
exports.create                      = create;
exports.update                      = update;
exports.resellerInfo                = resellerInfo;
exports.disable                     = disable;
exports.resellerPutUserDetails      = resellerPutUserDetails;
exports.assignReseller              = assignReseller;
exports.addOrUpdateConfig           = addOrUpdateConfig;



function activateBusiness(logHandler, payload) {
  return new Promise((resolve, reject) => {
    payload.email                  = payload.email.trim();
    payload.business_name          = payload.business_name || "";
    payload.custom_notification    = payload.custom_notification || 0;
    payload.device_type            = payload.device_type || 0;
    let password                   = md5((payload.password || UniversalFunc.generateRandomString(6)));
    Promise.coroutine(function* () {
      // existing business
      let selectPayload = {
        where_clause : {
          reseller_id           : payload.reseller_info.id,
          reseller_reference_id : payload.reference_id
        }
      };
      let existingBusiness = yield  businessService.getInfoCommon(logHandler, selectPayload);
      if(!_.isEmpty(existingBusiness)) {
        existingBusiness = existingBusiness[0];
        if(existingBusiness.enabled) {
          return "Business already active";
        }

        let updatePayload = {
          update_fields : { enabled : 1 },
          where_clause  : { business_id : existingBusiness.business_id }
        };
        yield  businessService.updateInfo(logHandler, updatePayload);
        return existingBusiness;
      }

      // create business
      let existingAgent = yield agentService.getInfo(logHandler, { email : payload.email });
      if(existingAgent.length > 0) {
        throw new Error("Agent with Email Id already exists");
      }
      let createPayload = {};
      createPayload.business_name  = payload.business_name;
      createPayload.email          = payload.email;
      createPayload.contact_number = payload.contact_number;
      createPayload.contact_person = payload.full_name;
      createPayload.full_name      = payload.full_name;
      createPayload.password       = password;
      createPayload.disable_autopilot = payload.disable_autopilot;
      createPayload.device_type    = payload.device_type;
      createPayload.trialDays      = constants.billing.resellerTrialDays;
      createPayload.config         = payload.config;
      createPayload.reseller_info  = {
        reseller_id           : payload.reseller_info.id,
        reseller_reference_id : payload.reference_id,
        custom_notification   : payload.custom_notification
      };
      let businessInfo = yield businessService.createBusiness(logHandler, createPayload);


      // notify
      if(!payload.password) {
        let otpToken = {};
        otpToken.agent_email = payload.email;
        otpToken.email_token = utils.getSHAOfObject(payload.email + Math.random());
        otpToken.business_id = businessInfo.business_id;
        otpToken.user_sub_type = constants.userSubType.ADMIN;
        yield agentService.saveResetPasswordRequest(logHandler, otpToken);
        let invitation_link = config.get("frontEndUrl") + "#/login?access_token=" + otpToken.email_token;
        sendEmail(constants.emailType.RESELLER_SIGNUP, { invitation_link : invitation_link }, payload.email, "Welcome to fugu !!");
      }


      let result = {
        email          : payload.email,
        business_id    : businessInfo.business_id,
        app_secret_key : businessInfo.app_secret_key
      };
      logger.trace(logHandler, { EVENT : "Final response" }, { RESULT : result });
      return result;
    })().then(
      (data) => {
        resolve(data);
      },
      (error) => {
        reject(error);
      }
    );
  });
}


function assignReseller(logHandler, payload) {
  return new Promise((resolve, reject) => {
    payload.business_email                  = payload.business_email.trim();
    payload.reseller_email                  = payload.reseller_email.trim();
    Promise.coroutine(function* () {
      let selectPayload = {
        where_clause : {
          email : payload.business_email
        }
      };
      let result = yield  businessService.getInfoCommon(logHandler, selectPayload);
      if(_.isEmpty(result)) {
        throw new Error("Business not found with given credentials");
      }
      if(result[0].reseller_id) {
        throw new Error("Reseller already present");
      }

      let resellerSelectPayload = {
        where_clause : {
          email : payload.reseller_email
        }
      };
      let resellerInfo = yield resellerService.getInfo(logHandler, resellerSelectPayload);
      if(_.isEmpty(resellerInfo)) {
        throw new Error("Reseller not found with given credentials");
      }
      resellerInfo = resellerInfo[0];

      let updatePayload = {
        update_fields : {
          reseller_id           : resellerInfo.id,
          reseller_reference_id : payload.reference_id
        },
        where_clause : {
          business_id : result[0].business_id
        }
      };
      yield  businessService.updateInfo(logHandler, updatePayload);
      return "Reseller Updated Successfully";
    })().then(
      (data) => {
        resolve(data);
      },
      (error) => {
        reject(error);
      }
    );
  });
}

function deactivateBusiness(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      // get existing business
      let selectPayload = {
        select_columns : ["business_id", "business_name", "app_secret_key", "address", "contact_number", "email", "enabled"],
        where_clause   : {
          reseller_id           : payload.reseller_info.id,
          reseller_reference_id : payload.reference_id
        }
      };

      // deactivate if exist
      let result = yield  businessService.getInfoCommon(logHandler, selectPayload);
      if(_.isEmpty(result)) {
        throw new Error("Reseller business not found with given reference id");
      }
      let existingBusiness = result[0];
      if(!existingBusiness.enabled) {
        throw new Error("Business already deactivated");
      }
      let updatePayload = {
        update_fields : {
          enabled : 0
        },
        where_clause : {
          business_id : existingBusiness.business_id
        }
      };
      yield  businessService.updateInfo(logHandler, updatePayload);
      return existingBusiness;
    })().then(
      (data) => {
        resolve(data);
      },
      (error) => {
        reject(error);
      }
    );
  });
}

function addOrUpdateConfig(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let selectPayload = {
        where_clause : {
          reseller_id           : payload.reseller_info.id,
          reseller_reference_id : payload.reference_id
        }
      };
      let existingBusiness = yield  businessService.getInfoCommon(logHandler, selectPayload);
      if(_.isEmpty(existingBusiness)) {
        throw new Error("Reseller business not found with given reference id");
      }
      existingBusiness = existingBusiness[0];


      // update devices
      if(!_.isEmpty(payload.business_devices)) {
        let existingDevices = new Set();
        let appTypeToDevice = new Map();

        let existingBusinessDevices = yield businessService.getDeviceDetails(logHandler, { business_id : existingBusiness.business_id });
        _.each(existingBusinessDevices, (device) => {
          existingDevices.add(device.app_type);
        });

        _.each(payload.business_devices, (device) => {
          appTypeToDevice.set(utils.parseInteger(device.app_type), device);
          device.business_id = existingBusiness.business_id;
        });
        for (let [key, device] of appTypeToDevice) {
          if(existingDevices.has(key)) {
            yield businessService.updateDeviceDetails(logHandler, device);
          } else {
            yield businessService.insertDeviceDetails(logHandler, device);
          }
        }
      }
    })().then(
      (data) => {
        resolve(data);
      },
      (error) => {
        reject(error);
      }
    );
  });
}

function getBusinessInfo(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let selectPayload = {
      select_columns : ["business_name", "app_secret_key", "address", "contact_number", "email"],
      where_clause   : {
        reseller_id           : payload.reseller_info.id,
        reseller_reference_id : payload.reference_id
      }
    };

    let result = yield  businessService.getInfoCommon(logHandler, selectPayload);
    if(!result.length) {
      throw new Error("Reseller business not found with given credentials");
    }
    return result[0];
  })().then((data) => {
    UniversalFunc.sendSuccess(RESP.SUCCESS.RESELLER_BUSINESS_INFO, data, res);
  }, (error) => {
    logger.error(logHandler, { ERROR : error });
    UniversalFunc.sendError(error, res);
  });
}


function create(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let selectPayload = {
      where_clause : {
        email : payload.email
      }
    };
    let reseller = yield resellerService.getInfo(logHandler, selectPayload);
    if(reseller.length) {
      let error = new Error("Reseller Already Exist");
      error.reseller_exist = 1;
      throw error;
    }


    return yield resellerService.insert(logHandler, payload);
  })().then((data) => {
    logger.trace(logHandler, { EVENT : "Final response" }, { RESULT : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.RESELLER_CREATED, data, res);
  }, (error) => {
    logger.error(logHandler, { ERROR : error });
    if(error.reseller_exist) {
      return UniversalFunc.sendError(RESP.ERROR.eng.RESELLER_PRESENT, res);
    }
    return UniversalFunc.sendError(RESP.ERROR.eng.RESELLER_BUSINESS_INFO, res);
  });
}

function update(logHandler, payload, res) {
  payload.file_type = "pem";
  payload.randomizeFileName = true;

  Promise.coroutine(function* () {
    // upload pem file
    if(payload.files && payload.files.length > 0) {
      payload.file = payload.files[0];
      let uploadLocation = yield utilityService.uploadFile(logHandler, payload);
      payload.certificate = uploadLocation.url;
    }

    // update reseller info
    let updatePayload = {
      update_fields : payload,
      where_clause  : {
        id : payload.reseller_info.id
      }
    };
    yield resellerService.update(logHandler, updatePayload);


    let selectPayload = {
      select_columns : ["name", "email", "phone_no", "reseller_token", "api_key", "certificate", "topic"],
      where_clause   : {
        id : payload.reseller_info.id
      }
    };
    return yield resellerService.getInfo(logHandler, selectPayload);
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.RESELLER_INFO_UPDATED, data, res);
  }, (error) => {
    logger.error(logHandler, { EVENT : "ERROR while updating reseller info" }, { ERROR : error.message });
    UniversalFunc.sendError(RESP.ERROR.eng.RESELLER_UPDATE_FAILURE, res);
  });
}

function disable(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let updatePayload = {
      update_fields : {
        status : 0
      },
      where_clause : {
        email : payload.email
      }
    };
    yield resellerService.update(logHandler, updatePayload);
    return {};
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.RESELLER_DISABLED, data, res);
  }, (error) => {
    logger.error(logHandler, { EVENT : "ERROR while disabling reseller" }, { ERROR : error.message });
    UniversalFunc.sendError(RESP.ERROR.eng.RESELLER_UPDATE_FAILURE, res);
  });
}

function resellerInfo(logHandler, payload, res) {
  Promise.coroutine(function* () {
    if(payload.refresh_token) {
      let updatePayload = {
        update_fields : {
          reseller_token : md5(payload.email + Math.random())
        },
        where_clause : {
          email : payload.email
        }
      };
      yield resellerService.update(logHandler, updatePayload);
    }

    let selectPayload = {
      select_columns : ["name", "email", "phone_no", "reseller_token", "api_key", "certificate", "topic"],
      where_clause   : {
        email : payload.email
      }
    };
    return yield resellerService.getInfo(logHandler, selectPayload);
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, { EVENT : "ERROR while fetching reseller token" }, { ERROR : error.message });
    UniversalFunc.sendError(RESP.ERROR.eng.RESELLER_BUSINESS_INFO, res);
  });
}

function resellerPutUserDetails(logHandler, payload, res) {
  Promise.coroutine(function* () {
    // fetch business info
    let selectPayload = {
      where_clause : {
        reseller_id           : payload.reseller_info.id,
        reseller_reference_id : payload.reference_id
      }
    };
    let businessInfo = yield  businessService.getInfoCommon(logHandler, selectPayload);
    if(!businessInfo.length) {
      throw new Error("Reseller business not found with given credentials");
    }

    // putUser details
    payload.businessInfo = businessInfo[0];
    return yield UserController.putUserDetailsV1(logHandler, payload);
  })().then((data) => {
    UniversalFunc.sendSuccess(RESP.SUCCESS.RESELLER_BUSINESS_INFO, data, res);
  }, (error) => {
    logger.error(logHandler, { ERROR : error });
    UniversalFunc.sendError(error, res);
  });
}

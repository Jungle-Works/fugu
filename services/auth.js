/**
 * Created by ashishprasher on 23/11/17.
 */



const Promise                       = require('bluebird');
const _                             = require('underscore');
const config                        = require('config');
const logger                        = require('../Routes/logging');
const constants                     = require('../Utils/constants');
const utilityService                = require('../services/utility');
const utils                         = require('../Controller/utils');


const authServerBaseUrl             = config.get('AUTH.url');
const authServerSecretKey           = config.get('AUTH.auth_key');

exports.authenticateUser            = authenticateUser;
exports.registerUser                = registerUser;
exports.getAuthUserDetails          = getAuthUserDetails;
exports.updateAuthUser              = updateAuthUser;
exports.addCard                     = addCard;
exports.getCard                     = getCard;
exports.deductPayment               = deductPayment;



function authenticateUser(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let userData = {};
      let options = {
        url    : authServerBaseUrl + constants.API_END_POINT.AUTHENTICATE_USER,
        method : 'POST',
        json   : {
          email    : payload.email,
          password : payload.password,
          offering : constants.SERVER_AUTH_CONSTANTS.OFFERING_ID,
          auth_key : authServerSecretKey
        }
      };
      let authServerResponse = yield utilityService.sendHttpRequest(logHandler, options);
      if(authServerResponse.status != 200) {
        logger.error(logHandler, authServerResponse);
      }
      if(!_.isEmpty(authServerResponse.data)) {
        userData =  authServerResponse.data[0];
      }
      return userData;
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}

function registerUser(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let userData = {};
    Promise.coroutine(function* () {
      let options = {
        url    : authServerBaseUrl + constants.API_END_POINT.REGISTER_USER,
        method : 'POST',
        json   : {
          email               : payload.email,
          username            : payload.email,
          first_name          : payload.full_name,
          password            : payload.password,
          phone               : payload.phone_number,
          timezone            : payload.timezone || "-330",
          country_phone_code  : payload.country_phone_code || "IN",
          offering            : constants.SERVER_AUTH_CONSTANTS.OFFERING_ID,
          internal_user       : constants.SERVER_AUTH_CONSTANTS.INTERNAL_USER,
          layout_type         : constants.SERVER_AUTH_CONSTANTS.LAYOUT_TYPE,
          setup_wizard_step   : constants.SERVER_AUTH_CONSTANTS.SETUP_WIZARD_STEP,
          company_address     : constants.SERVER_AUTH_CONSTANTS.COMPANY_ADDRESS,
          company_latitude    : constants.SERVER_AUTH_CONSTANTS.LATITUDE,
          company_longitude   : constants.SERVER_AUTH_CONSTANTS.LONGITUDE,
          dashboard_version   : constants.SERVER_AUTH_CONSTANTS.DASHBOARD_VERSION,
          registration_type   : constants.SERVER_AUTH_CONSTANTS.OFFERING_ID,
          verification_status : constants.SERVER_AUTH_CONSTANTS.VERIFICATION_STATUS,
          auth_key            : authServerSecretKey
        }
      };
      let authServerResponse = yield utilityService.sendHttpRequest(logHandler, options);
      if(authServerResponse.status != 200) {
        logger.error(logHandler, authServerResponse);
      }
      if(!_.isEmpty(authServerResponse.data)) {
        userData =  authServerResponse.data;
      }
      return userData;
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}


function getAuthUserDetails(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let userData = {};
    Promise.coroutine(function* () {
      // get info using email/user_id/access_token
      let options = {
        url    : authServerBaseUrl + constants.API_END_POINT.GET_USER_DETAIL,
        method : 'POST',
        json   : {
          offering    : constants.SERVER_AUTH_CONSTANTS.OFFERING_ID,
          auth_key    : authServerSecretKey,
          field_names : "access_token, first_name, last_name, company_name, company_address, password, phone, email"
        }
      };

      // set search fields
      utils.addAllKeyValues(payload, options.json);

      let authServerResponse = yield utilityService.sendHttpRequest(logHandler, options);

      if(authServerResponse.status != 200) {
        logger.error(logHandler, authServerResponse);
      }
      if(!_.isEmpty(authServerResponse.data)) {
        userData =  authServerResponse.data[0];
      }
      return userData;
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}



function updateAuthUser(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let options = {
        url    : authServerBaseUrl + constants.API_END_POINT.UPDATE_USER,
        method : 'POST',
        json   : {
          user_id  : payload.auth_user_id,
          updates  : payload.updates,
          offering : constants.SERVER_AUTH_CONSTANTS.OFFERING_ID,
          auth_key : authServerSecretKey
        }
      };
      let authServerResponse = yield utilityService.sendHttpRequest(logHandler, options);
      if(authServerResponse.status != 200) {
        throw new Error(authServerResponse.message);
      }
      return authServerResponse;
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}

function addCard(logHandler, payload) {
  logger.info(logHandler, "stripe_token: " + payload.stripe_token + " for business: " + payload.business_id);
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let options = {
        url    : authServerBaseUrl + constants.API_END_POINT.ADD_CARD,
        method : 'POST',
        json   : {
          access_token : payload.access_token,
          user_id      : payload.auth_user_id,
          stripe_token : payload.stripe_token,
          offering     : constants.SERVER_AUTH_CONSTANTS.OFFERING_ID,
          auth_key     : authServerSecretKey
        }
      };
      return yield utilityService.sendHttpRequest(logHandler, options);
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}

function getCard(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let options = {
        url    : authServerBaseUrl + constants.API_END_POINT.GET_CARD,
        method : 'POST',
        json   : {
          access_token : payload.access_token,
          user_id      : payload.auth_user_id,
          offering     : constants.SERVER_AUTH_CONSTANTS.OFFERING_ID,
          auth_key     : authServerSecretKey
        }
      };
      return yield utilityService.sendHttpRequest(logHandler, options);
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}

function deductPayment(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let options = {
        url    : authServerBaseUrl + constants.API_END_POINT.DEDUCT_PAYMENT,
        method : 'POST',
        json   : {
          access_token   : payload.access_token,
          user_id        : payload.auth_user_id,
          billing_amount : payload.billing_amount,
          offering       : constants.SERVER_AUTH_CONSTANTS.OFFERING_ID,
          auth_key       : authServerSecretKey
        }
      };
      let authServerResponse = yield utilityService.sendHttpRequest(logHandler, options);
      if(authServerResponse.status != 200) {
        let error = { msg : "PAYMENT FAILED", req : payload, res : authServerResponse };
        logger.error(logHandler, error);
      }


      let response = {};
      response.transaction_status   = 0;
      if(authServerResponse.data) {
        response.transaction_status = authServerResponse.data.transaction_status;
        response.transaction_id     = authServerResponse.data.transaction_id;
      }
      return response;
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}

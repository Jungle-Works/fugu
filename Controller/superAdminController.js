/**
 * Created by puneetkumar on 05/12/17.
 */



const bcrypt                        = require('bcryptjs');
const _                             = require('underscore');
const Promise                       = require('bluebird');

const saltRounds                    = 10;
const RESP                          = require('../Config').responseMessages;
const constants                     = require('../Utils/constants');
const utils                         = require('./utils');
const superAdminService             = require('../services/superAdmin');

exports.superAdminLogin             = superAdminLogin;

function superAdminLogin(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let loginViaAccessToken = !payload.email;
      let error   = {};
      let opts    = {};
      let expiryDateTime;
      let hashPassword = !loginViaAccessToken ? utils.getSHA256(payload.password) : 0;
      let adminDetails = yield superAdminService.getInfoUsingEmailOrAccessToken(logHandler, payload);
      if(_.isEmpty(adminDetails)) {
        error.errorResponse = RESP.ERROR.eng.NOT_REGISTERED;
        if(loginViaAccessToken) {
          error.errorResponse = RESP.ERROR.eng.INVALID_ACCESS_TOKEN;
        }
        throw error;
      }
      if(!loginViaAccessToken && (adminDetails[0].password != hashPassword)) {
        error.errorResponse = RESP.ERROR.eng.INVALID_CREDENTIALS;
        throw error;
      }

      if(!loginViaAccessToken) {
        opts.user_id = adminDetails[0].user_id;
        opts.access_token = bcrypt.hashSync(payload.email, saltRounds);
        expiryDateTime = utils.addMinutesToDate(new Date(), constants.superAdminTokenExpiryTimeInMin);
        opts.access_token_expiry_datetime = expiryDateTime;
        opts.updated_at = new Date();
        yield superAdminService.updateInfo(logHandler, opts);
        return opts;
      }

      let result = utils.compareDate(new Date(), adminDetails[0].access_token_expiry_datetime);
      if(result != -1) {
        error.errorResponse = RESP.ERROR.eng.INVALID_ACCESS_TOKEN;
        throw error;
      }
      opts.user_id = adminDetails[0].user_id;
      opts.access_token = payload.access_token;
      return opts;
    })().then(
      (data) => { resolve(data); },
      (error) => {
        reject(error);
      }
    );
  });
}

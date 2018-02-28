
const config                        = require('config');
const _                             = require('underscore');
const Promise                       = require('bluebird');
const RESP                          = require('../Config').responseMessages;
const UniversalFunc                 = require('../Utils/universalFunctions');
const logger                        = require('../Routes/logging');
const ConversationController        = require('../Controller/conversationController');
const userService                   = require('../services/user');
const businessService               = require('../services/business');
const constants                     = require('../Utils/constants');
const channelService                = require('../services/channel');
const utilityService                = require('../services/utility');
const UserController                = require('../Controller/userController');

exports.fuguExternalCreateConversation = fuguExternalCreateConversation;
exports.thirdPartySendMessage          = thirdPartySendMessage;
exports.fuguPutUserDetails             = fuguPutUserDetails;
exports.fuguCreateConversation         = fuguCreateConversation;
exports.editFuguUserInfo               = editFuguUserInfo;


function fuguExternalCreateConversation(logHandler, payload, res) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      if(payload.shared_secret_key != constants.jugnooDelivery.SECRETKEY) {
        throw new Error("Unauthroized");
      }
      payload.businessInfo = yield businessService.getInfo(logHandler, payload);

      let userDetails = yield userService.checkUniqueUser(logHandler, payload);
      if(_.isEmpty(userDetails)) {
        throw new Error("Invalid User Unique Key");
      }
      payload.user_id = userDetails[0].user_id;
      payload.userInfo  = userDetails[0];
      return yield ConversationController.createConversation(logHandler, payload);
    })().then((data) => {
      logger.trace(logHandler, { SUCCESS : data });
      resolve(data);
    }, (error) => {
      logger.error(logHandler, { ERROR : error });
      reject(error);
    });
  });
}



function thirdPartySendMessage(logHandler, data) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let {
        transactionId, message, sharedSecret, userEmail
      } = data;

      if(sharedSecret !== constants.jugnooDelivery.SECRETKEY) {
        throw new Error('Unauthorized');
      }
      // message is expected in data field
      let { channel_id, agent_id } = yield channelService.getChannelDetailsTransactionId(logHandler, transactionId, userEmail);

      // check if chat is unassigned
      if(channel_id === undefined) {
        logger.trace(logHandler, { EVENT : "getChannelDetailsTransactionId", DATA : "CHANNEL NOT FOUND" });
        return;
      }

      if(agent_id === undefined || agent_id === null) {
        agent_id = config.get("USERID");
      }

      let opts = {
        channel  : "/" + channel_id,
        clientId : undefined,
        data     : {
          date_time      : new Date().toString(),
          full_name      : undefined,
          // index: undefined,
          is_typing      : 0,
          message        : message,
          message_status : 0,
          message_type   : 1,
          user_id        : agent_id,
          user_type      : 2
        }
      };
      logger.trace(logHandler, { PREPARED_MESSAGE : opts });

      let options = {
        url    : config.get('fuguChatURL') + constants.API_END_POINT.HANDLE_MESSAGE,
        method : 'POST',
        json   : {
          content : opts
        }
      };
      utilityService.sendHttpRequest(logHandler, options);
    })().then((data) => {
      logger.trace(logHandler, { SUCCESS : data });
      resolve(data);
    }, (error) => {
      logger.error(logHandler, { ERROR : error });
      reject(error);
    });
  });
}


function fuguPutUserDetails(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      // putUser details
      return yield UserController.putUserDetailsV1(logHandler, payload);
    })().then((data) => {
      logger.trace(logHandler, { SUCCESS : data });
      resolve(data);
    }, (error) => {
      logger.error(logHandler, { ERROR : error });
      reject(error);
    });
  });
}

function fuguCreateConversation(logHandler, payload) {
  Promise.coroutine(function* () {
    // create conversation
    if(!payload.user_id) {
      throw new Error("invalid user id");
    }
    return yield ConversationController.createConversation(logHandler, payload);
  })().then((data) => {
    UniversalFunc.sendSuccess(RESP.SUCCESS.RESELLER_BUSINESS_INFO, data, res);
  }, (error) => {
    logger.error(logHandler, { ERROR : error });
    UniversalFunc.sendError(error, res);
  });
}

function editFuguUserInfo(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      if(!constants.keyToComponent[payload.component_key]) {
        throw new Error("Authentication Error!");
      }
      payload.business_id = payload.businessInfo.business_id;

      let userInfo = yield userService.checkUniqueUser(logHandler, { user_unique_key : payload.user_unique_key, business_id : payload.business_id });
      if(_.isEmpty(userInfo)) {
        throw new Error("Invalid User Unique Key!");
      }
      yield userService.updateFuguUserInfo(logHandler, payload);
      return {};
    })().then((data) => {
      logger.trace(logHandler, "UPDATING USER INFO RESULT", data);
      resolve(data);
    }, (error) => {
      logger.error(logHandler, { ERROR : error });
      reject(error);
    });
  });
}




const async                         = require('async');
const config                        = require('config');
const request                       = require('request');
const cache                         = require('memory-cache');
const _                             = require('underscore');
const Promise                       = require('bluebird');
const dbHandler                     = require('../database').dbHandler;
const notificationBuilder           = require('../Builder/notification');
const RESP                          = require('../Config').responseMessages;
const sendEmail                     = require('../Notification/email').sendEmailToUser;
const constants                     = require('../Utils/constants');
const utils                         = require('./utils');
const UniversalFunc                 = require('../Utils/universalFunctions');
const logger                        = require('../Routes/logging');
const notification                  = require('../Controller/pushNotification');
const userService                   = require('../services/user');
const conversationService           = require('../services/conversation');
const notifierService               = require('../services/notifier');
const utilityService                = require('../services/utility');
const businessService               = require('../services/business');
const channelService                = require('../services/channel');
const pushNotificationController    = require('./pushNotification');
const pushNotificationBuilder       = require('../Builder/pushNotification');

exports.getUsers                = getUsers;
exports.getUserDetails          = getUserDetails;
exports.editUserDetails         = editUserDetails;
exports.entryEmail              = entryEmail;
exports.userLogout              = userLogout;
exports.logException            = logException;
exports.putUserDetailsV1        = putUserDetailsV1;
exports.searchUser              = searchUser;
exports.getUserMessageStats     = getUserMessageStats;
exports.editUserInfo            = editUserInfo;
exports.getUserInfo             = getUserInfo;
exports.getUserChannelsInfo     = getUserChannelsInfo;
exports.testPushNotification    = testPushNotification;
exports.getUserChannelInfo      = getUserChannelInfo;


function getUsers(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let params = {};
    params.page_start = payload.page_start || 1;
    params.page_end   = payload.page_end || page_start + constants.getUsersPageSize - 1;
    params.anonymous_only = payload.anonymous_only;
    params.business_id    = payload.businessInfo.business_id;
    return yield userService.getActiveUsers(logHandler, params);
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}


function getUserDetails(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let user_id                 = payload.user_id;
    let migratedUser = yield  userService.getUserMigrationInfo(logHandler, user_id);
    if(!_.isEmpty(migratedUser)) {
      user_id = migratedUser[0].migrated_user_id;
    }
    let userDetails = yield userService.getUserDetails(logHandler, user_id);
    if(userDetails.length <= 0) { throw new Error("No User found with userId : " + user_id); }

    if(userDetails[0].attributes) {
      userDetails[0].full_address = utils.getFormattedAddress(logHandler, userDetails[0].attributes);
    }

    return userDetails;
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}


function getUserInfo(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let user_id                 = payload.user_id;
    let migratedUser = yield  userService.getUserMigrationInfo(logHandler, user_id);
    if(!_.isEmpty(migratedUser)) {
      user_id = migratedUser[0].migrated_user_id;
    }
    let userDetails = yield userService.getUserDetails(logHandler, user_id);
    if(userDetails.length <= 0) { throw new Error("No User found with userId : " + user_id); }

    if(userDetails[0].user_properties) {
      userDetails[0].user_properties = utils.jsonToObject(logHandler, userDetails[0].user_properties);
    }
    if(userDetails[0].attributes) {
      userDetails[0].full_address = utils.getFormattedAddress(logHandler, userDetails[0].attributes);
    }

    return [userDetails[0]];
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}

function getUserChannelsInfo(logHandler, payload, res) {
  Promise.coroutine(function* () {
    return yield channelService.getUserChannelsInfo(logHandler, payload.user_id);
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}


function getUserChannelInfo(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let channelInfo = payload.channelInfo;
    let channelToUnreadCount = yield conversationService.getUnreadCountForCustomer(logHandler, [channelInfo.channel_id], payload.user_id);
    return {
      label        : channelInfo.custom_label || '',
      unread_count : channelToUnreadCount[channelInfo.channel_id] || 0
    };
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}

function editUserDetails(logHandler, payload, res) {
  Promise.coroutine(function* () {
    // update user info
    let userInfo = {};
    userInfo.user_id       = payload.user_id;
    userInfo.business_id   = payload.businessInfo.business_id;

    let migratedUser = yield  userService.getUserMigrationInfo(logHandler, userInfo.user_id);
    if(!_.isEmpty(migratedUser)) {
      userInfo.user_id = migratedUser[0].migrated_user_id;
    }

    yield userService.updateInfo(logHandler, payload, userInfo);
    logger.trace(logHandler, { EVENT : "Final response" }, { RESULT : userInfo });

    return userInfo;
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.ENTRY_EDIT_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, { EVENT : "EDIT USER DETAILS ERROR" }, { MESSAGE : error.message });
    UniversalFunc.sendError(error, res);
  });
}


function editUserInfo(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let userInfo             = payload.userInfo;
    let businessInfo         = payload.businessInfo;
    let userUpdateObject     = {};
    userUpdateObject.user_id = userInfo.user_id;
    userUpdateObject.business_id = businessInfo.business_id;
    userUpdateObject.user_properties  = utils.jsonToObject(logHandler, userInfo.user_properties);

    // prepare upload info
    if(!_.isEmpty(payload.files)) {
      payload.file = payload.files[0];
      let s3_url   = yield utilityService.uploadFile(logHandler, { file : payload.files[0] });
      if(s3_url) {
        userUpdateObject.user_image = s3_url.url;
      }
    }

    // update user info
    if(payload.user_properties) {
      if(!userUpdateObject.user_properties) {
        userUpdateObject.user_properties = {};
      }
      _.each(payload.user_properties, (value, key) => {
        if(constants.validUserProperties.has(key)) {
          userUpdateObject.user_properties[key] = value;
        }
      });
    }
    if(payload.notification_level) {
      userUpdateObject.notification_level = payload.notification_level;
    }
    yield userService.updateInfo(logHandler, userUpdateObject, userInfo);


    // notification update
    let notificationUpdate = {};
    notificationUpdate.user_id = userInfo.user_id;
    if(payload.mute_channel_id) {
      notificationUpdate.channel_id = payload.mute_channel_id;
      notificationUpdate.notification = constants.pushNotification.MUTED;
      yield userService.updateUserToChannel(logHandler, notificationUpdate);
    }
    if(payload.unmute_channel_id) {
      notificationUpdate.channel_id = payload.unmute_channel_id;
      notificationUpdate.notification = constants.pushNotification.UNMUTED;
      yield userService.updateUserToChannel(logHandler, notificationUpdate);
    }


    logger.trace(logHandler, { EVENT : "Final response" }, { RESULT : {} });
    return {};
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.ENTRY_EDIT_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, { EVENT : "EDIT USER DETAILS ERROR" }, { MESSAGE : error.message });
    UniversalFunc.sendError(error, res);
  });
}

function getUserMessageStats(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      if(payload.shared_secret != constants.jugnooDelivery.SECRETKEY) {
        throw new Error("Authentication Error");
      }
      let channelInfo = yield channelService.getUserChannelStatsByUserUniqueKey(logHandler, payload.user_unique_key);
      let channelIds = [];
      _.each(channelInfo, (row) => {
        channelIds.push(row.channel_id);
      });

      if(_.isEmpty(channelIds)) {
        return;
      }

      let messageCount = yield conversationService.getChannelsTotalMessageCount(logHandler, channelIds);

      for (let i = 0; i < channelInfo.length; i++) {
        channelInfo[i].total_message = messageCount[channelInfo[i].channel_id] || 0;
        channelInfo[i].label = channelInfo[i].label || channelInfo[i].custom_label;
        delete channelInfo[i].custom_label;
      }

      return channelInfo;
    })().then((data) => {
      logger.trace(logHandler, { RESPONSE : data });
      resolve(data);
    }, (error) => {
      logger.error(logHandler, { EVENT : "EDIT USER DETAILS ERROR" }, { MESSAGE : error.message });
      reject(error);
    });
  });
}

function entryEmail(logHandler, payload, entryEmail) {
  var email                       = payload.email,
    name                        = payload.name,
    contact_no                  = payload.contact_no,
    additional_info             = payload.additional_info;

  async.auto({
    checkIfAlreadyRegistered : function (cb) {
      let sql = "SELECT * FROM `request_emails` WHERE `email` = ? ";
      dbHandler.query(logHandler, "checkIfAlreadyRegistered", sql, [email], (err, resp) => {
        if(err) {
          logger.error(logHandler, "There was some problem in the checkIfAlreadyRegistered users query", err);
          cb("There was some problem in the checkIfAlreadyRegistered users query" + err);
        } else if(resp.length > 0) {
          logger.error(logHandler, "This email has already requested the services", resp);
          let emailContent = {
            full_name       : "Fugu Lead", email           : email, name            : name, contact_no      : contact_no, additional_info : additional_info
          };
          if(utils.isEnv('production')) {
            sendEmail(constants.emailType.REQUEST_MAIL, emailContent, constants.FUGU_EMAIL, "[Retrying] New lead for Fugu");
          }
          cb(RESP.ERROR.eng.ALREADY_REQUESTED_USER);
        } else {
          logger.trace(logHandler, "This is a new email", resp);
          cb(null, resp);
        }
      });
    },
    insertEmailRequest : ['checkIfAlreadyRegistered', function (result, cb) {
      let sql = "INSERT INTO `request_emails`(`email`,`name`,`contact_no`) VALUES(?,?,?)";
      dbHandler.query(logHandler, "insertEmailRequest", sql, [email, name, contact_no], function (err, response) {
        if(err) {
          logger.error(logHandler, "There was some problem in the request query", err, "query", this.sql, 'data', email, name, contact_no);
          cb(err);
        } else {
          logger.trace(logHandler, "Everything was fine in inserting the request query", response);
          name = name ? 'Name : ' + name : '';
          contact_no  = contact_no ? 'Contact Number : ' + contact_no : '';
          additional_info = additional_info ? 'Additional Info : ' + utils.objectStringify(additional_info, undefined, '\t') : '';

          let emailContent = {
            full_name       : "Fugu Lead", email           : email, name            : name, contact_no      : contact_no, additional_info : additional_info
          };
          if(utils.isEnv('production')) {
            sendEmail(constants.emailType.REQUEST_MAIL, emailContent, constants.FUGU_EMAIL, "New lead for Fugu");
          }
          cb(null, response);
        }
      });
    }]
  }, (err, res) => {
    if(err) {
      logger.error(logHandler, "There was some problem in the entryEmail", err);
      entryEmail(err);
    } else {
      logger.trace(logHandler, "Everything was fine in the entryEmail", res);
      entryEmail(null, res.insertEmailRequest);
    }
  });
}


function userLogout(logHandler, payload, cb) {
  let app_secret_key         = payload.app_secret_key;

  Promise.coroutine(function* () {
    let businessInfo = yield businessService.getInfoUsingAppSecretKey(logHandler, { app_secret_key : app_secret_key });
    let userInfo = yield userService.getInfo(logHandler, payload.user_id);
    if(!userInfo.length) {
      logger.error(logHandler, "User not found while user logout " + payload.user_id);
    }
    userInfo = userInfo[0];
    if(businessInfo.business_id == userInfo.business_id) {
      yield userService.updateInfo(logHandler, { device_token : null }, userInfo);
      if(payload.device_id && payload.device_type) {
        yield userService.updateDeviceInfo(
          logHandler, { token : null, device_id : payload.device_id, device_type : payload.device_type },
          userInfo
        );
      } else {
        let updatePayload = {
          update_fields : { token : null },
          where_clause  : { user_id : userInfo.user_id }
        };
        yield  userService.updateUserDevice(logHandler, updatePayload);
        logger.error(logHandler, "Logging out of all devices : " + userInfo.user_id + ", " + userInfo.full_name);
      }
    }

    // notifying on user logout
    let message = notificationBuilder.getObject(notificationBuilder.notificationType.USER_LOGOUT);
    message.user_id             = payload.user_id;
    let ccPush = {
      messageAt : '/' + app_secret_key + '/' + constants.ccPushEvents.USER_LOGOUT,
      message   : message
    };
    notifierService.sendControlChannelEvent(ccPush);
    return "";
  })().then((data) => {
    cb(null, data);
  }, (error) => {
    cb(error);
  });
}


function logException(logHandler, payload, res) {
  Promise.coroutine(function* () {
    utilityService.insertIntoLogException(logHandler, payload);
    return "";
  })().then((data) => {
    logger.trace(logHandler, {});
    UniversalFunc.sendSuccess(RESP.SUCCESS.ENTRY_ADDED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}


function putUserDetailsV1(logHandler, payload) {
  return new Promise((resolve, reject) => {
    payload.business_id = payload.businessInfo.business_id;
    payload.app_secret_key = payload.businessInfo.app_secret_key;
    payload.app_type = payload.app_type || 1;  // depends on business app type
    payload.attributes = payload.attributes ? utils.objectStringify(payload.attributes) : null;
    payload.custom_attributes = payload.custom_attributes ? utils.objectStringify(payload.custom_attributes) : null;
    payload.token = payload.device_token || payload.web_token;

    Promise.coroutine(function* () {
      // insert or update user
      let userInfo = yield userService.checkUniqueUser(logHandler, payload);
      logger.trace(logHandler, { USER_INFO : userInfo, params : payload });
      if(!userInfo.length) {
        payload.device_key = payload.device_key || UniversalFunc.generateRandomString(20);
        payload.source  = constants.sourceEnum[payload.source] || constants.sourceEnum[constants.source.DEFAULT];
        userInfo = yield userService.insertNew(logHandler, payload);

        let businessConfig = yield businessService.getConfiguration(logHandler, { business_id : payload.business_id });
        if(utils.parseBoolean(businessConfig[constants.businessConfig.enableGeneralChat])) {
          yield channelService.addUserToGeneralChat(logHandler, { business_id : payload.business_id, user_id : userInfo.user_id });
        }
      } else {
        userInfo = userInfo[0];
        let updatedUser = yield userService.updateInfo(logHandler, payload, userInfo);
        userInfo.device_key = updatedUser.device_key || userInfo.device_key;
      }


      // insert or update user device
      if(payload.device_details || payload.token) {
        yield userService.resetDeviceToken(logHandler, payload, userInfo);
        let userDeviceInfo = yield userService.getDeviceInfo(logHandler, payload, userInfo);
        if(!userDeviceInfo.length) {
          yield userService.insertDeviceInfo(logHandler, payload, userInfo);
        } else {
          yield userService.updateDeviceInfo(logHandler, payload, userInfo);
        }
      }


      // migrate anonymous to logged in user
      if(payload.device_key && payload.user_unique_key && payload.device_type == constants.deviceType.WEB) {
        let anonymousUser = yield userService.getAnonymousUserByDeviceKey(logHandler, payload);
        if(!_.isEmpty(anonymousUser)) {
          yield userService.userMigration(logHandler, anonymousUser[0], userInfo);
          userService.notifyMigratedUser(logHandler, anonymousUser[0], userInfo, { app_secret_key : payload.app_secret_key });
        }
      }


      // fetch conversation
      let conversations = { conversation_list : [] };
      if(!payload.neglect_conversations) {
        let options = {
          user_id       : userInfo.user_id,
          business_id   : payload.businessInfo.business_id,
          business_name : payload.businessInfo.business_name
        };
        conversations = yield Promise.promisify(conversationService.getUserConversation).call(this, logHandler, options);
      }



      // update user address using attributes
      userService.updateUserAddress(logHandler, payload, userInfo);
      let businessDetails = yield businessService.getConfiguration(logHandler, { business_id : payload.businessInfo.business_id });

      let result = {
        user_id         : userInfo.user_id,
        en_user_id      : utils.encryptText(userInfo.user_id),
        device_key      : userInfo.device_key,
        user_channel    : utils.getSHAOfObject(userInfo.user_id),
        user_unique_key : userInfo.user_unique_key || "0",
        full_name       : userInfo.full_name || payload.user_name,
        business_name   : payload.businessInfo.business_name,
        app_secret_key  : payload.businessInfo.app_secret_key,
        is_whitelabel   : utils.parseBoolean(businessDetails.is_whitelabel),
        conversations   : conversations.conversation_list
      };
      logger.trace(logHandler, { EVENT : "Final response" }, { RESULT : result });
      return result;
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}


function searchUser(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let search_query = {
      business_id : payload.businessInfo.business_id,
      search_text : payload.search_text
    };
    let searchIds =  yield userService.search(logHandler, search_query);
    let userIds = [];
    _.each(searchIds, (user) => {
      userIds.push(user.user_id);
    });
    return yield userService.getUsersWithAppInfo(logHandler, { userIds : userIds });
  })().then((data) => {
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, { EVENT : "Search User" }, { ERROR : error.message });
    UniversalFunc.sendError(error, res);
  });
}

function testPushNotification(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let userDetails = yield userService.getInfo(logHandler, payload.user_id);
    if(_.isEmpty(userDetails)) {
      throw new Error("No valid user found with user_id : " + payload.user_id);
    }
    let userIds = [];
    _.each(userDetails, (user) => {
      userIds.push(user.user_id);
    });
    let userPushList = yield userService.getUsersDeviceDetails(logHandler, { userIds : userIds });
    let payloadObj = pushNotificationBuilder.getObject(pushNotificationBuilder.notificationType.MESSAGE);
    payloadObj.push_message           = constants.pushNotification.TEST_MESSAGE;
    payloadObj.message                = constants.pushNotification.TEST_MESSAGE;
    payloadObj.title                  = constants.pushNotification.TEST_TITLE;
    payloadObj.chat_type              = 0;
    payloadObj.user_id                = 0;
    payloadObj.channel_id             = -1;
    payloadObj.label                  = "";
    payloadObj.date_time              = new Date();
    payloadObj.label_id               = -1;
    payloadObj.new_message            = constants.pushNotification.TEST_MESSAGE;
    payloadObj.last_sent_by_full_name = userDetails[0].user_id;
    payloadObj.last_sent_by_id        = userDetails[0].user_id;
    payloadObj.last_sent_by_user_type = userDetails[0].user_type;
    _.each(userPushList, (pushList) => {
      pushList.payload = payloadObj;
    });
    pushNotificationController.sendBulkNotification(logHandler, userPushList);
    return {};
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}

const logger              = require('../Routes/logging');
const notificationBuilder = require('../Builder/notification');
const constants           = require('../Utils/constants');
const config              = require('config');
const utilityService      = require('../services/utility');
const utils               = require('../Controller/utils');
const users               = require('../services/user');

exports.sendCCPushes                  = sendCCPushes;
exports.sendCCEvent                   = sendCCEvent;
exports.sendControlChannelPushes      = sendControlChannelPushes;
exports.sendControlChannelEvent       = sendControlChannelEvent;
exports.sendBusinessLevelNotification = sendBusinessLevelNotification;
exports.sendMessageToFaye             = sendMessageToFaye;


let logHandler = {
  apiModule  : "notifier",
  apiHandler : "sendControlChannelPushes"
};

function sendControlChannelPushes(opts, cb) {
  try {
    let options = {
      url    : config.get('fuguChatURL') + constants.API_END_POINT.HANDLE_PUSH,
      method : 'POST',
      json   : {
        pushObject : opts
      }
    };
    utilityService.sendHttpRequest(logHandler, options).then((data) => {}, (error) => {});
  } catch (error) {
    logger.error(logHandler, "Error in sendControlChannelPushes ", error);
  }
  if(cb) { return cb(); }
}

function sendControlChannelEvent(opts, cb) {
  try {
    let pushObject = {
      messageAt : opts.messageAt,
      message   : opts.message
    };
    let options = {
      url    : config.get('fuguChatURL') + constants.API_END_POINT.HANDLE_PUSH,
      method : 'POST',
      json   : {
        pushObject : pushObject
      }
    };
    utilityService.sendHttpRequest(logHandler, options).then((data) => {}, (error) => {});
  } catch (error) {
    logger.error(logHandler, "Error in sendControlChannelEvent ", error);
  }
  if(cb) { return cb(); }
}


function sendBusinessLevelNotification(app_secret_key, notificationType, variables) {
  let ccPush;
  switch (notificationType) {
    case notificationBuilder.notificationType.TAGS_REFRESH:
      ccPush = {
        messageAt : '/' + app_secret_key + '/' + constants.ccPushEvents.TAGS_REFRESH,
        message   : notificationBuilder.getObject(notificationType)
      };
      break;

    case notificationBuilder.notificationType.AGENTS_REFRESH:
      ccPush = {
        messageAt : '/' + app_secret_key + '/' + constants.ccPushEvents.AGENTS_REFRESH,
        message   : notificationBuilder.getObject(notificationType)
      };
      break;

    case notificationBuilder.notificationType.AGENT_REFRESH:
      let message = notificationBuilder.getObject(notificationType);
      message.agent_id = variables.agent_id;
      message.agent_info = variables.agent_info;
      ccPush = {
        messageAt : '/' + app_secret_key + '/' + constants.ccPushEvents.AGENTS_REFRESH,
        message   : message
      };
      break;

    default:
      return;
  }
  sendControlChannelEvent(ccPush);
}







//--------------------------------------------------------------
//                     SENDING CC PUSHES
//--------------------------------------------------------------


function sendCCPushes(logHandler, opts) {
  logger.trace(logHandler, "cc initializing", { ccPushListLength : opts.ccPushList.length });
  try {
    const client = global.bayeux.getClient();

    for (let userPush of opts.ccPushList) {
      const messageAt = userPush.messageAt;
      const message = userPush.message;
      // publish message
      client.publish(messageAt, message)
        .then(
          () => {
            logger.trace(logHandler, "cc message sent at : ", messageAt, " message : ", message);
          },
          (error) => {
            logger.error(logHandler, "cc message error at : ", messageAt, " error : ", error);
          }
        );
    }
  } catch (error) {
    logger.logError(logHandler, "Error in cc ", error);
  }

  // logging cc pushes
  let userList = [];
  for (let userPush of opts.ccPushList) {
    userList.push(userPush.messageTo);
  }
  userList.sort();
  logger.info(logHandler, { sendControlChannelPushes : userList });
}


function sendCCEvent(logHandler, opts) {
  try {
    const client = global.bayeux.getClient();

    const messageAt = opts.messageAt;
    const message = opts.message;
    // publish message
    client.publish(messageAt, message)
      .then(
        () => {
          logger.trace(logHandler, "cc message sent at : ", messageAt, " message : ", message);
        },
        (error) => {
          logger.error(logHandler, "cc message error at : ", messageAt, " error : ", error);
        }
      );
  } catch (error) {
    logger.logError(logHandler, "Error in cc ", error);
  }

  logger.info(logHandler, { sendControlChannelEvent : opts });
}

// TODO : refactor
function sendMessageToFaye(logHandler, opts) {
  try {
    const client = global.bayeux.getClient();
    const messageAt = opts.channel;
    const message = opts.data;
    var params = {
      userIds : [message.user_id]
    };
    message.server_push = 1;
    message.date_time = utils.getCurrentTime();
    users.getUsersWithIds(logHandler, params).then((result) => {
      if(!result.length) {
        logger.logError(logHandler, "Error in sending message ", "no user found");
      } else {
        message.full_name = result[0].full_name || "";
      }
      // publish message
      client.publish(messageAt, message)
        .then(
          () => {
            logger.trace(logHandler, "cc message sent at : ", messageAt, " message : ", message);
          },
          (error) => {
            logger.error(logHandler, "cc message error at : ", messageAt, " error : ", error);
          }
        );
    });
  } catch (error) {
    logger.logError(logHandler, "Error in cc ", error);
  }
}

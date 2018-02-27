const request         = require('request');
const cache           = require('memory-cache');
const apns            = require('apn');
const FCM             = require('fcm-push');
const GCM             = require('node-gcm');
const async           = require('async');
const Promise         = require('bluebird');
const config          = require('config');
const apnConnect      = require('../Config/apnConnect');
const constants       = require('../Utils/constants');
const dbHandler       = require('../database').dbHandler;
const logger          = require('../Routes/logging');
const utils           = require('../Controller/utils');
const businessService = require('../services/business');
const pushLogsService = require('../services/pushLogs');




exports.clearAllAPNSConnections = clearAllAPNSConnections;
exports.sendNotification        = sendNotification;
exports.sendBulkNotification    = sendBulkNotification;
exports.webNotification         = webNotification;


// let apnsConnection = {};
function clearAllAPNSConnections() {
  // apnsConnection = {};
}

function sendNotification(logHandler, notificationObject) {
  let businessId = notificationObject.business_id;
  let pushTo     = notificationObject.push_to;
  let deviceToken = notificationObject.device_token;
  let deviceType = notificationObject.device_type;
  let appType = notificationObject.app_type || 1;
  let deviceInfo = notificationObject.device_info;
  let payload  = notificationObject.payload;
  logger.trace(logHandler, { pushNotificationObject : notificationObject });
  let businessDetailsWrapper = {};
  let dataWrapper = {
    business_id : businessId,
    app_type    : appType
  };


  let asyncTasks = [];

  if(!utils.isValidObject(deviceType) || deviceType == constants.deviceType.WEB) {
    logger.trace(logHandler, "Skipping notification for device type : ", deviceType);
    return;
  }

  if(!deviceToken) {
    logger.trace(logHandler, "Skipping push user_id : " + pushTo + "device_token : " + deviceToken + " payload : " + JSON.stringify(payload));
    return;
  }


  let BUSINESS_DEVICE_MAPPINGS = cache.get(constants.cache.BUSINESS_DEVICE_MAPPINGS);
  if(!BUSINESS_DEVICE_MAPPINGS[businessId] || !BUSINESS_DEVICE_MAPPINGS[businessId][appType]) {
    asyncTasks.push(fetchBusinessDeviceDetails.bind(null, logHandler, dataWrapper, businessDetailsWrapper));
  }

  async.series(asyncTasks, (err) => {
    if(err) {
      logger.error(logHandler, "NOTIFICATION COULD NOT BE SENT");
      logger.error(logHandler, "ERROR : ", err.message);
      return;
    }

    if(!BUSINESS_DEVICE_MAPPINGS[businessId] || !BUSINESS_DEVICE_MAPPINGS[businessId][appType]) {
      if(!mappingDataValidation(deviceType, businessDetailsWrapper.data)) {
        logger.trace(logHandler, "Invalid business device details ", businessDetailsWrapper.data);
        return;
      }
      BUSINESS_DEVICE_MAPPINGS[businessId] = {};
      BUSINESS_DEVICE_MAPPINGS[businessId][appType] = businessDetailsWrapper.data;
    }


    if(deviceType == constants.deviceType.ANDROID) {
      sendAndroidPushNotificationInternal(logHandler, BUSINESS_DEVICE_MAPPINGS, businessId, pushTo, deviceToken, payload, deviceInfo.timeToLive, appType);
    } else if(deviceType == constants.deviceType.IOS) {
      sendIosPushNotificationInternal(logHandler, BUSINESS_DEVICE_MAPPINGS, businessId, pushTo, deviceToken, payload.message, payload, appType);
    }
  });
}

function sendBulkNotification(logHandler, pushNotifications, pushLogData) {
  Promise.coroutine(function* () {
    let businessId  = pushNotifications[0].business_id;
    let payload     = pushNotifications[0].payload;
    logger.trace(logHandler, { pushNotifications : pushNotifications });
    let businessDetailsWrapper = {};
    let androidPushes       = {};
    let iosPushes           = {};
    let deviceTokenToUserId = {};


    for (let i = 0; i < pushNotifications.length; i++) {
      deviceTokenToUserId[pushNotifications[i].device_token] = pushNotifications[i].push_to;
      if(pushNotifications[i].device_type == constants.deviceType.ANDROID) {
        let key = pushNotifications[i].app_type;
        if(!androidPushes[key]) {
          androidPushes[key] = [pushNotifications[i].device_token];
        } else {
          androidPushes[key].push(pushNotifications[i].device_token);
        }
      } else if(pushNotifications[i].device_type == constants.deviceType.IOS) {
        let key = pushNotifications[i].app_type;
        if(!iosPushes[key]) {
          iosPushes[key] = [pushNotifications[i].device_token];
        } else {
          iosPushes[key].push(pushNotifications[i].device_token);
        }
      }
    }

    for (let key in androidPushes) {
      let appType = key;
      let deviceTokens = androidPushes[key];
      let dataWrapper = {
        business_id : businessId,
        app_type    : appType
      };
      let BUSINESS_DEVICE_MAPPINGS = cache.get(constants.cache.BUSINESS_DEVICE_MAPPINGS);
      if(!BUSINESS_DEVICE_MAPPINGS[businessId] || !BUSINESS_DEVICE_MAPPINGS[businessId][appType]) {
        let data = yield businessService.getBusinessDeviceDetails(logHandler, dataWrapper);
        businessDetailsWrapper.data = data[0];
      }
      if(!BUSINESS_DEVICE_MAPPINGS[businessId] || !BUSINESS_DEVICE_MAPPINGS[businessId][appType]) {
        if(!mappingDataValidation(constants.deviceType.ANDROID, businessDetailsWrapper.data)) {
          logger.trace(logHandler, "Invalid business device details ", businessDetailsWrapper.data);
          return;
        }
        BUSINESS_DEVICE_MAPPINGS[businessId] = {};
        BUSINESS_DEVICE_MAPPINGS[businessId][appType] = businessDetailsWrapper.data;
      }
      sendAndroidBulkPushNotificationInternal(logHandler, BUSINESS_DEVICE_MAPPINGS, businessId, deviceTokens, payload, 0, appType, deviceTokenToUserId, pushLogData);
    }
    for (let key in iosPushes) {
      let appType = key;
      let deviceTokens = iosPushes[key];
      let dataWrapper = {
        business_id : businessId,
        app_type    : appType
      };
      let BUSINESS_DEVICE_MAPPINGS = cache.get(constants.cache.BUSINESS_DEVICE_MAPPINGS);
      if(!BUSINESS_DEVICE_MAPPINGS[businessId] || !BUSINESS_DEVICE_MAPPINGS[businessId][appType]) {
        let data = yield businessService.getBusinessDeviceDetails(logHandler, dataWrapper);
        businessDetailsWrapper.data = data[0];
      }
      if(!BUSINESS_DEVICE_MAPPINGS[businessId] || !BUSINESS_DEVICE_MAPPINGS[businessId][appType]) {
        if(!mappingDataValidation(constants.deviceType.IOS, businessDetailsWrapper.data)) {
          logger.trace(logHandler, "Invalid business device details ", businessDetailsWrapper.data);
          return;
        }
        BUSINESS_DEVICE_MAPPINGS[businessId] = {};
        BUSINESS_DEVICE_MAPPINGS[businessId][appType] = businessDetailsWrapper.data;
      }
      sendIosBulkPushNotificationInternal(logHandler, BUSINESS_DEVICE_MAPPINGS, businessId, deviceTokens, payload.message, payload, appType, deviceTokenToUserId, pushLogData);
    }
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
  }, (error) => {
    logger.error(logHandler, error);
  });
}

function sendAndroidPushNotificationInternal(logHandler, BUSINESS_DEVICE_MAPPINGS, businessId, pushTo, deviceToken, payload, timeToLive, appType, notification_type) {
  let notificationDataObj = {
    device_token : deviceToken,
    message      : payload,
    time_to_live : timeToLive,
    business_id  : businessId,
    app_type     : appType,
    push_to      : pushTo
  };

  sendAndroidPushNotificationFCM(logHandler, BUSINESS_DEVICE_MAPPINGS, notificationDataObj);
}

function sendAndroidBulkPushNotificationInternal(logHandler, BUSINESS_DEVICE_MAPPINGS, businessId, deviceTokens, payload, timeToLive, appType, deviceTokenToUserId, pushLogData) {
  let notificationDataObj = {
    message      : payload,
    time_to_live : timeToLive,
    business_id  : businessId,
    app_type     : appType,
  };
  let iterations = parseInt(deviceTokens.length / constants.androidBatchPushLimit);
  if(deviceTokens.length % constants.androidBatchPushLimit > 0) {
    iterations++;
  }

  for (let i = 0; i < iterations; i++) {
    notificationDataObj.device_tokens = deviceTokens.slice(i * constants.androidBatchPushLimit, (i + 1) * constants.androidBatchPushLimit);
    sendAndroidBulkPushNotificationFCM(logHandler, BUSINESS_DEVICE_MAPPINGS, notificationDataObj, deviceTokenToUserId, pushLogData);
  }
}


function sendAndroidPushNotificationFCM(logHandler, BUSINESS_DEVICE_MAPPINGS, notificationDataObj) {
  let deviceToken     = notificationDataObj.device_token;
  let timeToLive      = notificationDataObj.time_to_live;
  let message         = notificationDataObj.message;
  let businessId      = notificationDataObj.business_id;
  let appType         = notificationDataObj.app_type;
  let pushTo          = notificationDataObj.push_to;

  let pushMessage = {
    to         : deviceToken,
    timeToLive : timeToLive || 2419200,
    data       : {
      message     : message,
      push_source : constants.pushSource.FUGU,
      app_name    : BUSINESS_DEVICE_MAPPINGS[businessId][appType].app_name
    }
  };

  let pushDetails = {
    businessId  : businessId,
    appType     : appType,
    pushMessage : pushMessage
  };

  let sender = new FCM(BUSINESS_DEVICE_MAPPINGS[businessId][appType].api_key);
  sender.send(pushMessage, (err, result) => {
    if(err) {
      logger.error(logHandler, { FCM_ERROR : err, push_to : pushTo, app_type : appType });
      logger.trace(logHandler, "PUSH_DETAILS : ", pushDetails);
    } else {
      logger.trace(logHandler, "Sending FCM push ");
      logger.trace(logHandler, "PUSH_DETAILS : ", pushDetails);
      logger.trace(logHandler, "RESULT : ", result);
    }

    sender         = null;
    pushMessage    = null;
  });
}

function sendAndroidBulkPushNotificationFCM(logHandler, BUSINESS_DEVICE_MAPPINGS, notificationDataObj, deviceTokenToUserId, pushLogData) {
  let deviceTokens    = notificationDataObj.device_tokens;
  let timeToLive      = notificationDataObj.time_to_live;
  let message         = notificationDataObj.message;
  let businessId      = notificationDataObj.business_id;
  let appType         = notificationDataObj.app_type;

  logger.trace(logHandler, "total android deviceTokens: " + deviceTokens.length, deviceTokens);
  let pushMessage = {
    timeToLive : timeToLive || 2419200,
    data       : {
      message     : message,
      push_source : constants.pushSource.FUGU,
      app_name    : BUSINESS_DEVICE_MAPPINGS[businessId][appType].app_name
    }
  };

  let success = 0;
  let failure = 0;
  let pushDetails = {
    businessId  : businessId,
    appType     : appType,
    pushMessage : pushMessage
  };
  // let sender = new FCM(BUSINESS_DEVICE_MAPPINGS[businessId][appType].api_key);
  let sender = new GCM.Sender(BUSINESS_DEVICE_MAPPINGS[businessId][appType].api_key);
  sender.send(pushMessage, deviceTokens, 4, (err, result) => {
    if(err) {
      logger.error(logHandler, { FCM_ERROR : err, app_type : appType, BULK : true });
      logger.error(logHandler, "PUSH_DETAILS : ", pushDetails);
    } else {
      logger.trace(logHandler, "Sending FCM push ");
      logger.trace(logHandler, "PUSH_DETAILS : ", pushDetails);
      logger.trace(logHandler, "RESULT : ", result);

      success = result.success;
      failure = result.failure;
    }

    if(pushLogData) {
      let updatePushLog = {
        setObject : {
          android_failed  : " | " + failure,
          android_success : " | " + success
        },
        message_id : pushLogData.message_id,
        channel_id : pushLogData.channel_id
      };
      pushLogsService.updateLog(logHandler, updatePushLog).then((result) => {
        logger.info(logHandler, "pushLog updated");
      }).catch((error) => {
        logger.error(logHandler, { EVENT : "push log error", ERROR : error });
      });
    }

    sender         = null;
    pushMessage    = null;
  });
}


function sendIosPushNotificationInternal(logHandler, BUSINESS_DEVICE_MAPPINGS, businessId, pushTo, iosDeviceToken, message, payload, appType) {
  let certificateURL = BUSINESS_DEVICE_MAPPINGS[businessId][appType].certificate;
  if(!certificateURL) {
    logger.error(logHandler, "Invalid certificate url : " + certificateURL + ", business_id : " + businessId);
    return;
  }
  let fileName = global.base_dir + '/certs/' + certificateURL.split('/').pop();


  let asyncTasks = [];
  if(!BUSINESS_DEVICE_MAPPINGS[businessId][appType].valid_certificate) {
    asyncTasks.push(downloadPemFile.bind(null, certificateURL, fileName));
  }


  function downloadPemFile(certificateURL, fileName, cb) {
    utils.downloadFile(certificateURL, fileName, (err, res) => {
      if(err) {
        return cb(err);
      }
      BUSINESS_DEVICE_MAPPINGS[businessId][appType].valid_certificate = true;
      logger.error(logHandler, "Cert downloaded at : " + fileName);
      return cb();
    });
  }

  async.series(asyncTasks, (error, response) => {
    if(error) {
      logger.error(logHandler, "Error in sendIosPushNotificationInternal ", error);
      return;
    }
    BUSINESS_DEVICE_MAPPINGS[businessId][appType].certificate_path = fileName;
    sendIosPushNotification(logHandler, BUSINESS_DEVICE_MAPPINGS, businessId, pushTo, iosDeviceToken, message, payload, appType);
  });
}

function sendIosBulkPushNotificationInternal(logHandler, BUSINESS_DEVICE_MAPPINGS, businessId, deviceTokens, message, payload, appType, deviceTokenToUserId, pushLogData) {
  let certificateURL = BUSINESS_DEVICE_MAPPINGS[businessId][appType].certificate;
  if(!certificateURL) {
    logger.error(logHandler, "Invalid certificate url : " + certificateURL + ", business_id : " + businessId);
    return;
  }
  let fileName = global.base_dir + '/certs/' + certificateURL.split('/').pop();


  let asyncTasks = [];
  if(!BUSINESS_DEVICE_MAPPINGS[businessId][appType].valid_certificate) {
    asyncTasks.push(downloadPemFile.bind(null, certificateURL, fileName));
  }


  function downloadPemFile(certificateURL, fileName, cb) {
    utils.downloadFile(certificateURL, fileName, (err, res) => {
      if(err) {
        return cb(err);
      }
      BUSINESS_DEVICE_MAPPINGS[businessId][appType].valid_certificate = true;
      logger.error(logHandler, "Cert downloaded at : " + fileName);
      return cb();
    });
  }

  async.series(asyncTasks, (error, response) => {
    if(error) {
      logger.error(logHandler, "Error in sendIosPushNotificationInternal ", error);
      return;
    }
    BUSINESS_DEVICE_MAPPINGS[businessId][appType].certificate_path = fileName;
    sendIosBulkPushNotification(logHandler, BUSINESS_DEVICE_MAPPINGS, businessId, deviceTokens, message, payload, appType, deviceTokenToUserId, pushLogData);
  });
}

function sendIosPushNotification(logHandler, BUSINESS_DEVICE_MAPPINGS, businessId, pushTo, iosDeviceToken, message, payloadObject, appType) {
  try {
    let payload = utils.cloneObject(payloadObject);
    if(!apnsConnection[businessId] || !apnsConnection[businessId][appType]) {
      let certificatePath = BUSINESS_DEVICE_MAPPINGS[businessId][appType].certificate_path;
      let passphrase = BUSINESS_DEVICE_MAPPINGS[businessId][appType].passphrase;
      apnConnect.createConnection(apnsConnection, businessId, appType, certificatePath, passphrase);
    }


    let snd         = 'ping.aiff';
    let deviceToken = iosDeviceToken;
    let note        = new apns.Notification();
    note.expiry     = Math.floor(Date.now() / 1000) + 3600;
    if(payload.show_push == 0) {
      note.alert = "";
      note.sound = "";
    } else {
      note.alert = {
        title : payload.title,
        body  : payload.message
      };
      note.sound = snd;
      delete payload.message;
      delete payload.title;
    }


    payload.push_source = constants.pushSource.FUGU;
    note.newsstandAvailable = 1;
    note.contentAvailable   = 1;
    note.topic              = BUSINESS_DEVICE_MAPPINGS[businessId][appType].topic;
    note.payload            = payload;

    if(apnsConnection[businessId][appType]) {
      apnsConnection[businessId][appType].pushNotification(note, deviceToken);
    } else {
      logger.error(logHandler, "Error in APNS connection");
    }
  } catch (error) {
    logger.error(logHandler, "Error while sending IOS push notification");
    logger.error(logHandler, "ERROR : ", error);
    logger.error(logHandler, "DEVICE_TOKEN : ", iosDeviceToken);
    logger.error(logHandler, "MESSAGE : ", JSON.stringify(message));
    logger.error(logHandler, "PAYLOAD : ", JSON.stringify(payloadObject));
  }
}

function sendIosBulkPushNotification(logHandler, BUSINESS_DEVICE_MAPPINGS, businessId, deviceTokens, message, payloadObject, appType, deviceTokenToUserId, pushLogData) {
  try {
    logger.info(logHandler, "total ios deviceTokens: " + deviceTokens.length, deviceTokens);

    // TODO : remove invalid tokens and use cache
    let payload = utils.cloneObject(payloadObject);
    // if(!apnsConnection[businessId] || !apnsConnection[businessId][appType]) {
    let certificatePath = BUSINESS_DEVICE_MAPPINGS[businessId][appType].certificate_path;
    let passphrase = BUSINESS_DEVICE_MAPPINGS[businessId][appType].passphrase;
    let apnsConnection = {};
    apnConnect.createConnection(apnsConnection, businessId, appType, certificatePath, passphrase);
    // }


    let snd         = 'ping.aiff';
    let note        = new apns.Notification();
    note.expiry     = Math.floor(Date.now() / 1000) + 3600;
    if(payload.show_push == 0) {
      note.alert = "";
      note.sound = "";
    } else {
      note.alert = {
        title : payload.title,
        body  : payload.push_message || payload.message
      };
      note.sound = snd;
      delete payload.message;
      delete payload.title;
    }

    payload.push_source     = constants.pushSource.FUGU;
    note.newsstandAvailable = 1;
    note.contentAvailable   = 1;
    note.topic              = BUSINESS_DEVICE_MAPPINGS[businessId][appType].topic;
    note.payload            = payload;

    if(apnsConnection[businessId][appType]) {
      apnsConnection[businessId][appType]
        .send(note, deviceTokens)
        .then((result) => {
          let failed = [];
          if(result.failed && result.failed.length) {
            for (let i = 0; i < result.failed.length; i++) {
              failed.push(deviceTokenToUserId[result.failed[i].device]);
            }
            logger.error(logHandler, { APNS_FAILED : failed, app_type : appType });
          }
          let success = [];
          if(result.sent && result.failed.length) {
            for (let i = 0; i < result.sent.length; i++) {
              success.push(deviceTokenToUserId[result.sent[i].device]);
            }
            logger.trace(logHandler, { APNS_SUCCESS : success, app_type : appType });
          }

          if(pushLogData) {
            let updatePushLog = {
              setObject : {
                ios_failed  : " | " + failed.toString(),
                ios_success : " | " + success.toString()
              },
              message_id : pushLogData.message_id,
              channel_id : pushLogData.channel_id
            };
            pushLogsService.updateLog(logHandler, updatePushLog).then((result) => {
              logger.info(logHandler, "pushLog updated");
            }).catch((error) => {
              logger.error(logHandler, { EVENT : "push log error", ERROR : error });
            });
          }

          if(result.failed && result.failed.length > 0) {
            logger.error(logHandler, {
              APNS_ERROR   : result.failed,
              PUSH_PAYLOAD : note,
              app_type     : appType,
              APNS_SUCCESS : result.sent.length 
            });
          } else {
            logger.trace(logHandler, {
              APNS_SUCCESS  : success,
              DEVICE_TOKENS : deviceTokens,
              RESULT        : result,
              PUSH_PAYLOAD  : note,
              app_type      : appType
            });
          }
        });
    } else {
      logger.error(logHandler, "Error in APNS connection");
    }
  } catch (error) {
    logger.error(logHandler, {
      APNS_ERROR : "Error while sending IOS push notification",
      error      : error,
      message    : message,
      payload    : payloadObject 
    });
  }
}

function mappingDataValidation(deviceType, mappindData) {
  if(deviceType == constants.deviceType.ANDROID) {
    if(!mappindData.api_key || !mappindData.api_key.trim()) {
      return 0;
    }
  } else if(deviceType == constants.deviceType.IOS) {
    // && (!mappindData.beta_certificate || !mappindData.beta_certificate.trim())
    if((!mappindData.certificate || !mappindData.certificate.trim())) {
      return 0;
    }
  }
  return 1;
}

function fetchBusinessDeviceDetails(logHandler, dataWrapper, businessDetailsWrapper, callback) {
  let stmt    = "SELECT api_key, certificate, app_name, topic FROM business_device_mappings WHERE business_id = ? AND app_type = ? ";
  let values  = [dataWrapper.business_id, dataWrapper.app_type];

  dbHandler.query(logHandler, "fetchBusinessDeviceDetails", stmt, values, (err, result) => {
    if(err || !result.length) {
      err = err || new Error("No mapping data found for this business id.");
      logger.error(logHandler, "Business device mappings not found", dataWrapper);
      return callback(err);
    }

    businessDetailsWrapper.data = result[0];
    return callback(null);
  });
}

function webNotification(loggerInfo, pushList) {
  Promise.all(pushList.map(push => sendWebNotification(loggerInfo, push))).then(() => {
    logger.trace(loggerInfo, { EVENT : "WEB NOTIFICATION SENT" });
  }, (error) => {
    logger.error(loggerInfo, { EVENT : "ERROR IN SENDING WEB NOTIFICATION" }, { ERROR : error.message });
  });
}

function sendWebNotification(loggerInfo, body) {
  return new Promise((resolve, reject) => {
    let headers = {
      "Content-Type" : "application/json",
      Authorization  : constants.FIREBASE.KEY
    };
    let options = {
      url                : constants.FIREBASE.API,
      method             : 'POST',
      body               : body,
      json               : true,
      rejectUnauthorized : false,
      headers            : headers
    };
    request(options, (error, response, body) => {
      if(error) {
        logger.error(
          loggerInfo, { EVENT : 'Error from external server for :' + loggerInfo.apiHandler },
          { OPTIONS : options }, { ERROR : error }, { RESPONSE : response }, { BODY : body }
        );
        return reject(error);
      }

      if(response == undefined) {
        error = new Error('No response from external server');
        return reject(error);
      }

      if(response.statusCode != '200') {
        error = new Error('Couldn\'t request with external server ');
        error.code = response.statusCode;
        logger.error(
          loggerInfo, { EVENT : 'Error from external server for : ' + loggerInfo.apiHandler },
          { OPTIONS : options }, { ERROR : error }, { RESPONSE : response }, { BODY : body }
        );
        return reject(error);
      }
      logger.trace(
        loggerInfo, { EVENT : 'Response from external server for : ' + loggerInfo.apiHandler },
        { OPTIONS : options }, { ERROR : error }, { RESPONSE : response }, { BODY : body }
      );

      resolve(body);
    });
  });
}


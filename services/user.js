/**
 * Created by vidit on 7/7/17.
 */
const Promise             = require('bluebird');
const _                   = require('underscore');
const dbHandler           = require('../database').dbHandler;
const utils               = require('../Controller/utils');
const constants           = require('../Utils/constants');
const notifierService     = require('../services/notifier');
const logger              = require('../Routes/logging');
const utilityService      = require('./utility');
const notificationBuilder = require('../Builder/notification');

exports.checkUniqueUser                   = checkUniqueUser;
exports.updateInfo                        = updateInfo;
exports.updateDeviceInfo                  = updateDeviceInfo;
exports.insertDeviceInfo                  = insertDeviceInfo;
exports.insertNew                         = insertNew;
exports.insertUserToChannel               = insertUserToChannel;
exports.search                            = search;
exports.searchByName                      = searchByName;
exports.getUserDetails                    = getUserDetails;
exports.getAnonymousUserByDeviceKey       = getAnonymousUserByDeviceKey;
exports.userMigration                     = userMigration;
exports.getUserMigrationInfo              = getUserMigrationInfo;
exports.notifyMigratedUser                = notifyMigratedUser;
exports.getUsersUsingUserUniqueKey        = getUsersUsingUserUniqueKey;
exports.getAlreadyTaggedUsers             = getAlreadyTaggedUsers;
exports.insertTaggedUsers                 = insertTaggedUsers;
exports.getInfo                           = getInfo;
exports.updateUserAddress                 = updateUserAddress;
exports.getActiveUsers                    = getActiveUsers;
exports.getUsersWithIds                   = getUsersWithIds;
exports.getActiveUsersOfBusiness          = getActiveUsersOfBusiness;
exports.getUsersOfBusiness                = getUsersOfBusiness;
exports.insertOrUpdateUserToChannel       = insertOrUpdateUserToChannel;
exports.getUsersWithAppInfo               = getUsersWithAppInfo;
exports.getUserWithAppInfo                = getUserWithAppInfo;
exports.updateUserToChannel               = updateUserToChannel;
exports.getUsersDeviceDetails             = getUsersDeviceDetails;
exports.getDeviceInfo                     = getDeviceInfo;
exports.updateUserDevice                  = updateUserDevice;
exports.resetDeviceToken                  = resetDeviceToken;
exports.updateFuguUserInfo                = updateFuguUserInfo;


function getInfo(logHandler, user_id) {
  return new Promise((resolve, reject) => {
    let query = `select * from users where user_id = ?`;
    let queryObj = {
      query : query,
      args  : [user_id],
      event : "get user info"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function getUserWithAppInfo(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let whereClause = '';
    let values      = [opts.business_id];
    if(opts.user_id) {
      whereClause = 'AND u.user_id = ? ';
      values.push(opts.user_id);
    } else if(opts.user_unique_key) {
      whereClause = 'AND u.user_unique_key = ? ';
      values.push(opts.user_unique_key);
    }
    let query = `SELECT u.user_id, u.full_name, u.phone_number, u.email,COALESCE(b.app_name, '') AS app_name
                 FROM
                     users AS u
                 LEFT JOIN business_device_mappings AS b on u.business_id = b.business_id and u.app_type = b.app_type
                 WHERE u.business_id = ?  ${whereClause}  `;
    let queryObj = {
      query : query,
      args  : values,
      event : "getUserWithAppInfo"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getUsersWithAppInfo(logHandler, opts) {
  return new Promise((resolve, reject) => {
    if(_.isEmpty(opts.userIds)) {
      return resolve([]);
    }
    let query = `SELECT u.user_id, u.user_type, u.full_name, u.phone_number, u.email,COALESCE(b.app_name, '') AS app_name,
                 COALESCE(u.user_image, '') AS user_image, u.status
                 FROM
                     users AS u
                 LEFT JOIN business_device_mappings AS b on u.business_id = b.business_id and u.app_type = b.app_type
                 WHERE user_id in (?) order by u.full_name ASC`;
    let queryObj = {
      query : query,
      args  : [opts.userIds],
      event : "get user info"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function checkUniqueUser(logHandler, payload) {
  return new Promise((resolve, reject) => {
    const business_id = payload.business_id;

    let key = "";
    let values = [];
    if(payload.user_unique_key) {
      key = "user_unique_key = ?";
      values.push(payload.user_unique_key);
    } else if(payload.device_key) {
      key = "device_key = ?";
      values.push(payload.device_key);
    } else {
      key = "device_id = ? AND user_unique_key = '0'";
      values.push(payload.device_id);
    }
    values.push(business_id);

    let query = `
                     SELECT
                        users.user_id,
                        users.business_id,
                        email,
                        user_name,
                        full_name,
                        phone_number,
                        user_unique_key,
                        device_id,
                        device_key               
                    FROM
                        users 
                    WHERE
                        ${key} AND status != 2 AND user_type = 1 AND users.business_id = ? 
                    `;
    let queryObj = {
      query : query,
      args  : values,
      event : "Checking unique user "
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function updateInfo(logHandler, payload, userInfo) {
  return new Promise((resolve, reject) => {
    if(!userInfo.user_id) {
      return reject(new Error("Invalid user_id"));
    }

    let query = ` Update users set ? where user_id = ? AND user_type = 1 `;
    let updateObj = {};
    (payload.email)             ? updateObj.email = payload.email : 0;
    (payload.full_name)         ? updateObj.full_name = utils.toTitleCase(payload.full_name) : 0;
    (payload.phone_number)      ? updateObj.phone_number = payload.phone_number : 0;
    (payload.device_type)       ? updateObj.device_type = payload.device_type : 0;
    (payload.device_id)         ? updateObj.device_id = payload.device_id : 0;
    (payload.device_key)        ? updateObj.device_key = payload.device_key : 0;
    (payload.app_type)          ? updateObj.app_type = payload.app_type : 0;
    (payload.attributes)        ? updateObj.attributes =  payload.attributes : 0;
    (payload.user_image)        ? updateObj.user_image = payload.user_image : 0;
    (payload.source)            ? updateObj.source = payload.source : 0;
    (payload.source_type)       ? updateObj.source_type = payload.source_type : 0;
    (payload.custom_attributes) ? updateObj.custom_attributes =  payload.custom_attributes : 0;
    (payload.user_properties)   ? updateObj.user_properties = utils.objectToJson(logHandler, payload.user_properties) : 0;
    (payload.notification_level) ? updateObj.notification_level = payload.notification_level : 0;
    /*
    (payload.device_token === null || payload.device_token)  ? updateObj.device_token = payload.device_token : 0;
    if(payload.web_token  === null || payload.web_token) {
      updateObj.web_token = payload.web_token;
      updateObj.web_token_updated_at = new Date();
    }
    */
    updateObj.updated_at = new Date();

    let queryObj = {
      query : query,
      args  : [updateObj, userInfo.user_id],
      event : "updating user info"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(updateObj);
    }, (error) => {
      reject(error);
    });
  });
}

function getDeviceInfo(logHandler, payload, userInfo) {
  return new Promise((resolve, reject) => {
    let query = `SELECT * from user_devices where user_id = ? and device_type = ? and device_id = ?;`;
    let queryObj = {
      query : query,
      args  : [userInfo.user_id, payload.device_type, payload.device_id],
      event : "getDeviceInfo"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function updateDeviceInfo(logHandler, payload, userInfo) {
  return new Promise((resolve, reject) => {
    let query     = `UPDATE user_devices set  ? where user_id = ? and device_type = ? and device_id = ?;`;
    let updateObj = {};
    (payload.device_details)    ? updateObj.device_details = payload.device_details : 0;
    updateObj.updated_at        = new Date();
    if(payload.token || payload.token == null) {
      updateObj.token = payload.token;
      updateObj.token_updated_at  = new Date();
    }
    let queryObj = {
      query : query,
      args  : [updateObj, userInfo.user_id, payload.device_type, payload.device_id],
      event : "updateDeviceInfo"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function updateUserDevice(logHandler, payload) {
  return new Promise((resolve, reject) => {
    if(_.isEmpty(payload.update_fields)) {
      return reject(new Error("Update Fields Missing"));
    }
    if(_.isEmpty(payload.where_clause)) {
      return reject(new Error("Where condition Empty"));
    }

    let updateObj = {};
    updateObj.updated_at = new Date();
    let validUpdateColumns = new Set(["token"]);
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

    let query = `UPDATE user_devices SET ?  where 1=1 ${whereCondition}`;
    let queryObj = {
      query : query,
      args  : [updateObj].concat(values),
      event : "updateUserDevice"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function insertDeviceInfo(logHandler, payload, userInfo) {
  return new Promise((resolve, reject) => {
    let query                = `INSERT INTO user_devices set  ? `;
    let insertObj            = {};
    insertObj.user_id        = userInfo.user_id;
    insertObj.device_id      = payload.device_id;
    insertObj.device_type    = payload.device_type;
    insertObj.business_id    = userInfo.business_id || 0; // TODO : remove column
    insertObj.device_details = payload.device_details || '{}';
    insertObj.token          = payload.token || null;
    let queryObj = {
      query : query,
      args  : [insertObj],
      event : "insertDeviceInfo"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function insertNew(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = "INSERT INTO  users set ? ";
    let userInfo = {};
    userInfo.business_id =  payload.business_id;
    userInfo.email =  payload.email || "";
    userInfo.full_name =  (payload.full_name) ? utils.toTitleCase(payload.full_name) : constants.anonymousUserName;
    userInfo.user_name =  "user" + Math.round(parseFloat(Math.random() * 10000)) + "";
    userInfo.status =  constants.userStatus.ENABLE;
    userInfo.user_type =  constants.userType.CUSTOMER;
    userInfo.phone_number =  payload.phone_number || "";
    userInfo.password =  "";
    userInfo.device_type =  payload.device_type;
    userInfo.device_id =  payload.device_id;
    userInfo.device_key  =  payload.device_key;
    userInfo.user_unique_key =  payload.user_unique_key || "0";
    userInfo.device_token =  payload.device_token;
    userInfo.app_type  =  payload.app_type;
    userInfo.user_image  =  payload.user_image;
    (payload.source)  ? userInfo.source = payload.source : 0;
    (payload.source_type)  ? userInfo.source_type = payload.source_type : 0;
    (payload.attributes)        ? userInfo.attributes =  payload.attributes : 0;
    (payload.custom_attributes) ? userInfo.custom_attributes =  payload.custom_attributes : 0;

    let queryObj = {
      query : query,
      args  : [userInfo],
      event : "Inserting new user"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      userInfo.user_id = result.insertId;
      resolve(userInfo);
    }, (error) => {
      reject(error);
    });
  });
}


function insertOrUpdateUserToChannel(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let query = `INSERT INTO  user_to_channel  (user_id,channel_id,status) VALUES (?,?,?) ON DUPLICATE KEY UPDATE status = ?`;
    let queryObj = {
      query : query,
      args  : [opts.user_id, opts.channel_id, opts.status, opts.status],
      event : "insertOrUpdateUserToChannel"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function updateUserToChannel(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let updateObject = {};
    if(opts.status) {
      updateObject.status = opts.status;
    }
    if(opts.notification) {
      updateObject.notification = opts.notification;
    }
    if(_.isEmpty(updateObject)) {
      return resolve({});
    }
    let query = `UPDATE user_to_channel SET ? WHERE user_id = ? AND channel_id = ?`;
    let queryObj = {
      query : query,
      args  : [updateObject, opts.user_id, opts.channel_id],
      event : "updateUserToChannel"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function insertUserToChannel(logHandler, params, userIds) {
  return new Promise((resolve, reject) => {
    if(_.isEmpty(userIds)) {
      throw new Error("Nothing to insert in insertUserToChannel");
    }

    let values = [];
    let placeHolders = new Array(userIds.length).fill("(?,?,?)").join(', ');
    for (let i = 0; i < userIds.length; i++) {
      values = values.concat([userIds[i], params.channel_id, 1]);
    }

    let query = `INSERT INTO  user_to_channel  (user_id,channel_id,status) VALUES  ${placeHolders} `;

    let queryObj = {
      query : query,
      args  : values,
      event : "INSERT_USER_TO_CHANNEL"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function search(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let values = [payload.business_id];
    let text = payload.search_text;
    let placeHolder = "";
    if(payload.business_id != constants.restrictSearchBusinessId) {
      values.push(text + "%");
      placeHolder = " full_name like ? or ";
    }

    values.push(text + "%");
    values.push("+91" + text + "%");
    values.push(text + "%");
    let query = `select user_id from users where business_id = ? and user_type = 1   and ( ${placeHolder} phone_number like  ?  or phone_number like  ?  or  email like ?)  limit 10`;
    let queryObj = {
      query : query,
      args  : values,
      event : "Searching user id on the basis of email or phone number "
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function searchByName(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `select user_id, full_name, phone_number, email, COALESCE(user_image, '') as user_image 
                 from users where business_id = ? and status = 1 and user_type = 1 and full_name like ?  limit 10`;
    let queryObj = {
      query : query,
      args  : [payload.business_id, "%" + payload.search_text + "%"],
      event : "searchByName"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function getUserDetails(logHandler, user_id) {
  return new Promise((resolve, reject) => {
    let query = `SELECT
                      u.user_id,
                      u.email,
                      u.phone_number,
                      u.full_name,
                      u.user_name,
                      u.attributes,
                      u.notification_level,
                      COALESCE(u.user_properties, "{}") AS user_properties,
                      u.custom_attributes,
                      u.created_at AS first_seen,
                      u.updated_at AS last_seen,
                      uc.created_at AS last_contacted,
                      '' AS last_heard_from,
                      android.device_details AS android_details,
                      android.updated_at AS last_seen_android,
                      ios.device_details AS ios_details,
                      ios.updated_at AS last_seen_ios,
                      browser.device_details AS browser_details,
                      browser.updated_at AS last_seen_browser
                  FROM
                      users u
                  LEFT JOIN user_devices android ON
                      android.user_id = u.user_id AND android.device_type = 1
                  LEFT JOIN user_devices ios ON
                      ios.user_id = u.user_id AND ios.device_type = 2
                  LEFT JOIN user_devices browser ON
                      browser.user_id = u.user_id AND browser.device_type = 3
                  LEFT JOIN(
                      SELECT
                          *
                      FROM
                          users_conversation
                      WHERE
                          user_id = ?
                      ORDER BY
                          id
                      DESC
                  LIMIT 1
                  ) uc
                  ON
                      uc.user_id = u.user_id
                  WHERE
                      u.user_id = ? AND u.status = 1 AND u.user_type = 1
                  `;

    let queryObj = {
      query : query,
      args  : [user_id, user_id, user_id],
      event : "getUserDetails"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      if(result.length > 0) {
        result[0].device_details = utils.jsonParse(result[0].device_details);
        result[0].android_details = utils.jsonParse(result[0].android_details);
        result[0].ios_details = utils.jsonParse(result[0].ios_details);
        result[0].browser_details = utils.jsonParse(result[0].browser_details);
        result[0].last_seen_android = result[0].last_seen_android || "";
        result[0].last_seen_ios = result[0].last_seen_ios || "";
        result[0].last_seen_browser = result[0].last_seen_browser || "";
        result[0].last_contacted = result[0].last_contacted || "";
        result[0].last_heard_from = result[0].last_heard_from || "";
        result[0].attributes = result[0].attributes ? utils.jsonParse(result[0].attributes) : {};
        result[0].custom_attributes = result[0].custom_attributes ? utils.jsonParse(result[0].custom_attributes) : {};
      }
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getAnonymousUserByDeviceKey(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = ` SELECT user_id, email, user_unique_key, user_name, phone_number, device_type, device_id, device_key, device_token FROM users 
                      where device_key = ? and user_unique_key = '0' and business_id = ?`;

    let queryObj = {
      query : query,
      args  : [payload.device_key, payload.business_id],
      event : "getAnonymousUserByDeviceKey"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getUserMigrationInfo(logHandler, user_id) {
  return new Promise((resolve, reject) => {
    let query = ` SELECT user_id, migrated_user_id FROM user_migration_history where user_id = ?`;
    let queryObj = {
      query : query,
      args  : [user_id],
      event : "getUserMigrationInfo"
    };

    dbHandler.executeQuery(logHandler, queryObj).then(result => resolve(result), (error) => {
      reject(error);
    });
  });
}

function userMigration(logHandler, userDetails, loggedInUserDetails) {
  logger.trace(logHandler, "Migrating user : ", userDetails, " into : ", loggedInUserDetails);
  let user_id         = userDetails.user_id;
  let loggedInUserId  = loggedInUserDetails.user_id;

  let insertMigrationData = new Promise((resolve, reject) => {
    let query = ` INSERT INTO user_migration_history SET ?`;
    let insertObj = {
      user_id          : userDetails.user_id,
      user_name        : userDetails.user_name,
      email            : userDetails.email,
      device_id        : userDetails.device_id,
      device_key       : userDetails.device_key,
      device_type      : userDetails.device_type,
      migrated_user_id : loggedInUserDetails.user_id
    };
    let queryObj = {
      query : query,
      args  : [insertObj],
      event : "insertAnonymousHistory"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      logger.trace(logHandler, { RESULT : result });
      return resolve();
    }, (error) => {
      logger.error(logHandler, { ERROR : error });
      reject(error);
    });
  });

  let updateChannelData = new Promise((resolve, reject) => {
    let query = `UPDATE channels SET owner_id = ? where owner_id = ?`;
    let queryObj = {
      query : query,
      args  : [loggedInUserId, user_id],
      event : "updateChannelData"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      logger.trace(logHandler, { RESULT : result });
      resolve();
    }, (error) => {
      logger.error(logHandler, { ERROR : error });
      reject(error);
    });
  });

  let updateConversations = new Promise((resolve, reject) => {
    let query = `UPDATE users_conversation SET user_id = ? where user_id = ?`;
    let queryObj = {
      query : query,
      args  : [loggedInUserId, user_id],
      event : "updateConversationData"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      logger.trace(logHandler, { RESULT : result });
      resolve();
    }, (error) => {
      logger.error(logHandler, { ERROR : error });
      reject(error);
    });
  });

  let userToChannel = new Promise((resolve, reject) => {
    let query = `UPDATE user_to_channel SET user_id = ? where user_id = ?`;

    let queryObj = {
      query : query,
      args  : [loggedInUserId, user_id],
      event : "updateUserToChannel"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      logger.trace(logHandler, { RESULT : result });
      resolve();
    }, (error) => {
      logger.error(logHandler, { ERROR : error });
      reject(error);
    });
  });

  /*
  TODO : update channel_history
  let updateAnonymousFromMessageHistory = new Promise((resolve, reject) => {
    let query = `UPDATE message_history SET user_id = ? where user_id = ?`;
  });
  */

  let deleteAnonymousUserDetails = new Promise((resolve, reject) => {
    let query = `DELETE  from users where user_id = ?;`;

    let queryObj = {
      query : query,
      args  : [user_id],
      event : "deleteAnonymousDetails"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      logger.trace(logHandler, { RESULT : result, query : this.sql });
      resolve();
    }, (error) => {
      logger.error(logHandler, { ERROR : error });
      reject(error);
    });
  });

  let deleteAnonymousUserDeviceDetails = new Promise((resolve, reject) => {
    let query = `DELETE  from user_devices where user_id = ?;`;

    let queryObj = {
      query : query,
      args  : [user_id],
      event : "deleteAnonymousUserDeviceDetails"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      logger.trace(logHandler, { RESULT : result, query : this.sql });
      resolve();
    }, (error) => {
      logger.error(logHandler, { ERROR : error });
      reject(error);
    });
  });

  return Promise.all([insertMigrationData, updateChannelData, updateConversations, userToChannel,
    deleteAnonymousUserDetails, deleteAnonymousUserDeviceDetails])
    .then((data) => {
      logger.trace(logHandler, { RESPONSE : data });
    }, (error) => {
      logger.error(logHandler, { USER_MIGRATION_ERROR : error });
    });
}

function notifyMigratedUser(logHandler, anonymousUser, userInfo, businessInfo) {
  logger.trace(logHandler, "sending push for user migration");
  let message = notificationBuilder.getObject(notificationBuilder.notificationType.USER_MIGRATION);
  message.user_id             = anonymousUser.user_id;
  message.user_name           = anonymousUser.user_name;
  message.email               = anonymousUser.email;
  message.migrated_to         = userInfo.user_id;
  let ccPush = {
    messageAt : '/' + businessInfo.app_secret_key + '/' + constants.ccPushEvents.USER_MIGRATION,
    message   : message
  };
  notifierService.sendControlChannelEvent(ccPush);
}

function getUsersUsingUserUniqueKey(logHandler, user_unique_keys, business_id) {
  return new Promise((resolve, reject) => {
    let query = `SELECT * from users where user_unique_key IN (?) AND business_id = ? `;
    let queryObj = {
      query : query,
      args  : [user_unique_keys, business_id],
      event : "getUsersUsingUserUniqueKey"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getAlreadyTaggedUsers(logHandler, channel_id, tagger_id, tagged_users) {
  return new Promise((resolve, reject) => {
    let query = `select tagged_user_id from tagged_users where channel_id = ? and tagger_id = ? and tagged_user_id in (?)`;

    let queryObj = {
      query : query,
      args  : [channel_id, tagger_id, tagged_users],
      event : "checkIfUserIsAlreadyTagged"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      let res = [];
      for (let i = 0; i < result.length; i++) {
        res.push(result[i].tagged_user_id);
      }
      resolve(res);
    }, (error) => {
      reject(error);
    });
  });
}

function insertTaggedUsers(logHandler, channel_id, tagger_id, tagged_users) {
  return new Promise((resolve, reject) => {
    let placeHolders = new Array(tagged_users.length).fill("(?,?,?)").join(', ');
    let values = [];
    for (let i = 0; i < tagged_users.length; i++) {
      values = values.concat(channel_id, tagger_id, tagged_users[i]);
    }
    let query = `insert into tagged_users (channel_id, tagger_id, tagged_user_id) values ${placeHolders} `;

    let queryObj = {
      query : query,
      args  : values,
      event : "insertTaggedUsers"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}
function updateUserAddress(logHandler, payload, userInfo) {
  return new Promise((resolve, reject) => {
    let attributes = utils.jsonParse(payload.attributes);
    Promise.coroutine(function* () {
      if(!attributes || attributes.address) {
        return {};
      }

      if(attributes.lat_long) {
        attributes.address = yield utilityService.getAddressFromGeoCoder(logHandler, attributes.lat_long);
      } else if(attributes.ip) {
        attributes.address = yield utilityService.getAddressFromIP(logHandler, attributes.ip);
      }
      attributes = utils.objectStringify(attributes);
      logger.trace(logHandler, { EVENT : "updateUserAddress", DATA : attributes });
      yield updateInfo(logHandler, { attributes : attributes }, userInfo);
      return {};
    })().then((data) => {
      logger.trace(logHandler, { EVENT : "updateUserAddress", RESULT : data });
      resolve(data);
    }, (error) => {
      logger.error(logHandler, { ERROR : error });
      reject(error);
    });
  });
}


function getActiveUsers(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let placeholder = ` user_unique_key IS NOT NULL AND `;
    if(payload.anonymous_only) {
      placeholder = ` user_unique_key = 0 AND `;
    }
    let sql = `SELECT user_id, full_name, user_name 
                   FROM users WHERE ${placeholder} status = 1 AND user_type = 1 
                   AND business_id = ? 
                   order by user_id 
                   LIMIT ` + Math.abs(payload.page_start - 1) + `, ` + Math.abs(payload.page_end - payload.page_start + 1);
    let queryObj = {
      query : sql,
      args  : [payload.business_id],
      event : "getActiveUsers"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function getUsersWithIds(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let sql = "SELECT * FROM  users WHERE user_id in ( ? )";
    let queryObj = {
      query : sql,
      args  : [opts.userIds],
      event : "getUsersWithIds"
    };

    let logHandlerLocal = utils.cloneObject(logHandler);
    logHandlerLocal.logResultLength = true;
    dbHandler.executeQuery(logHandlerLocal, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getUsersDeviceDetails(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let sql = `
                SELECT
                    u.user_id as user_id,
                    u.business_id as business_id,
                    u.email as email,
                    u.full_name as full_name,
                    u.status as status,
                    u.user_properties,
                    u.notification_level,
                    u.user_type,
                    u.phone_number,
                    u.user_image,
                    u.app_type,
                    u.online_status,
                    ud.device_type,
                    ud.device_details,
                    ud.token as device_token
                  FROM users u
                    JOIN user_devices ud ON
                    u.user_id = ud.user_id AND u.user_id IN (?)
                  WHERE
                    ud.token !='' and
                    ud.token_updated_at >= NOW() - INTERVAL 30 DAY`;
    let queryObj = {
      query : sql,
      args  : [opts.userIds],
      event : "getUsersWithIds"
    };

    let logHandlerLocal = utils.cloneObject(logHandler);
    logHandlerLocal.logResultLength = true;
    dbHandler.executeQuery(logHandlerLocal, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function getActiveUsersOfBusiness(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let sql = "SELECT * FROM  users WHERE business_id = ? AND user_type = 1 AND status = 1 AND user_id in ( ? )";
    let queryObj = {
      query : sql,
      args  : [opts.business_id, opts.userIds],
      event : "getUsersWithIds"
    };

    let logHandlerLocal = utils.cloneObject(logHandler);
    logHandlerLocal.logResultLength = true;
    dbHandler.executeQuery(logHandlerLocal, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function getUsersOfBusiness(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let sql = "SELECT * FROM  users WHERE business_id = ? AND user_type = 1 AND user_id in ( ? )";
    let queryObj = {
      query : sql,
      args  : [opts.business_id, opts.userIds],
      event : "getUsersWithIds"
    };

    let logHandlerLocal = utils.cloneObject(logHandler);
    logHandlerLocal.logResultLength = true;
    dbHandler.executeQuery(logHandlerLocal, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function resetDeviceToken(logHandler, payload, userInfo) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let opts = {
        user_id     : userInfo.user_id,
        device_type : payload.device_type,
        token       : payload.token
      };
      let updatePayload = {
        update_fields : { token : null },
        where_clause  : opts
      };
      yield updateUserDevice(logHandler, updatePayload);
      return {};
    })().then((data) => {
      resolve(data);
    }, (error) => {
      logger.error(logHandler, { ERROR : error });
      reject(error);
    });
  });
}

function updateFuguUserInfo(logHandler, payload) {
  return new Promise((resolve, reject) => {

    let query = ` Update users set ? where business_id = ? and user_unique_key = ? `;
    let updateObj = {};
    (payload.full_name)    ? updateObj.full_name = utils.toTitleCase(payload.full_name) : 0;
    (payload.phone_number) ? updateObj.phone_number = payload.phone_number : 0;
    (payload.user_image_url)   ? updateObj.user_image = payload.user_image_url : 0;
    (payload.status)       ? updateObj.status = payload.status : 0;
    updateObj.updated_at = new Date();

    let queryObj = {
      query : query,
      args  : [updateObj, payload.business_id, payload.user_unique_key],
      event : "updating user info"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(updateObj);
    }, (error) => {
      reject(error);
    });
  });
}

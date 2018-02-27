/**
 * Created by ashishprasher on 31/08/17.
 */



const Promise                       = require('bluebird');
const config                        = require('config');
const md5                           = require('md5');
const async                         = require('async');
const request                       = require('request');
const dbHandler                     = require('../database').dbHandler;
const RESP                          = require('../Config').responseMessages;
const constants                     = require('../Utils/constants');
const utils                         = require('./utils');
const UniversalFunc                 = require('../Utils/universalFunctions');
const logger                        = require('../Routes/logging');
const dbquery                       = require('../DAOManager/query');
const channelService                = require('../services/channel');
const utilityService                = require('../services/utility');
const _                             = require('underscore');


exports.getChannels                 = getChannels;
exports.editChannelPriority         = editChannelPriority;
exports.createChannelsV2            = createChannelsV2;
exports.editChannelsV2              = editChannelsV2;
exports.channelEnableDisable        = channelEnableDisable;
exports.editInfo                    = editInfo;



function getChannels(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let defaultChannels = yield channelService.getDefaultChannels(logHandler, payload.businessInfo.business_id);
    return { channels : defaultChannels };
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}

function editChannelPriority(logHandler, payload, res) {
  Promise.coroutine(function* () {
    for (let i = 0; i < payload.priority_array.length; i++) {
      let opts = {
        update_fields : {
          channel_priority : payload.priority_array[i].channel_priority
        },
        where_clause : {
          business_id : payload.businessInfo.business_id,
          channel_id  : payload.priority_array[i].channel_id
        }
      };
      channelService.update(logHandler, opts);
    }
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.UPDATED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}

function createChannelsV2(logHandler, payload, callback) {
  let business_id                   = payload.businessInfo.business_id,
    channel_name                  = payload.channel_name,
    default_message               = payload.default_message,
    label                         = payload.channel_name,
    image_file                    = payload.channel_image;

  async.auto({
    checkForDuplicateChannel : function (callback) {
      let sql = "SELECT `channel_name` FROM `channels` WHERE `channel_name` = ? AND `business_id` = ? AND `channel_type` = ? ";
      dbHandler.query(logHandler, "checkForDuplicateChannel", sql, [channel_name, business_id, 2], (err, response) => {
        if(err) {
          logger.trace(logHandler, "There was some problem in the check name query", err);
          return callback(err);
        } else if(response.length > 0) {
          logger.trace(logHandler, "This channel already exists", response);
          callback(RESP.ERROR.eng.CHANNEL_ALREADY_EXISTS);
        } else {
          logger.trace(logHandler, "This is a new channel", response);
          callback(null, response);
        }
      });
    },
    imageUpload : ['checkForDuplicateChannel', function (result, callback) {
      if(!image_file) {
        return callback();
      }
      utilityService.uploadFile(logHandler, { file : image_file }).then(
        (result) => {
          result.image_url = result.url;
          return callback(null, result);
        },
        (error) => {
          logger.error(logHandler, "Error in upload channel image ", error);
          return callback(error);
        }
      );
    }],
    getChannelPriority : ['imageUpload', function (result, callback) {
      let sql = "SELECT max(channel_priority) as channel_priority FROM `channels` WHERE `business_id` = ?";
      dbHandler.query(logHandler, "getChannelPriority", sql, [business_id], (err, response) => {
        if(err) {
          return callback(err);
        }
        if(response.length > 0) {
          return callback(null, { channel_priority : response[0].channel_priority + 1 });
        }

        return callback(null, { channel_priority : 0 });
      });
    }],
    createBusinessChannels : ['getChannelPriority', function (result, callback) {
      let params = {};
      params.business_id = business_id;
      params.channel_name = channel_name;
      params.status = 1;
      params.channel_type = constants.channelType.DEFAULT_CHANNEL;
      params.default_message = default_message;
      params.label = label;
      params.channel_image = (result.imageUpload) ? result.imageUpload.image_url : "";
      params.channel_priority = result.getChannelPriority.channel_priority;

      dbquery.insertIntoChannels(logHandler, params, (err, res) => {
        if(err) {
          logger.error(logHandler, "There was some problem in the adding the channel", err);
          return callback(err);
        }
        logger.trace(logHandler, "Channel inserted into db");
        return callback(null, res);
      });
    }]
  }, (err, res) => {
    if(err) {
      callback(err);
    } else {
      callback(null, {
        channel_name    : channel_name, default_message : default_message, label_name      : label, channel_id      : res.createBusinessChannels.insertId
      });
    }
  });
}

function editChannelsV2(logHandler, payload, callback) {
  let channel_id                    = payload.channel_id,
    business_id                   = payload.business_id,
    channel_name                  = payload.channel_name,
    default_message               = payload.default_message,
    label                         = payload.channel_name,
    image_file                    = payload.channel_image,
    remove_image                  = payload.remove_image;

  async.auto({
    checkForDuplicateChannel : function (callback) {
      let sql = "SELECT `channel_id` FROM `channels` WHERE `channel_name` = ? AND `business_id` = ? AND `channel_type` = ? AND `status` IN(0,1)";
      dbHandler.query(logHandler, "checkForDuplicateChannel", sql, [channel_name, business_id, 2], (err, response) => {
        if(err) {
          logger.trace(logHandler, "There was some problem in the check name query", err);
        } else if(response.length < 2) {
          if(response.length == 0) {
            callback(null, response);
          } else if(response.length == 1) {
            if(response[0].channel_id == channel_id) {
              callback(null, response);
            } else {
              callback(RESP.ERROR.eng.CHANNEL_ALREADY_EXISTS);
            }
          }
        } else {
          logger.trace(logHandler, "This channel name " + channel_name + " is already recorded in our database", response);
          callback(RESP.ERROR.eng.CHANNEL_ALREADY_EXISTS);
        }
      });
    },
    imageUpload : ['checkForDuplicateChannel', function (result, callback) {
      if(!image_file) {
        return callback();
      }
      utilityService.uploadFile(logHandler, { file : image_file }).then(
        (result) => {
          result.image_url = result.url;
          return callback(null, result);
        },
        (error) => {
          logger.error(logHandler, "Error in upload channel image ", error);
          return callback(error);
        }
      );
    }],
    editBusinessChannels : ['imageUpload', function (result, callback) {
      let opts = {};
      opts.channel_name        = channel_name;
      opts.status              = payload.status;
      opts.channel_type        = constants.channelType.DEFAULT_CHANNEL;
      opts.default_message     = default_message;
      opts.label               = label;
      opts.channel_image       = (result.imageUpload) ? result.imageUpload.image_url : undefined;


      let values = [];
      let queryParams = [];
      for (let key in opts) {
        if(opts[key]) {
          queryParams.push(" `" + key + "` = ? ");
          values.push(opts[key]);
        }
      }
      if(values.length == 0) {
        return callback();
      }
      if(remove_image == 'true' && !opts.channel_image) {
        queryParams.push(" channel_image = ? ");
        values.push('');
      }
      values.push(channel_id);
      let sql = "UPDATE  `channels` SET  " + queryParams.join(" , ") + " WHERE  `channel_id` = ?;";

      dbHandler.query(logHandler, "editBusinessChannels", sql, values, (err, response) => {
        if(err) {
          logger.trace(logHandler, "There was some problem in the editing the channel", err);
          callback(err);
        } else {
          let updateOld = "UPDATE channels set label = ?  where label_id = ? ";
          let values = [channel_name, channel_id];
          dbHandler.query(logHandler, "update channel label", updateOld, values, (err, response) => {
            if(err) {
              logger.error(logHandler, "There was some problem in the editing the channel", err);
              return callback(err);
            }
            logger.trace(logHandler, "The editing of channel was complete", response);
            callback(null, response);
          });
        }
      });
    }]
  }, (err, res) => {
    if(err) {
      callback(err);
    } else {
      logger.trace(logHandler, { RESPONSE : res });
      callback(null, {
        channel_name    : channel_name, default_message : default_message, label_name      : label, channel_id      : channel_id
      });
    }
  });
}

function channelEnableDisable(logHandler, payload, channelEnableDisable) {
  let channel_id                    = payload.channel_id,
    status                        = payload.status;

  let sql = "UPDATE `channels` SET `status` = ? WHERE `channel_id` = ?";
  dbHandler.query(logHandler, "channelEnableDisable", sql, [status, channel_id], (err, response) => {
    if(err) {
      channelEnableDisable(err);
    } else {
      logger.trace(logHandler, "Edit channel was successful", response);
      channelEnableDisable(null, { status : response });
    }
  });
}


function editInfo(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let channelInfo   = payload.channelInfo;
    let userInfo      = payload.userInfo;
    let businessInfo  = payload.businessInfo;

    if(payload.custom_label && payload.custom_label == channelInfo.custom_label) {
      return {};
    }

    let opts = {
      update_fields : {},
      where_clause  : {
        business_id : businessInfo.business_id,
        channel_id  : payload.channel_id
      }
    };

    payload.custom_label  ? opts.update_fields.custom_label = payload.custom_label : 0;
    // payload.chat_type     ? opts.chat_type = payload.chat_type : 0;
    payload.channel_image ? opts.channel_image = payload.channel_image : 0;

    if(_.isEmpty(opts.update_fields)) {
      throw new Error("Please provide something to update");
    }
    yield channelService.update(logHandler, opts);

    let message = userInfo.full_name;
    // if(payload.chat_type) {
    //   message = utils.getPublicNoteByChatType(logHandler, userInfo.full_name, payload);
    // }

    if(payload.channel_image) {
      message += " updated the group icon";
    }

    if(payload.custom_label) {
      message += ` changed the group name to ${payload.custom_label} `;
    }

    let params = {};
    params.business_id = businessInfo.business_id;
    params.user_id = userInfo.user_id;
    params.channel_id = channelInfo.channel_id;
    params.channel_name = channelInfo.channel_name;
    params.data = { message : message };
    params.label_id = channelInfo.label_id;
    params.user_type = userInfo.user_type;
    params.user_name = userInfo.user_name;
    params.message_type = constants.messageType.PUBLIC_NOTE;
    yield Promise.promisify(dbquery.insertUsersConversation).call(null, logHandler, params);
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.UPDATED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}


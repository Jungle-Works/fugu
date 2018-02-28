/**
 * Created by vidit on 7/7/17.
 */
const Promise   = require('bluebird');
const dbHandler = require('../database').dbHandler;
const utils     = require('../Controller/utils');
const constants = require('../Utils/constants');
const _         = require('underscore');



exports.getTags                        = getTags;
exports.getAgentTags                   = getAgentTags;
exports.getDefaultChannelList          = getDefaultChannelList;
exports.insertTags                     = insertTags;
exports.assignTagToChannel             = assignTagToChannel;
exports.getTagsByName                  = getTagsByName;
exports.getTagById                     = getTagById;
exports.checkDuplicateTag              = checkDuplicateTag;
exports.updateTags                     = updateTags;
exports.checkTagAlreadyAssigned        = checkTagAlreadyAssigned;
exports.getChannelAssociatedTags       = getChannelAssociatedTags;
exports.updateStatusTagToChannel       = updateStatusTagToChannel;
exports.getAgentIdsFromTags            = getAgentIdsFromTags;
exports.insertOrUpdateTagsToUser       = insertOrUpdateTagsToUser;


function getTags(logHandler, businessId) {
  return new Promise((resolve, reject) => {
    let query = "SELECT `tag_id`,`tag_name`, `color_code`, `is_enabled` as status FROM `tags` WHERE `business_id` = ? AND `is_enabled` = 1";
    let queryObj = {
      query : query,
      args  : [businessId],
      event : "get Tags"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function getAgentTags(logHandler, opts) {
  return new Promise((resolve, reject) => {
    if(_.isEmpty(opts.agentIds)) {
      return resolve({});
    }
    let query = `
                SELECT 
                  tags_to_user.user_id, tags.tag_id, tags.tag_name, tags.color_code, tags.is_enabled as status 
                FROM tags_to_user LEFT JOIN tags on  tags_to_user.tag_id = tags.tag_id
                WHERE tags_to_user.user_id in (?) AND tags.is_enabled = 1 AND tags_to_user.enabled = 1`;
    let queryObj = {
      query : query,
      args  : [opts.agentIds],
      event : "getAgentTags"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      if(_.isEmpty(result)) {
        return resolve({});
      }
      let userToTags = {};
      _.each(result, (row) => {
        if(!userToTags[row.user_id]) {
          userToTags[row.user_id] = [];
        }
        userToTags[row.user_id].push({
          tag_id     : row.tag_id, tag_name   : row.tag_name, color_code : row.color_code, is_enabled : row.is_enabled 
        });
      });
      resolve(userToTags);
    }, (error) => {
      reject(error);
    });
  });
}

function getAgentIdsFromTags(logHandler, opts) {
  return new Promise((resolve, reject) => {
    if(_.isEmpty(opts.tagIds)) {
      return resolve([]);
    }
    let query = `
                SELECT 
                  distinct(tags_to_user.user_id) 
                FROM 
                  tags_to_user LEFT JOIN tags on  tags_to_user.tag_id = tags.tag_id 
                WHERE tags_to_user.tag_id in (?) AND tags.is_enabled = 1  AND tags_to_user.enabled = 1`;
    let queryObj = {
      query : query,
      args  : [opts.tagIds],
      event : "getAgentTags"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function insertOrUpdateTagsToUser(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let query = `INSERT INTO  tags_to_user  (user_id,tag_id,enabled) VALUES (?,?,?) ON DUPLICATE KEY UPDATE enabled = ?`;
    let queryObj = {
      query : query,
      args  : [opts.user_id, opts.tag_id, opts.enabled, opts.enabled],
      event : "insertOrUpdateTagsToUser"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getDefaultChannelList(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = "select channel_name as name, channel_id as id from channels where channel_type = 2 and" +
            " business_id = ? and label_id = -1";
    let queryObj = {
      query : query,
      args  : [payload.business_id],
      event : "Fetch default channel of a business for filters"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function insertTags(logHandler, opts, tags) {
  let fields = ["business_id", "tag_name", "color_code"];
  let values = [];
  let colorCode = opts.color_code || constants.defaultColor.COLORCODE;
  // number of rows will be atleast 1
  let placeHolders = "(" + new Array(fields.length).fill("?").join(', ') + " )";
  for (let i = 1; i < tags.length; i++) {
    placeHolders = placeHolders + ",(" + new Array(fields.length).fill("?").join(', ') + " )";
  }

  for (let i = 0; i < tags.length; i++) {
    values.push(opts.business_id);
    values.push(tags[i]);
    values.push(colorCode);
  }

  return new Promise((resolve, reject) => {
    let query = "INSERT INTO `tags` (" + fields.join(', ') + " ) VALUES " + placeHolders;

    let queryObj = {
      query : query,
      args  : values,
      event : "insertTags"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function assignTagToChannel(logHandler, opts, tagIds) {
  let fields = ["business_id", "tag_id", "channel_id", "status"];
  let values = [];
  // number of rows will be atleast 1
  let placeHolders = "(" + new Array(fields.length).fill("?").join(', ') + " )";
  for (let i = 1; i < tagIds.length; i++) {
    placeHolders = placeHolders + ",(" + new Array(fields.length).fill("?").join(', ') + " )";
  }
  for (let i = 0; i < tagIds.length; i++) {
    values.push(opts.business_id);
    values.push(tagIds[i]);
    values.push(opts.channel_id);
    values.push(1);
  }

  return new Promise((resolve, reject) => {
    let query = "INSERT INTO `tags_to_channel` (" + fields.join(', ') + " ) VALUES " + placeHolders;

    let queryObj = {
      query : query,
      args  : values,
      event : "insertTags"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getTagsByName(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `SELECT tag_id,tag_name, color_code, is_enabled FROM tags WHERE tag_name IN ( ? ) and business_id = ? and is_enabled = 1`;
    let queryObj = {
      query : query,
      args  : [payload.tags, payload.business_id],
      event : "getTagsByName"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getTagById(logHandler, tagId) {
  return new Promise((resolve, reject) => {
    let query = `SELECT tag_id, is_enabled, tag_name, business_id FROM tags WHERE tag_id = ?`;
    let queryObj = {
      query : query,
      args  : [tagId],
      event : "getTagById"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function checkDuplicateTag(logHandler, businessId, tagName) {
  return new Promise((resolve, reject) => {
    let query = "SELECT * FROM `tags` WHERE `business_id` = ? AND `tag_name` = ? and is_enabled = 1 ";
    let queryObj = {
      query : query,
      args  : [businessId, tagName],
      event : "checkDuplicateTag"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}
function updateTags(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = "update tags set ? where tag_id = ? and business_id = ?";
    let updateObj = {};
    (payload.tag_name)        ? updateObj.tag_name = payload.tag_name : 0;
    (payload.color_code)      ? updateObj.color_code = payload.color_code : 0;
    (payload.is_enabled || payload.is_enabled == 0)   ? updateObj.is_enabled = payload.is_enabled : 0;
    let queryObj = {
      query : query,
      args  : [updateObj, payload.tag_id, payload.business_id],
      event : "updateTags"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getChannelAssociatedTags(logHandler, channelId) {
  return new Promise((resolve, reject) => {
    let query = `
                    SELECT 
                        ttc.tag_id, t.tag_name,t.color_code,t.is_enabled
                    FROM
                        tags_to_channel ttc
                            JOIN
                        tags t ON t.tag_id = ttc.tag_id
                    WHERE
                            ttc.channel_id = ?
                            AND ttc.status = 1
                            AND t.is_enabled = 1
                    ORDER BY t.tag_name`;
    let queryObj = {
      query : query,
      args  : [channelId],
      event : "getChannelAssociatedTags"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function checkTagAlreadyAssigned(logHandler, channelId, tagId) {
  return new Promise((resolve, reject) => {
    let query = "SELECT * FROM `tags_to_channel` WHERE `tag_id` = ? AND `channel_id` = ? ";
    let queryObj = {
      query : query,
      args  : [tagId, channelId],
      event : "tag_already_assigned"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}
function updateStatusTagToChannel(logHandler, status, tagId, channelId) {
  return new Promise((resolve, reject) => {
    let query = "UPDATE `tags_to_channel` SET  `status` = ? WHERE `tag_id` = ? AND  `channel_id` = ?";
    let queryObj = {
      query : query,
      args  : [status, tagId, channelId],
      event : "updateStatusTagToChannel"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

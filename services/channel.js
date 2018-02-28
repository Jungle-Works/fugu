/**
 * Created by ashishprasher on 22/08/17.
 */
const Promise     = require('bluebird');
const dbHandler   = require('../database').dbHandler;
const _           = require('underscore');
const constants   = require('../Utils/constants');
const utils       = require('../Controller/utils');
const async       = require('async');
const logger      = require('../Routes/logging');
const dbquery     = require('../DAOManager/query');
const userService = require('../services/user');



exports.getLabelById                            = getLabelById;
exports.getChannelByTransactionId               = getChannelByTransactionId;
exports.update                                  = update;
exports.getInfo                                 = getInfo;
exports.getUsersWithDetailsFromUserToChannel    = getUsersWithDetailsFromUserToChannel;
exports.disableUsersOfUserToChannel             = disableUsersOfUserToChannel;
exports.enableUsersOfUserToChannel              = enableUsersOfUserToChannel;
exports.insertUsersInUserToChannel              = insertUsersInUserToChannel;
exports.getOwnerAndAgentOfChannel               = getOwnerAndAgentOfChannel;
exports.getUsersFromUserToChannelExceptUserId   = getUsersFromUserToChannelExceptUserId;
exports.getUserFromUserToChannel                = getUserFromUserToChannel;
exports.disableUsersOnChannelExceptUser         = disableUsersOnChannelExceptUser;
exports.assignAgent                             = assignAgent;
exports.getChannelWithLabelAndOwner             = getChannelWithLabelAndOwner;
exports.getChannelAndLabelInfo                  = getChannelAndLabelInfo;
exports.getDefaultChannelsInfoExceptLabelIds    = getDefaultChannelsInfoExceptLabelIds;
exports.getDefaultChannels                      = getDefaultChannels;
exports.getAgentAssignedChats                   = getAgentAssignedChats;
exports.markChatsUnassigned                     = markChatsUnassigned;
exports.disableUserOnChannels                   = disableUserOnChannels;
exports.getChannelsInfo                         = getChannelsInfo;
exports.updateLastActivityAtChannel             = updateLastActivityAtChannel;
exports.getUserToChannelDetails                 = getUserToChannelDetails;
exports.getChannelDetailsTransactionId          = getChannelDetailsTransactionId;
exports.getUserChannelStatsByUserUniqueKey      = getUserChannelStatsByUserUniqueKey;
exports.migrateAgentChats                       = migrateAgentChats;
exports.getUsersParticipatedChannels            = getUsersParticipatedChannels;
exports.groupSearchByName                       = groupSearchByName;
exports.getGroupChannelsWithMemberNames         = getGroupChannelsWithMemberNames;
exports.getChannelsHavingUsers                  = getChannelsHavingUsers;
exports.addUserToGeneralChat                    = addUserToGeneralChat;
exports.getAllChannelsWithChatType              = getAllChannelsWithChatType;
exports.getUserChannelsInfo                     = getUserChannelsInfo;
exports.insertOrUpdateChannelHistory            = insertOrUpdateChannelHistory;
exports.getUsersFromUserToChannelExceptUserIdHavingChannelIds = getUsersFromUserToChannelExceptUserIdHavingChannelIds;
exports.getUserJoinedGroups                     = getUserJoinedGroups;
exports.getOpenGroups                           = getOpenGroups;
exports.getOpenGroupsByGroupName                = getOpenGroupsByGroupName;
exports.getUserChannelInfo                      = getUserChannelInfo;

function getLabelById(logHandler, labelId) {
  return new Promise((resolve, reject) => {
    let query = `SELECT channel_name AS label_name, default_message FROM channels WHERE channel_id = ?`;
    let queryObj = {
      query : query,
      args  : [labelId],
      event : "getLabelById"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function update(logHandler, payload) {
  return new Promise((resolve, reject) => {
    logger.trace(logHandler, { EVENT : "Updating channel" }, { PAYLOAD : payload });
    if(_.isEmpty(payload.update_fields)) {
      return reject(new Error("Update Fields Missing"));
    }
    if(_.isEmpty(payload.where_clause)) {
      return reject(new Error("Where condition Empty"));
    }


    let updateObj = {};
    updateObj.updated_at = new Date();

    let validUpdateColumns = new Set(["channel_name", "status", "channel_type", "lmu_id", "lma_id", "lm_updated_at", "owner_id", "agent_id", "updated_at",
      "default_message", "label_id", "label", "channel_image", "channel_priority", "chat_type", "custom_label"]);
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

    let query = `UPDATE channels SET ?  where 1=1 ${whereCondition}`;
    let queryObj = {
      query : query,
      args  : [updateObj].concat(values),
      event : "Updating channel"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function getChannelByTransactionId(logHandler, transactionId, businessId) {
  return new Promise((resolve, reject) => {
    let query = `SELECT channel_id, channel_name, custom_label, transaction_id from channels  where transaction_id = ? AND business_id = ?`;
    let queryObj = {
      query : query,
      args  : [transactionId, businessId],
      event : "getChannelByTransactionId"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getChannelDetailsTransactionId(logHandler, transactionIds, userEmail) {
  return new Promise((resolve, reject) => {
    let likeArray = [];
    let args = [];

    transactionIds.forEach((transactionId) => {
      likeArray.push(` transaction_id LIKE ? `);
      args.push(`%${transactionId}%`);
    });
    let likeStatement = likeArray.join(' OR ');

    let query = `SELECT 
                  channel_id, agent_id
                from 
                  channels  
                where ( ${likeStatement} ) 
                  and status = 1 and lmu_id IS NOT NULL`;
    let queryObj = {
      query : query,
      args  : args,
      event : "getChannelDetailsTransactionId Order Channel"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      // return empty object in case of no data
      if(result.length === 0) {
        let query = `select 
                      c.channel_id, c.agent_id as agent_id
                    from 
                      users u
                    join 
                      channels c
                    on 
                      c.owner_id = u.user_id 

                    where 
                    u.email = ? 
                    and c.transaction_id is null
                    and c.status = 1 
                    and c.lmu_id IS NOT NULL `;
        let queryObj = {
          query : query,
          args  : [userEmail],
          event : "getChannelDetailsTransactionId General Channel"
        };
        dbHandler.executeQuery(logHandler, queryObj).then((result) => {
          if(result.length === 0) {
            resolve({});
          }
          resolve(result[0]);
        });
      } else {
        resolve(result[0]);
      }
      // send 1st object expecting object {channel_id, agent_id}
    }, (error) => {
      reject(error);
    });
  });
}


function getInfo(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `SELECT * from channels where channel_id = ?`;
    let queryObj = {
      query : query,
      args  : [payload.channel_id],
      event : "getChannelInfo"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getUserJoinedGroups(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = ` SELECT 
                  utc.channel_id,
                  c.chat_type,COALESCE(c.channel_image,'') as channel_image ,COALESCE(c.custom_label, '') AS label
                  FROM
                      user_to_channel utc
                          LEFT JOIN
                      channels c ON c.channel_id = utc.channel_id AND  c.chat_type in (3,4,5)
                  WHERE
                      utc.user_id = ?
                          AND utc.status = 1
                          AND c.business_id = ?`;
    let queryObj = {
      query : query,
      args  : [payload.user_id, payload.business_id],
      event : "getUserJoinedGroups"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getOpenGroups(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let placeholder = "";
    let values = [payload.business_id, payload.user_id];
    if(payload.search_query) {
      values.push("%" + payload.search_query + "%");
      placeholder = ` AND custom_label like ?`;
    }
    let query = `SELECT 
                  channel_id, chat_type,COALESCE(channel_image,'') as channel_image ,COALESCE(custom_label, '') AS label
                  FROM
                      channels c
                  WHERE
                       business_id = ? AND  chat_type = 4 AND channel_id not in (
                            SELECT 
                                channel_id
                            FROM
                                user_to_channel 
                            WHERE
                                user_id = ? AND status = 1) AND status = 1 ${placeholder} `;

    let queryObj = {
      query : query,
      args  : values,
      event : "getOpenGroups"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getOpenGroupsByGroupName(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = ` SELECT 
                  c.channel_id, c.chat_type,COALESCE(c.channel_image,'') as channel_image ,COALESCE(c.custom_label, '') AS label
                  FROM
                      channels c
                  WHERE
                       c.business_id = ? AND  c.chat_type in (4) AND c.channel_id not in (
                            SELECT 
                                utc.channel_id
                            FROM
                                user_to_channel utc
                            WHERE
                                utc.user_id = ? AND utc.status = 1
                  )`;
    let queryObj = {
      query : query,
      args  : [payload.business_id, payload.search_query],
      event : "getOpenGroups"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getAllChannelsWithChatType(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `SELECT * from channels where business_id = ? and chat_type = ?`;
    let queryObj = {
      query : query,
      args  : [payload.business_id, payload.chat_type],
      event : "getAllChannelsWithChannelType"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


// TODO : remove heavy query
function getChannelsHavingUsers(logHandler, payload) {
  return new Promise((resolve, reject) => {
    if(_.isEmpty(payload.userIds)) {
      return resolve([]);
    }
    let query = `
                  SELECT
                  channels.channel_id,
                  channels.custom_label,
                  channels.channel_image
                  FROM
                      (
                      SELECT DISTINCT
                          channel_id
                      FROM
                          user_to_channel
                      WHERE
                          user_to_channel.user_id = ? AND user_to_channel.channel_id IN(
                          SELECT DISTINCT
                              channel_id
                          FROM
                              user_to_channel
                          WHERE
                              user_to_channel.user_id = ?
                      )
                  ) AS utc
                  LEFT JOIN channels ON channels.channel_id = utc.channel_id AND channels.chat_type = ? AND utc.channel_id is NOT NULL
                  WHERE channels.channel_id is NOT NULL`;
    let queryObj = {
      query : query,
      args  : [payload.userIds[0], payload.userIds[1], payload.chat_type],
      event : "getChannelsHavingUsers"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getChannelsInfo(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `SELECT * from channels where channel_id IN (?) and business_id = ?`;
    let queryObj = {
      query : query,
      args  : [payload.channel_ids, payload.business_id],
      event : "getChannelsInfo"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getGroupChannelsWithMemberNames(logHandler, payload) {
  return new Promise((resolve, reject) => {
    if(_.isEmpty(payload.channel_ids)) {
      return resolve([]);
    }
    let query = `
                  SELECT
                  c.channel_id,c.chat_type,c.channel_image, COALESCE(c.custom_label, '') AS label,
                  GROUP_CONCAT(users.full_name) AS members, count(*) as members_count
                  FROM
                      channels c
                  LEFT JOIN user_to_channel utc ON
                      c.channel_id = utc.channel_id
                  LEFT JOIN users ON users.user_id = utc.user_id
                  WHERE
                      c.chat_type IN (3,4) AND c.channel_id IN (?) AND c.business_id = ? and c.status = 1 and utc.status = 1
                  GROUP BY
                      c.channel_id`;
    let queryObj = {
      query : query,
      args  : [payload.channel_ids, payload.business_id],
      event : "getChannelsWithMemberDetails"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getUsersWithDetailsFromUserToChannel(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `
              SELECT 
                  uc.*, users.full_name, users.user_type
              FROM
                  user_to_channel AS uc LEFT JOIN
                  users ON users.user_id = uc.user_id
              WHERE
                  channel_id = ? `;
    let queryObj = {
      query : query,
      args  : [payload.channel_id],
      event : "getAllFromUserToChannel"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function disableUsersOfUserToChannel(logHandler, userList, channel_id) {
  return new Promise((resolve, reject) => {
    let query = `UPDATE user_to_channel SET status = 0 WHERE user_id in (?) AND channel_id = ?`;
    let queryObj = {
      query : query,
      args  : [userList, channel_id],
      event : "disableUsersOfUserToChannel"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getUsersFromUserToChannelExceptUserIdHavingChannelIds(logHandler, opts) {
  return new Promise((resolve, reject) => {
    if(!opts.channel_ids.length) {
      return resolve({});
    }
    let query = `
                SELECT 
                utc.channel_id, utc.user_id, utc.created_at,u.user_type, u.full_name, u.user_image
            FROM
                user_to_channel utc
                left join users u 
                on u.user_id = utc.user_id
            WHERE
                utc.channel_id in (?) AND utc.user_id not in (?) AND utc.status != 0
            ORDER BY utc.created_at`;
    let queryObj = {
      query : query,
      args  : [opts.channel_ids, opts.user_id],
      event : "getUsersFromUserToChannelExceptUserIdHavingChannelIds"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      let channelToResult = {};
      for (let res of result) {
        if(!channelToResult[res.channel_id]) {
          channelToResult[res.channel_id] = [];
        }
        channelToResult[res.channel_id].push(res);
      }
      resolve(channelToResult);
    }, (error) => {
      reject(error);
    });
  });
}

function getUsersFromUserToChannelExceptUserId(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let query = `
                SELECT 
                utc.user_id, utc.created_at,u.user_type, u.full_name, u.user_image
            FROM
                user_to_channel utc
                left join users u 
                on u.user_id = utc.user_id
            WHERE
                utc.channel_id = ? AND utc.user_id not in (?) AND utc.status != 0
            ORDER BY utc.created_at`;
    let queryObj = {
      query : query,
      args  : [opts.channel_id, opts.user_id],
      event : "getUsersFromUserToChannelExceptUserId"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function enableUsersOfUserToChannel(logHandler, userList, channel_id) {
  return new Promise((resolve, reject) => {
    let query = `UPDATE user_to_channel SET status = 1 WHERE user_id in (?) AND channel_id = ?`;
    let queryObj = {
      query : query,
      args  : [userList, channel_id],
      event : "enableUsersOfUserToChannel"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function insertUsersInUserToChannel(logHandler, userList, channel_id) {
  return new Promise((resolve, reject) => {
    let values = [];
    for (let user of userList) {
      values = values.concat([user, channel_id]);
    }
    let placeHolder = new Array(userList.length).fill("(?,?)").join(',');

    let query = `INSERT INTO user_to_channel (user_id, channel_id) VALUES ${placeHolder}`;
    let queryObj = {
      query : query,
      args  : values,
      event : "insertUsersInUserToChannel"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getOwnerAndAgentOfChannel(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let query = `
                 SELECT 
                    c.owner_id,
                    c.agent_id,
                    owners.full_name AS owner_name,
                    COALESCE(agents.user_image, '') AS agent_image,
                    COALESCE(agents.full_name, '') AS agent_name,
                    owners.attributes AS owner_address,
                    owners.phone_number AS owner_phone_number,
                    owners.email AS owner_email
                FROM
                    channels c
                        LEFT JOIN
                    users owners ON c.owner_id = owners.user_id
                        LEFT JOIN
                    users agents ON c.agent_id = agents.user_id
                WHERE
                    channel_id = ?`;
    let queryObj = {
      query : query,
      args  : [opts.channel_id],
      event : "getOwnerAndAgentOfChannel"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      if(result.length) { return resolve(result[0]); }
      return resolve({});
    }, (error) => {
      reject(error);
    });
  });
}

function getUserFromUserToChannel(logHandler, user_id, channel_id) {
  return new Promise((resolve, reject) => {
    let query = `select user_id from user_to_channel where user_id = ? and channel_id = ? and status = 1`;
    let queryObj = {
      query : query,
      args  : [user_id, channel_id],
      event : "getUserFromUserToChannel"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function disableUsersOnChannelExceptUser(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let query = `UPDATE user_to_channel SET status = 0 WHERE channel_id = ? AND status !=0 AND user_id != ?`;
    let queryObj = {
      query : query,
      args  : [opts.channel_id, opts.user_id],
      event : "disableUsersOnChannelExceptUser"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function updateLastActivityAtChannel(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let query = `UPDATE user_to_channel SET last_activity = ? WHERE channel_id = ? AND user_id = ?`;
    let queryObj = {
      query : query,
      args  : [new Date(), opts.channel_id, opts.user_id],
      event : "updateLastActivityAtChannel"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function assignAgent(logHandler, opts) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      // update assigned agent
      let updatePayload = {
        update_fields : { agent_id : opts.user_id },
        where_clause  : {
          channel_id : opts.channel_id
        }
      };
      yield update(logHandler, updatePayload);

      // get agents
      let existingUsers = yield getUsersWithDetailsFromUserToChannel(logHandler, opts);
      let removeAssignedAgents = [];
      let updateCurrentAgentStatus = false;
      for (let user of Array.from(existingUsers)) {
        if(user.status == constants.userStatus.ENABLE && user.user_type == constants.userType.AGENT) {
          removeAssignedAgents.push(user.user_id);
        } else if(user.user_id == opts.user_id) {
          updateCurrentAgentStatus = true;
        }
      }

      // update agents status
      if(!_.isEmpty(removeAssignedAgents)) {
        yield disableUsersOfUserToChannel(logHandler, removeAssignedAgents, opts.channel_id);
      }

      let updateObj = {
        user_id    : opts.user_id,
        channel_id : opts.channel_id,
        status     : constants.userStatus.ENABLE
      };
      yield userService.insertOrUpdateUserToChannel(logHandler, updateObj);

      return {};
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}

function getChannelWithLabelAndOwner(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let query = "SELECT * FROM channels WHERE owner_id = ? AND label_id = ?";
    let queryObj = {
      query : query,
      args  : [opts.user_id, opts.label_id],
      event : "getChannelWithLabelAndOwner"
    };
    dbHandler.executeQuery(logHandler, queryObj).then(
      (result) => { resolve(result); },
      (error) => { reject(error); }
    );
  });
}

function getChannelAndLabelInfo(logHandler, channel_id) {
  return new Promise((resolve, reject) => {
    let query = `SELECT 
                  channels.channel_name,
                  channels.label_id,
                  labels.channel_name AS label,
                  labels.status AS label_status,
                  channels.custom_attributes as custom_attributes
              FROM
                  channels
                      LEFT JOIN
                  channels AS labels ON channels.label_id = labels.channel_id
              WHERE
                  channels.channel_id = ?`;

    let queryObj = {
      query : query,
      args  : [channel_id],
      event : "get channel and label info"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getDefaultChannelsInfoExceptLabelIds(logHandler, business_id, labelIds) {
  return new Promise((resolve, reject) => {
    let query = `
                  SELECT 
                  - 1 AS channel_id,
                  channel_name,
                  0 AS user_id,
                  created_at AS date_time,
                  default_message AS message,
                  label,
                  channel_id AS label_id,
                  status,
                  1 AS channel_status,
                  0 AS unread_count,
                  channel_image,
                  channel_priority
              FROM
                  channels
              WHERE
                  channel_type = 2 AND business_id = ?
                      AND channel_id NOT IN (?)
                      AND status != 0
              ORDER BY channel_priority`;

    let queryObj = {
      query : query,
      args  : [business_id, labelIds],
      event : "getDefaultChannelsInfoExceptLabelIds"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function getDefaultChannels(logHandler, business_id) {
  return new Promise((resolve, reject) => {
    let query = `
                  SELECT 
                      channel_id,
                      channel_name,
                      default_message,
                      status,
                      channel_image,
                      channel_priority,
                      custom_attributes
                  FROM
                      channels
                  WHERE
                      business_id = ? AND channel_type = 2
                          AND status IN (0 , 1)
                  ORDER BY status desc, channel_priority`;

    let queryObj = {
      query : query,
      args  : [business_id],
      event : "getDefaultChannels"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      for (let i = 0; i < result.length; i++) {
        result[i].custom_attributes = utils.jsonParse(result[i].custom_attributes);
      }
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getAgentAssignedChats(logHandler, agent_id) {
  return new Promise((resolve, reject) => {
    let query = `SELECT channel_id, channel_name, label_id FROM channels where agent_id = ? and status = ?`;

    let queryObj = {
      query : query,
      args  : [agent_id, constants.channelStatus.OPEN],
      event : "getAgentAssignedChats"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function markChatsUnassigned(logHandler, channel_id) {
  return new Promise((resolve, reject) => {
    let query = `update channels SET agent_id = 0 where channel_id IN (?)`;

    let queryObj = {
      query : query,
      args  : [channel_id],
      event : "markChatsUnassigned"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function disableUserOnChannels(logHandler, user_id, channel_ids) {
  return new Promise((resolve, reject) => {
    let query = `UPDATE user_to_channel SET status = 0 WHERE user_id = ? AND channel_id IN (?)`;
    let queryObj = {
      query : query,
      args  : [user_id, channel_ids],
      event : "disableUserOnChannels"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function getUsersParticipatedChannels(logHandler, opts) {
  return new Promise((resolve, reject) => {
    if(_.isEmpty(opts.userIds)) {
      return resolve({});
    }
    let query    = `SELECT distinct(channel_id) from user_to_channel where user_id in (?) AND status = 1 AND channel_id in (
                      SELECT channel_id from user_to_channel where user_id = ?  AND status = 1
                    )`;
    let queryObj = {
      query : query,
      args  : [opts.userIds, opts.user_id],
      event : "getUsersParticipatedChannels"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function getUserToChannelDetails(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let params = {};
    let values = [];
    let whereCondition = "";
    if(payload.channel_id) {
      params.channel_id = payload.channel_id;
    }
    if(payload.user_id) {
      params.user_id = payload.user_id;
    }
    if(utils.isDefined(payload.status)) {
      params.status = payload.status;
    }
    if(_.isEmpty(params)) {
      throw new Error("Invalid query parameters getUserToChannelDetails ");
    }

    _.each(params, (value, key) => {
      whereCondition += " AND " + key + " = ? ";
      values.push(value);
    });

    let query = `SELECT * from user_to_channel where 1=1 ${whereCondition} `;
    let queryObj = {
      query : query,
      args  : values,
      event : "getUserToChannelDetails"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getUserChannelStatsByUserUniqueKey(logHandler, userUniqueKey) {
  return new Promise((resolve, reject) => {
    let query = `SELECT
                      c.channel_id,
                      c.custom_label,
                      c.label,
                      c.created_at,
                      c.status,
                      c.agent_id,
                      agent.email as agent_email,
                      u.user_id
                  FROM
                      channels c
                  LEFT JOIN  users u ON
                      c.owner_id = u.user_id
                  LEFT JOIN users agent ON
                      agent.user_id = c.agent_id
                  where u.user_unique_key = ?`;
    let queryObj = {
      query : query,
      args  : [userUniqueKey],
      event : "getUserChannelStatsByUserUniqueKey"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function migrateAgentChats(logHandler, payload, agentDetails) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let channelIds = [];
      let channelDetails = yield getAgentAssignedChats(logHandler, payload.user_id);

      if(!_.isEmpty(channelDetails)) {
        for (let i = 0; i < channelDetails.length; i++) {
          channelIds.push(channelDetails[i].channel_id);
        }
        // TODO remove loop queries
        logger.trace(logHandler, { EVENT : "channelDetails Channel Ids", channelIds });
        if(payload.assign_to_agent_id) {
          for (let i = 0; i < channelIds.length; i++) {
            let opts = {
              user_id    : payload.assign_to_agent_id,
              channel_id : channelIds[i]
            };
            yield assignAgent(logHandler, opts);
          }
          message = "The Chat was re-assigned to " + agentDetails[0].full_name;
        } else {
          markChatsUnassigned(logHandler, channelIds);
          disableUserOnChannels(logHandler, payload.user_id, channelIds);
          message = "The Chat was marked un-assigned";
        }
        let localopts = {};
        localopts.business_id  = payload.business_id;
        localopts.user_id      = payload.userInfo.user_id;
        localopts.data         = { message : message };
        localopts.user_type    = payload.userInfo.user_type;
        localopts.full_name    = payload.userInfo.full_name;
        localopts.message_type = constants.messageType.NOTE;
        for (let i = 0; i < channelDetails.length; i++) {
          localopts.label_id     = channelDetails[i].label_id;
          localopts.channel_id   = channelDetails[i].channel_id;
          localopts.channel_name = channelDetails[i].channel_name;
          yield Promise.promisify(dbquery.insertUsersConversation).call(null, logHandler, localopts);
        }
      }
    })().then((data) => {
      logger.trace(logHandler, { RESPONSE : data });
      return resolve();
    }, (error) => {
      logger.error(logHandler, error);
      return reject(error);
    });
  });
}



function groupSearchByName(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let values = [payload.business_id, '%' + payload.search_text + "%", payload.user_id];
    let query = `SELECT channels.channel_id FROM channels 
                 LEFT JOIN user_to_channel on channels.channel_id = user_to_channel.channel_id
                 WHERE channels.business_id = ? and channels.chat_type in (3,4) and channels.custom_label like ?  
                 AND user_to_channel.user_id = ? AND user_to_channel.status = 1 AND channels.status = 1
                 limit 10`;
    let queryObj = {
      query : query,
      args  : values,
      event : "groupSearchByName"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function addUserToGeneralChat(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let channel_id;
      let channels = yield getAllChannelsWithChatType(logHandler, { business_id : payload.business_id, chat_type : constants.chatType.GENERAL_CHAT });
      if(!channels.length) {
        let params           = {};
        params.chat_type     = constants.chatType.GENERAL_CHAT;
        params.channel_type  = constants.channelType.DEFAULT;
        params.business_id   = payload.business_id;
        params.channel_name  = "user_" + payload.user_id + "_" + Math.round(parseFloat(Math.random() * 1000000)) + "";
        params.owner_id      = payload.user_id;
        params.custom_label  = constants.generalChatName;
        params.channel_image = constants.groupChatImageURL;
        let response = yield Promise.promisify(dbquery.insertIntoChannels).call(null, logHandler, params);
        channel_id = response.insertId;

        let opts = {};
        opts.business_id  = payload.business_id;
        opts.user_id      = 0;
        opts.channel_id   = channel_id;
        opts.data         = { message : constants.generalChatIntroMessage };
        opts.user_type    = constants.userType.BOT;
        opts.message_type = constants.messageType.MESSAGE;
        yield Promise.promisify(dbquery.insertUsersConversation).call(null, logHandler, opts);
      } else {
        channel_id = channels[0].channel_id;
      }

      let updateObj        = {};
      updateObj.user_id    = payload.user_id;
      updateObj.channel_id = channel_id;
      updateObj.status     = constants.userStatus.ENABLE;
      yield userService.insertOrUpdateUserToChannel(logHandler, updateObj);

      return {};
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}


function getUserChannelsInfo(logHandler, userId) {
  return new Promise((resolve, reject) => {
    let query = `SELECT
                    COALESCE(c.custom_label, '') AS label,
                    utc.channel_id,
                    utc.notification
                FROM
                    user_to_channel utc
                LEFT JOIN channels c ON
                    utc.channel_id = c.channel_id
                WHERE
                    utc.user_id =  ? and utc.status = 1 `;
    let queryObj = {
      query : query,
      args  : [userId],
      event : "getUserChannelsInfo"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getUserChannelInfo(logHandler, userId) {
  return new Promise((resolve, reject) => {
    let query = `SELECT
                    COALESCE(c.custom_label, '') AS label,
                    utc.channel_id,
                    utc.notification
                FROM
                    user_to_channel utc
                LEFT JOIN channels c ON
                    utc.channel_id = c.channel_id
                WHERE
                    utc.user_id =  ? and utc.status = 1 `;
    let queryObj = {
      query : query,
      args  : [userId],
      event : "getUserChannelInfo"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function insertOrUpdateChannelHistory(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let query = `INSERT INTO  channel_history  (user_id,channel_id,last_read_message_id,last_message_read_at) VALUES (?,?,?,?) 
                 ON DUPLICATE KEY UPDATE last_read_message_id = ?, last_message_read_at = ?`;
    let queryObj = {
      query : query,
      args  : [opts.user_id, opts.channel_id, opts.message_id, new Date(), opts.message_id, new Date()],
      event : "insertOrUpdateChannelHistory"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

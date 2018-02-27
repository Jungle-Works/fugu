/**
 * Created by vidit on 10/7/17.
 */
const Promise                       = require('bluebird');
const timsort                       = require('timsort');
const _                             = require('underscore');
const dbHandler                     = require('../database').dbHandler;
const utils                         = require('../Controller/utils');
const constants                     = require('../Utils/constants');
const logger                        = require('../Routes/logging');
const userService                   = require('./user');
const notifierService               = require('./notifier');
const channelService                = require('../services/channel');
const dbquery                       = require('../DAOManager/query');
const notificationBuilder           = require('../Builder/notification');



exports.getChatMessages                       = getChatMessages;
exports.getUserConversation                   = getUserConversation;
exports.getMessage                            = getMessage;
exports.notifyReadAll                         = notifyReadAll;
exports.getChannelInfoFromLabelId             = getChannelInfoFromLabelId;
exports.getReadUnreadOfUserMessages           = getReadUnreadOfUserMessages;
exports.syncMessageHistory                    = syncMessageHistory;
exports.markConversation                      = markConversation;
exports.checkChatIsCreatedByAgent             = checkChatIsCreatedByAgent;
exports.getChannelsTotalMessageCount          = getChannelsTotalMessageCount;
exports.getUnreadCountForCustomer             = getUnreadCountForCustomer;
exports.getUnreadCountForAgent                = getUnreadCountForAgent;
exports.getReadLastReadMessageByOtherUser     = getReadLastReadMessageByOtherUser;

function getChannelInfoFromLabelId(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let query = `
                  SELECT 
                      c.*
                  FROM
                      channels c
                          LEFT JOIN
                      user_to_channel utc ON c.channel_id = utc.channel_id
                          where utc.user_id = ?
                          AND c.business_id = ?
                          AND c.label_id = ?`;
    let queryObj = {
      query : query,
      args  : [opts.user_id, opts.business_id, opts.label_id],
      event : "getChannelInfoFromLabelId"
    };
    dbHandler.executeQuery(logHandler, queryObj).then(
      (result) => { resolve(result); },
      (error) => { reject(error); }
    );
  });
}

function notifyReadAll(logHandler, opts) {
  logger.trace(logHandler, "sending read all push for notify readUnread");
  let message = notificationBuilder.getObject(notificationBuilder.notificationType.READ_ALL);
  message.user_id     = opts.user_id;
  message.user_type   = opts.user_type;
  message.channel_id  = opts.channel_id;
  let ccPush = {
    messageAt : '/' + opts.channel_id,
    message   : message
  };
  notifierService.sendControlChannelEvent(ccPush);
}

function getMessage(logHandler, message_id) {
  return new Promise((resolve, reject) => {
    let query = `select * from users_conversation where id = ?`;
    let queryObj = {
      query : query,
      args  : [message_id],
      event : "getMessage"
    };
    dbHandler.executeQuery(logHandler, queryObj).then(
      (result) => { resolve(result); },
      (error) => { reject(error); }
    );
  });
}

function getUserConversation(logHandler, opts, callback) {
  Promise.coroutine(function* () {
    let userInfo         = yield userService.getInfo(logHandler, opts.user_id);
    if(userInfo[0].user_type == constants.userType.AGENT) {
      throw new Error("Agent not supported in getUserConversation");
    }

    // fetch conversation
    opts.business_id     = userInfo[0].business_id;
    let userConversation = yield getUserConversationInfo(logHandler, opts);
    let userConversationsWithEnabledLabels = [];
    let labelIds = [-1];
    let lastMessageUserIds = [];
    let channelIds = [];
    for (let i = 0; i < userConversation.length; i++) {
      utils.addAllKeyValues(utils.jsonToObject(logHandler, userConversation[i].message), userConversation[i]);
      userConversation[i].label = userConversation[i].custom_label || userConversation[i].label || userConversation[i].assigned_agent_name || opts.business_name;
      delete userConversation[i].assigned_agent_name;
      delete userConversation[i].custom_label;
      lastMessageUserIds.push(userConversation[i].last_message_user_id);
      if(userConversation[i].label_id > 0) {
        labelIds.push(userConversation[i].label_id);
      }
      if(userConversation[i].channel_priority < 0) {
        userConversation[i].channel_priority = constants.MAX_INTEGER;
      }
      if(userConversation[i].status != constants.channelStatus.DISABLED) {
        userConversationsWithEnabledLabels.push(userConversation[i]);
      }
      channelIds.push(userConversation[i].channel_id);
    }


    // fetch labels for every channel
    let userChannelInfo = yield channelService.getUsersFromUserToChannelExceptUserIdHavingChannelIds(logHandler, { channel_ids : channelIds, user_id : opts.user_id  });
    for (let i = 0; i < userConversation.length; i++) {
      if(userConversation[i].chat_type == constants.chatType.O20_CHAT) {
        let otherUsers = userChannelInfo[userConversation[i].channel_id] || [];
        userConversation[i].label = (otherUsers.length > 0) ? (otherUsers[0].full_name || payload.businessInfo.business_name) : userConversation[i].label;
        userConversation[i].channel_image = ((otherUsers.length > 0) && !_.isEmpty(otherUsers[0].user_image)) ? otherUsers[0].user_image : userConversation[i].channel_image;
      }
    }

    // fetch unread count for every channel   ( for user )
    let channelToUnreadCount = {};
    if(!_.isEmpty(channelIds)) { channelToUnreadCount = yield getUnreadCountForCustomer(logHandler, channelIds, opts.user_id); }

    // read unread of user message for each last message
    let lastReadMessages = {};
    if(!_.isEmpty(lastMessageUserIds)) {
      lastReadMessages = yield getReadLastReadMessagesByOtherUser(logHandler, channelIds, opts.user_id);
    }


    // fetch default conversation labels
    let defaultChannelsInfo = yield channelService.getDefaultChannelsInfoExceptLabelIds(logHandler, opts.business_id, labelIds);
    let conversations = userConversationsWithEnabledLabels.concat(defaultChannelsInfo);
    timsort.sort(conversations, (a, b) => {
      if(a.channel_priority > b.channel_priority) { return 1; } else if(a.channel_priority < b.channel_priority) { return -1; }
      return 0;
    });

    // adding last_message_status and channelToUnreadCount
    for (let i = 0; i < conversations.length; i++) {
      if(lastReadMessages[conversations[i].channel_id] &&
        lastReadMessages[conversations[i].channel_id].last_read_message_id >= conversations[i].last_message_user_id) {
        conversations[i].last_message_status = constants.messageStatus.READ;
      } else {
        conversations[i].last_message_status = constants.messageStatus.SENT;
      }
      conversations[i].unread_count        = channelToUnreadCount[conversations[i].channel_id] || 0;
      delete conversations[i].last_message_user_id;
    }



    return {
      conversation_list : conversations,
      count             : conversations.length,
      page_size         : constants.getConversationsPageSize
    };
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    return callback(null, data);
  }, (error) => {
    logger.error(logHandler, error);
    return callback(error);
  });
}


function getUserConversationInfo(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let query = `
                 SELECT 
                  utc.channel_id,
                  customer.user_id,
                  COALESCE(c.channel_name, "") AS channel_name,
                  COALESCE(c.label_id,-1) AS label_id,
                  c.custom_label,
                  c.chat_type,
                  COALESCE(c.transaction_id, "") as transaction_id,
                  utc.notification,
                  COALESCE(agent.user_image, "") AS agent_image,
                  COALESCE(agent.full_name ,"")AS assigned_agent_name,
                  COALESCE(labels.status, -1) as status,
                  COALESCE(c.status, -1) as channel_status,
                  COALESCE(labels.channel_image, c.channel_image, "") AS channel_image,
                  COALESCE(labels.channel_priority, -1) AS channel_priority,
                  COALESCE(labels.channel_name, "") AS label,
                  COALESCE(labels.default_message, "") AS default_message,
                  c.lmu_id as last_message_user_id,
                  uc.message as message,
                  uc.message_type as message_type,
                  uc.created_at as date_time,
                  COALESCE(last_message_user.user_id, -1) AS last_sent_by_id,
                  COALESCE(last_message_user.full_name, "") AS last_sent_by_full_name,
                  COALESCE(last_message_user.user_type, -1) AS last_sent_by_user_type
              FROM
                  user_to_channel utc
                      LEFT JOIN
                  channels c ON c.channel_id = utc.channel_id
                      LEFT JOIN
                  users AS customer ON customer.user_id = utc.user_id
                      LEFT JOIN
                  users AS agent ON agent.user_id = c.agent_id
                      LEFT JOIN
                  channels AS labels ON labels.channel_id = c.label_id
                      LEFT JOIN 
                  users_conversation uc ON  uc.id = c.lmu_id
                      LEFT JOIN
                  users as last_message_user ON last_message_user.user_id = uc.user_id
              WHERE
                  utc.user_id = ?
                      AND utc.status = 1
                      AND c.channel_type = 4
                      AND c.business_id = ?
                      AND message is not null
              ORDER BY c.status, c.lmu_id DESC`;

    let queryObj = {
      query : query,
      args  : [opts.user_id, opts.business_id],
      event : "getUserConversation"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function getChatMessages(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let where_clause = "";
    if(opts.user_type == constants.userType.CUSTOMER) {
      where_clause = " AND message_type IN (" + constants.userVisibleMessageTypes.join(", ") + ") ";
    }
    if(opts.user_type == constants.userType.AGENT) {
      where_clause = " AND uc.user_id not IN (0) ";
    }
    let query = `
                SELECT 
                u.full_name AS full_name,
                u.user_type AS user_type,
                uc.id,
                ifnull(u.email,"") as email,
                uc.user_id,
                uc.created_at AS date_time,
                uc.message,
                uc.message_type
            FROM
                users_conversation uc
                    LEFT JOIN
                users u ON u.user_id = uc.user_id
            WHERE
                channel_id = ?
    ${where_clause}
     ORDER BY uc.id DESC LIMIT ? , ?`;
    let queryObj = {
      query : query,
      args  : [opts.channel_id, Math.abs(opts.page_start - 1), Math.abs(opts.page_end - opts.page_start + 1)],
      event : "getChatMessages"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getLatestMessageInConversation(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let query = ` 
                SELECT 
                    *
                FROM
                    users_conversation 
                WHERE
                    channel_id = ? 
                    ORDER BY id desc
                LIMIT 1
                `;
    let queryObj = {
      query : query,
      args  : [opts.channel_id],
      event : "getLatestMessageInConversation"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function syncMessageHistory(logHandler, opts) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let latestMessage = yield getLatestMessageInConversation(logHandler, { channel_id : opts.channel_id });
      if(!latestMessage.length) {
        logger.info(logHandler, "No latest message on channel found : " + opts.channel_id);
        return {};
      }
      latestMessage = latestMessage[0];
      yield channelService.insertOrUpdateChannelHistory(logHandler, { user_id : opts.user_id, channel_id : opts.channel_id, message_id : latestMessage.id });
      return {};
    })().then(
      (data) => {
        logger.trace(logHandler, "syncReadUnread complete");
        resolve(data);
      },
      (error) => {
        logger.error(logHandler, "Error in syncReadUnread ", error);
        reject(error);
      }
    );
  });
}



function markConversation(logHandler, opts) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let message;
      let status = opts.status;
      let userInfo = opts.userInfo;
      let businessInfo = opts.businessInfo;
      let channelInfo = opts.channelInfo;
      let serverTriggered = opts.serverTriggered;

      if(serverTriggered) {
        if(status == constants.channelStatus.OPEN) {
          message = "The chat was auto-opened";
        } else if(status == constants.channelStatus.CLOSED) {
          message = "The chat was auto-closed";
        }
      } else if(status == constants.channelStatus.OPEN) {
        message = "The chat was re-opened by " + userInfo.full_name + "";
      } else if(status == constants.channelStatus.CLOSED) {
        message = "The chat was closed by " + userInfo.full_name + "";
      }


      let updatePayload = {
        update_fields : { status : status, lm_updated_at : new Date() },
        where_clause  : {
          channel_id : channelInfo.channel_id
        }
      };
      yield channelService.update(logHandler, updatePayload);


      let params = {};
      params.business_id  = businessInfo.business_id;
      params.user_id      = userInfo.user_id;  // (serverTriggered) ? 0 :
      params.channel_id   = channelInfo.channel_id;
      params.channel_name = channelInfo.channel_name;
      params.data         = { message : message };
      params.label_id     = channelInfo.label_id;
      params.user_type    = userInfo.user_type;
      params.user_name    = userInfo.user_name;
      params.message_type = constants.messageType.NOTE;
      yield Promise.promisify(dbquery.insertUsersConversation).call(null, logHandler, params);



      // prepare cc pushes notifying chat status
      let messageToSend = notificationBuilder.getObject(notificationBuilder.notificationType.MARK_CONVERSATION);
      messageToSend.message      = message;
      messageToSend.channel_id   = channelInfo.channel_id;
      messageToSend.status       = status;
      let ccPush = {
        messageAt : '/' + businessInfo.app_secret_key + '/' + constants.ccPushEvents.MARK_CONVERSATION,
        message   : messageToSend
      };
      notifierService.sendControlChannelEvent(ccPush);


      return {};
    })().then(
      (data) => {
        resolve(data);
      },
      (error) => {
        reject(error);
      }
    );
  });
}

function checkChatIsCreatedByAgent(logHandler, channelId, userId) {
  return new Promise((resolve, reject) => {
    let query = `SELECT
                      user_id
                  FROM
                      users_conversation
                  WHERE
                      channel_id = ? AND user_id = ?
                 `;
    let queryObj = {
      query : query,
      args  : [channelId, userId],
      event : "checkChatIsCreatedByAgent"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

// join with users except current
function getUnreadCountForCustomer(logHandler, channel_ids, user_id) {
  return new Promise((resolve, reject) => {
    let userVisibleMessageTypes = constants.userReadUnreadMessageTypes.join(", ");
    let query = `SELECT 
                      ch.channel_id, COUNT(*) AS unread_count
                  FROM
                       channel_history ch
                          LEFT JOIN 
                       users_conversation uc ON ch.channel_id = uc.channel_id 
                  WHERE
                      ch.channel_id IN (?) AND ch.user_id = ? AND uc.id > ch.last_read_message_id AND uc.message_type in (${userVisibleMessageTypes})
                  GROUP BY ch.channel_id`;
    let queryObj = {
      query : query,
      args  : [channel_ids, user_id],
      event : "getUnreadCountForCustomer"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      let channelToUnreadCount = {};
      for (let i = 0; i < result.length; i++) {
        channelToUnreadCount[result[i].channel_id] = result[i].unread_count;
      }
      // logger.info(logHandler, { getUnreadCountForCustomer : channelToUnreadCount });
      resolve(channelToUnreadCount);
    }, (error) => {
      logger.error(logHandler, "error in getUnreadCountForCustomer", error);
      reject(error);
    });
  });
}

function getUnreadCountForAgent(logHandler, channel_ids, user_id) {
  return new Promise((resolve, reject) => {
    if(!channel_ids.length) {
      return resolve({});
    }
    let userVisibleMessageTypes = constants.agentReadUnreadMessageTypes.join(", ");
    let query = `SELECT 
                      ch.channel_id, COUNT(*) AS unread_count
                  FROM
                       channel_history ch
                          LEFT JOIN 
                       users_conversation uc ON ch.channel_id = uc.channel_id 
                  WHERE
                      ch.channel_id IN (?) AND ch.user_id = ? AND uc.id > ch.last_read_message_id AND uc.message_type in (${userVisibleMessageTypes})
                  GROUP BY ch.channel_id`;
    let queryObj = {
      query : query,
      args  : [channel_ids, user_id],
      event : "getUnreadCountForAgent"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      let channelToUnreadCount = {};
      for (let i = 0; i < result.length; i++) {
        channelToUnreadCount[result[i].channel_id] = result[i].unread_count;
      }
      // logger.info(logHandler, { getUnreadCountForAgent : channelToUnreadCount });
      resolve(channelToUnreadCount);
    }, (error) => {
      logger.error(logHandler, "error in getUnreadCountForAgent", error);
      reject(error);
    });
  });
}


function getReadLastReadMessageByOtherUser(logHandler, channel_id, user_id) {
  return new Promise((resolve, reject) => {
    let query = `SELECT
                      last_read_message_id
                  FROM channel_history
                  WHERE
                      channel_id = ? AND user_id != ?
                  ORDER BY
                      last_read_message_id
                  DESC
                  LIMIT 1
                `;
    let queryObj = {
      query : query,
      args  : [channel_id, user_id],
      event : "getReadLastReadMessageByOtherUser"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      if(!result.length) {
        resolve({ last_read_message_id : 0 });
      }
      resolve(result[0]);
    }, (error) => {
      logger.error(logHandler, "error in getReadLastReadMessageByOtherUser", error);
      reject(error);
    });
  });
}


function getReadLastReadMessagesByOtherUser(logHandler, channel_ids, user_id) {
  return new Promise((resolve, reject) => {
    if(!channel_ids.length) {
      return {};
    }
    let query = `SELECT
                      channel_id, last_read_message_id
                  FROM channel_history
                  WHERE
                      channel_id in (?) AND user_id != ?
                  GROUP BY 
                    channel_id
                  ORDER BY
                      last_read_message_id
                  DESC
                `;
    let queryObj = {
      query : query,
      args  : [channel_ids, user_id],
      event : "getReadLastReadMessagesByOtherUser"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      let channelToStatus = {};
      for (let channel_id of channel_ids) {
        channelToStatus[channel_id] = { channel_id : channel_id, last_read_message_id : 0 };
      }
      for (let i = 0; i < result.length; i++) {
        channelToStatus[result[i].channel_id] = result[i];
      }
      // logger.info(logHandler,{getReadLastReadMessagesByOtherUser : channelToStatus});
      resolve(channelToStatus);
    }, (error) => {
      logger.error(logHandler, "error in getReadLastReadMessagesByOtherUser", error);
      reject(error);
    });
  });
}

function getReadUnreadOfUserMessages(logHandler, message_ids) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      return {};
    })().then(
      (data) => {
        logger.info(logHandler, "getReadUnreadOfUserMessages complete");
        resolve(data);
      },
      (error) => {
        logger.error(logHandler, "Error in getReadUnreadOfUserMessages ", error);
        reject(error);
      }
    );
  });
}

function getChannelsTotalMessageCount(logHandler, channelIds) {
  return new Promise((resolve, reject) => {
    let query = ` SELECT
                      channel_id,
                      COUNT(*) AS total_messages
                  FROM
                      users_conversation
                  WHERE
                      channel_id IN(?) AND user_type = 1
                  GROUP BY
                      channel_id`;
    let queryObj = {
      query : query,
      args  : [channelIds],
      event : "getChannelsTotalMessageCount"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      let channelMessageCount = {};
      for (let i = 0; i < result.length; i++) {
        channelMessageCount[result[i].channel_id] = result[i].total_messages;
      }
      resolve(channelMessageCount);
    }, (error) => {
      reject(error);
    });
  });
}

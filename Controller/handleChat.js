

const request                       = require('request');
const _                             = require('underscore');
const faye                          = require('faye');
const Promise                       = require('bluebird');
const pushNotification              = require('../Controller/pushNotification');
const logger                        = require('../Routes/logging');
const utils                         = require('../Controller/utils');
const dbquery                       = require('../DAOManager/query');
const dbHandler                     = require('../database').dbHandler;
const notificationBuilder           = require('../Builder/notification');
const pushNotificationBuilder       = require('../Builder/pushNotification');
const constants                     = require('../Utils/constants');
const notifierService               = require('../services/notifier');
const userService                   = require('../services/user');
const channelService                = require('../services/channel');
const conversationService           = require('../services/conversation');
const agentService                  = require('../services/agent');
const businessService               = require('../services/business');
const utilityService                = require('../services/utility');
const tagService                    = require('../services/tags');
const pushLogsService               = require('../services/pushLogs');
const Encoder                       = require('node-html-encoder').Encoder;

// entity type encoder
const encoder = new Encoder('entity');

exports.handleChat                  = handleChat;
exports.handleChatAgentFirstMessage = handleChatAgentFirstMessage;


/** @namespace Promise.promisify */

function handleChat(userInfo, channelInfo, businessInfo, messageInfo, labelInfo) { // WARNING use fixed schemas
  const logHandler = {
    apiModule  : "chathandler",
    apiHandler : "handleChat"
  };

  Promise.coroutine(function* () {
    let smartAutoAssignDone = false;
    yield channelService.updateLastActivityAtChannel(logHandler, { channel_id : channelInfo.channel_id, user_id : userInfo.user_id });
    let activeAgents = yield agentService.getAllActiveAgents(logHandler, { business_id : businessInfo.business_id });
    let agentIdToAgentInfo = {};
    for (let agent of activeAgents) {
      agentIdToAgentInfo[agent.user_id] = agent;
    }

    // auto open channel
    try {
      if(channelInfo.status == constants.channelStatus.CLOSED && userInfo.user_type == constants.userType.CUSTOMER) {
        logger.info(logHandler, "Auto opening channel");

        // update assigned agent and open channel
        let updateFields = { agent_id : 0, status : constants.channelStatus.OPEN };
        let updatePayload = {
          update_fields : updateFields,
          where_clause  : {
            channel_id : channelInfo.channel_id
          }
        };
        yield channelService.update(logHandler, updatePayload);

        // get the latest channel Info
        let updatedChannelInfo = yield channelService.getInfo(logHandler, channelInfo);
        channelInfo = updatedChannelInfo[0];

        // update user to channel
        yield channelService.disableUsersOnChannelExceptUser(logHandler, {
          channel_id : channelInfo.channel_id,
          user_id    : userInfo.user_id
        });


        // insert note
        let message = "The chat was re-opened by  " + userInfo.full_name;
        let opts = {};
        opts.business_id = businessInfo.business_id;
        opts.user_id = userInfo.user_id;
        opts.channel_id = channelInfo.channel_id;
        opts.channel_name = channelInfo.channel_name;
        opts.full_name = userInfo.full_name;
        opts.data = { message : message };
        opts.user_type = constants.userType.CUSTOMER;
        opts.label_id = channelInfo.label_id;
        opts.message_type = constants.messageType.NOTE;
        yield Promise.promisify(dbquery.insertUsersConversation).call(null, logHandler, opts);
        let result = yield smartAutoAssign(logHandler, businessInfo, channelInfo, messageInfo, activeAgents, userInfo.user_id);
        if(result.assigned) {
          smartAutoAssignDone = true;
          logger.info(logHandler, "Smart auto assigned after reopened");
        }
      }
    } catch (error) {
      logger.error(logHandler, "Error in [auto open channel]", error);
      throw error;
    }

    if(channelInfo.agent_id === null && userInfo.user_type == constants.userType.CUSTOMER && channelInfo.chat_type == constants.chatType.DEFAULT) {
      logger.info(logHandler, { channelInfochatType : channelInfo.chat_type });
      logger.info(logHandler, "Smart Auto assigning channel");
      let result = yield smartAutoAssign(logHandler, businessInfo, channelInfo, messageInfo, activeAgents, userInfo.user_id);
      if(result.assigned) {
        smartAutoAssignDone = true;
        logger.info(logHandler, "Smart auto assigned");
      }
    }

    // auto assign channel
    try {
      if(messageInfo.message_type != constants.messageType.PRIVATE_MESSAGE && userInfo.user_type == constants.userType.AGENT && !channelInfo.agent_id) {
        logger.info(logHandler, "Auto assigning channel");

        // update assigned agent
        let agent_id = userInfo.user_id;
        yield channelService.assignAgent(logHandler, { user_id : userInfo.user_id, channel_id : channelInfo.channel_id });


        // "UPDATE user_to_channel SET `status` = 0 W`RE `user_id` != ? AND `user_id` NOT IN (SELECT `user_id` FROM `users` WHERE `user_type` = 1) AND `channel_id` = ?";

        // insert note
        let message = userInfo.full_name + " was auto assigned";
        let opts = {};
        opts.business_id = businessInfo.business_id;
        opts.user_id = userInfo.user_id;
        opts.channel_id = channelInfo.channel_id;
        opts.channel_name = channelInfo.channel_name;
        opts.full_name = userInfo.full_name;
        opts.data = { message : message };
        opts.user_type = userInfo.user_type;
        opts.label_id = channelInfo.label_id;
        opts.message_type = constants.messageType.NOTE;
        opts.tags = [];
        yield Promise.promisify(dbquery.insertUsersConversation).call(null, logHandler, opts);

        let tags = yield tagService.getChannelAssociatedTags(logHandler, opts.channel_id);
        if(!_.isEmpty(tags)) {
          _.each(tags, (tagDetails) => {
            opts.tags.push(tagDetails.tag_id);
          });
        }

        // update message history
        let historyPayload = {
          user_id       : userInfo.user_id,
          business_id   : businessInfo.business_id,
          channel_id    : channelInfo.channel_id,
          mark_all_read : true
        };
        yield  conversationService.syncMessageHistory(logHandler, historyPayload);
        // get owner and agent of channel
        let ownerAndAgent = yield channelService.getOwnerAndAgentOfChannel(logHandler, { channel_id : channelInfo.channel_id });

        // prepare cc pushes notifying agent got assigned
        let controlChannelPushes = [];
        let currentTime = utils.getCurrentTime();
        for (let user of activeAgents) {
          let messageToSend = notificationBuilder.getObject(notificationBuilder.notificationType.ASSIGNMENT);
          messageToSend.user_id = channelInfo.owner_id;
          messageToSend.channel_id = channelInfo.channel_id;
          messageToSend.bot_channel_name = channelInfo.label; // not needed
          messageToSend.message = messageInfo.message;
          messageToSend.agent_id = agent_id;
          messageToSend.assigned_to = agent_id;
          messageToSend.label = channelInfo.custom_label || ownerAndAgent.owner_name || userInfo.full_name || "Agent";
          messageToSend.assigned_by = agent_id;
          messageToSend.assigned_to_name = userInfo.full_name;
          messageToSend.assigned_by_name = userInfo.full_name;
          messageToSend.date_time = currentTime;
          messageToSend.chat_status = channelInfo.status;
          messageToSend.status = channelInfo.status;
          messageToSend.attributes.label    = opts.tags;
          messageToSend.attributes.channel  = (opts.label_id == -1) ? [] : [opts.label_id];

          if(user.user_id == agent_id) {
            messageToSend.attributes.type = [constants.conversationType.MY_CHAT];
          } else {
            messageToSend.attributes.type = [];
          }

          let messageTo = user.user_id;
          let messageAt = '/' + utils.getSHAOfObject(user.user_id);
          controlChannelPushes.push({
            messageTo : messageTo,
            messageAt : messageAt,
            message   : messageToSend
          });
        }
        // send pushes
        notifierService.sendControlChannelPushes({ ccPushList : controlChannelPushes });
      }
    } catch (error) {
      logger.error(logHandler, "Error in [auto assign channel] ", error);
      throw error;
    }



    // controlChannel
    try {
      if(messageInfo.message_type != constants.messageType.PRIVATE_MESSAGE
          && smartAutoAssignDone === false) {
        logger.trace(logHandler, "Control Channel");

        let message = messageInfo.message;
        let tagged_users = messageInfo.tagged_users;
        logger.info(logHandler, { TAGGED_USERS : tagged_users });
        let ownerAndAgent = yield channelService.getOwnerAndAgentOfChannel(logHandler, { channel_id : channelInfo.channel_id });

        let options = {};
        options.userInfo               = utils.cloneObject(userInfo);
        options.user_id                = userInfo.user_id;
        options.send_by                = userInfo.user_id;
        options.last_sent_by_user_type = userInfo.user_type;
        options.channel_id             = channelInfo.channel_id;
        options.message                = !utils.isEmptyString(message) ? message : utils.getDefaultMessage(logHandler, messageInfo.message_type, { agent_name : ownerAndAgent.agent_name });
        options.muid                   = messageInfo.muid;
        options.message_type           = messageInfo.message_type;
        options.full_name              = userInfo.full_name;
        options.business_id            = businessInfo.business_id;
        options.bot_channel_name       = channelInfo.label;
        options.chat_type              = channelInfo.chat_type;
        options.channel_status         = channelInfo.status;
        options.message_type           = messageInfo.message_type;
        options.message_id             = messageInfo.message_id;
        options.channel_image          = channelInfo.channel_image || "";
        options.email                  = userInfo.email || "";
        options.typeList         = [];
        if(!channelInfo.agent_id) {
          options.typeList.push(constants.conversationType.UNASSIGNED);
        } else {
          options.typeList.push(constants.conversationType.MY_CHAT);
        }

        if(!_.isEmpty(messageInfo.tagged_users)) {
          options.typeList.push(constants.conversationType.TAGGED);
        }

        // get owner and agent of channel
        options.user_id = ownerAndAgent.owner_id;
        options.agent_id = ownerAndAgent.agent_id;
        options.agent_image = ownerAndAgent.agent_image;
        options.agent_name = ownerAndAgent.agent_name;
        options.label = channelInfo.label || channelInfo.custom_label || ownerAndAgent.owner_name;
        options.tags = [];

        let tags = yield tagService.getChannelAssociatedTags(logHandler, channelInfo.channel_id);
        if(!_.isEmpty(tags)) {
          _.each(tags, (tagDetails) => {
            options.tags.push(tagDetails.tag_id);
          });
        }

        // cc pushes  :  if no agent is assigned get all agents or if chat_type is not of peer to peer
        if(!ownerAndAgent.agent_id && options.chat_type == constants.chatType.DEFAULT) {
          options.userCCPushList = Array.from(activeAgents);
        } else {
          options.userCCPushList = yield Promise.promisify(getUsersParticipatedInChannel).call(null, logHandler, options);
        }

        // notifications  : send pushes to users, remove self pushes
        options.userIds = [];
        let pushList = Array.from(options.userCCPushList);
        let skipUsers = [];
        for (let user of pushList) {
          if(user.user_id != userInfo.user_id && user.notification != constants.pushNotification.MUTED) {
            options.userIds.push(user.user_id);
            if(channelInfo.chat_type == constants.chatType.O20_CHAT) {
              options.label = userInfo.full_name;
              options.channel_image = userInfo.user_image || '';
            }
          } else {
            skipUsers.push(user.user_id);
          }
        }
        skipUsers.sort();
        logger.info(logHandler, { SKIPPING_PUSH : skipUsers });

        yield Promise.promisify(controlChannelPushes).call(null, logHandler, options);

        let pushLogData = {
          message_id : messageInfo.message_id,
          channel_id : channelInfo.channel_id
        };
        yield pushLogsService.insertLog(logHandler, pushLogData);

        // send tagged users push for OC
        try {
          if(userInfo.user_type == constants.userType.CUSTOMER && messageInfo.tagged_users) {
            let tagged_users = utils.isString(messageInfo.tagged_users) ? utils.jsonParse(messageInfo.tagged_users) : messageInfo.tagged_users;
            tagged_users = Array.from(new Set(tagged_users));
            if(!_.isEmpty(tagged_users)) {
              logger.info(logHandler, "tagged users in office chat", tagged_users);
              let tagged_options = utils.cloneObject(options);

              // filtering out tagged Ids
              let taggedUserIds = options.userIds.filter(el => tagged_users.indexOf(el) >= 0);
              options.userIds = options.userIds.filter(el => tagged_users.indexOf(el) < 0);
              if(taggedUserIds.length) {
                tagged_options.userPushList = yield userService.getUsersDeviceDetails(logHandler, { userIds : taggedUserIds });
                tagged_options.tagged_users = tagged_users;
                tagged_options.tagged_chat  = true;
                tagged_options.new_message  = ownerAndAgent.agent_id ? 0 : 1;
                tagged_options.label_id     = channelInfo.label_id;
                tagged_options.title        = yield getChatTitle(logHandler, userInfo, channelInfo, businessInfo);
                tagged_options.userPushList = preparePushNotificationList(tagged_options);

                yield Promise.promisify(pushNotifications).call(null, logHandler, tagged_options);
              }
            }
          }
        } catch (error) {
          logger.error(logHandler, "Error in [send tagged pushed in OC]", error);
          logger.logError(logHandler, "Error in [send tagged pushed in OC]", error);
        }



        if(!_.isEmpty(options.userIds)) {
          // options.userPushList = yield userService.getUsersWithIds(logHandler, options);
          options.userPushList = yield userService.getUsersDeviceDetails(logHandler, options);
          options.new_message = ownerAndAgent.agent_id ? 0 : 1;
          options.label_id = channelInfo.label_id;
          options.title = yield getChatTitle(logHandler, userInfo, channelInfo, businessInfo);
          options.userPushList = preparePushNotificationList(options);
          yield Promise.promisify(pushNotifications).call(null, logHandler, options);
        } else {
          logger.error(logHandler, "No valid users found to send push notification");
        }
      }
    } catch (error) {
      logger.error(logHandler, "Error in [controlChannel] ", error);
    }


    // messageHistory for other users
    /*
    try {
      logger.trace(logHandler, "Message History");
      let opts                = {};
      opts.business_id        = businessInfo.business_id;
      opts.message_id         = messageInfo.message_id;
      opts.channel_id         = channelInfo.channel_id;
      opts.user_id            = userInfo.user_id;
      opts.channelUsersInfo = yield channelService.getUsersFromUserToChannelExceptUserId(logHandler, opts);
      if(opts.channelUsersInfo.length) {
        yield conversationService.insertMessageHistory(logHandler, opts);
      }
    } catch (error) {
      logger.error(logHandler, "Error in [messageHistory]", error);
    }
    */


    // saveTaggedUsers
    try {
      messageInfo.tagged_users = utils.isString(messageInfo.tagged_users) ? utils.jsonParse(messageInfo.tagged_users) : messageInfo.tagged_users;
      if(!_.isEmpty(messageInfo.tagged_users) && userInfo.user_type == constants.userType.AGENT) {
        logger.info(logHandler, "Save Tagged Users");

        // adding tagged users to ccPushList tagged_users
        let messageDetails = utils.cloneObject(messageInfo);
        messageDetails.tagger_id = userInfo.user_id;

        // filter out himself and already tagged users
        let tagged_users = new Set(messageDetails.tagged_users);
        tagged_users.delete(messageDetails.user_id);
        tagged_users = Array.from(tagged_users);


        // insert note
        let agentNames = [];
        logger.error(logHandler, "tagged_users: ", tagged_users);
        let filtered_agents = [];
        for (let agent of tagged_users) {
          if(agent && agentIdToAgentInfo[agent]) {
            filtered_agents.push(agent);
            if(agentIdToAgentInfo[agent].full_name) { agentNames.push(agentIdToAgentInfo[agent].full_name); }
          }
        }

        if(!_.isEmpty(filtered_agents)) {
          let message = userInfo.full_name + " tagged " + agentNames.join(', ');
          let opts = {};
          opts.business_id = businessInfo.business_id;
          opts.user_id = userInfo.user_id;
          opts.channel_id = channelInfo.channel_id;
          opts.channel_name = channelInfo.channel_name;
          opts.full_name = userInfo.full_name;
          opts.data = { message : message };
          opts.user_type = constants.userType.AGENT;
          opts.label_id = channelInfo.label_id;
          opts.message_type = constants.messageType.NOTE;
          yield Promise.promisify(dbquery.insertUsersConversation).call(null, logHandler, opts);


          let alreadyTaggedUsers = yield userService.getAlreadyTaggedUsers(logHandler, channelInfo.channel_id, messageDetails.tagger_id, filtered_agents);
          filtered_agents = filtered_agents.filter(el => alreadyTaggedUsers.indexOf(el) < 0);

          if(!_.isEmpty(filtered_agents)) {
            yield userService.insertTaggedUsers(logHandler, channelInfo.channel_id, messageDetails.tagger_id, filtered_agents);
          }
        }
      }
    } catch (error) {
      logger.error(logHandler, "Error in [saveTaggedUsers]", error);
    }


    // send message on webhook
    try {
      if(userInfo.user_type == constants.userType.AGENT && channelInfo.source == constants.sourceEnum[constants.source.INTEGRATION]) {
        logger.info(logHandler, "Message On Webhook");
        let options = {
          url    : config.get('integrationUrl') + constants.API_END_POINT.MESSAGE_WEB_HOOK,
          method : 'POST',
          json   : {
            component_key : constants.FUGU_COMPONENT_KEY,
            channel_id    : channelInfo.channel_id,
            data          : { message : messageInfo.message },
            sender_name   : userInfo.full_name,
            business_name : businessInfo.business_name
          }
        };
        utilityService.sendHttpRequest(logHandler, options);
      }
    } catch (error) {
      logger.error(logHandler, "Error in [send message on webhook]", error);
    }




    return "success";
  })().then(
    (data) => {
      logger.trace(logHandler, { RESPONSE : data });
    },
    (error) => {
      logger.logError(logHandler, "Error in Chat Handler", error);
      logger.error(logHandler, error);
    }
  );
}



function getUsersParticipatedInChannel(logHandler, opts, cb) {
  let sql = `SELECT user_id, notification
             FROM user_to_channel   
             WHERE channel_id = ? AND status != 0`;
  dbHandler.query(logHandler, "getUsersParticipatedInChannel", sql, [opts.channel_id, opts.channel_id], (err, response) => {
    if(err) {
      return cb(err);
    }
    logger.trace(logHandler, "Everything was fine in fetching the channel data", response);
    cb(null, response);
  });
}


function controlChannelPushes(logHandler, opts, cb) {
  let controlChannelPushes = [];
  let ccPushListUsers = [];

  // prepare messages
  let currentTime = utils.getCurrentTime();
  for (let user of opts.userCCPushList) {
    let messageToSend                    = notificationBuilder.getObject(notificationBuilder.notificationType.MESSAGE);
    messageToSend.channel_id             = opts.channel_id;
    messageToSend.message                = opts.message;
    messageToSend.full_name              = opts.full_name;
    messageToSend.user_id                = opts.user_id;
    messageToSend.user_type              = opts.user_type;
    messageToSend.agent_id               = opts.agent_id;
    messageToSend.agent_name             = opts.agent_name;
    messageToSend.last_sent_by_id        = opts.send_by;
    messageToSend.last_sent_by_full_name = opts.full_name;
    messageToSend.last_sent_by_user_type = opts.last_sent_by_user_type;
    messageToSend.label                  = opts.label || opts.agent_name || constants.anonymousUserName;
    messageToSend.chat_status            = opts.channel_status;
    messageToSend.bot_channel_name       = opts.bot_channel_name || "";
    messageToSend.date_time              = currentTime;
    messageToSend.channel_image          = opts.channel_image;
    messageToSend.chat_type              = opts.chat_type;
    messageToSend.message_type           = opts.message_type;
    messageToSend.attributes.label       = opts.tags || [];
    messageToSend.attributes.channel     = [opts.channel_id];
    messageToSend.attributes.type        = opts.typeList;

    let messageTo = user.user_id;
    let messageAt = '/' + utils.getSHAOfObject(user.user_id);
    controlChannelPushes.push({
      messageTo : messageTo,
      messageAt : messageAt,
      message   : messageToSend
    });
    ccPushListUsers.push({
      user_id   : user.user_id,
      messageAt : messageAt
    });
  }

  // send pushes
  logger.trace(logHandler, "cc push list users ", ccPushListUsers);
  notifierService.sendControlChannelPushes({ ccPushList : controlChannelPushes }, cb);
}

function fetchBusinessPushTitle(logHandler, opts, cb) {
  let title = constants.pushNotification.DEFAULT_TITLE;
  // WARNING fetch business config from cache
  dbquery.getBusinessConfiguration(logHandler, opts, (err, res) => {
    if(err) {
      logger.error(logHandler, "Error while fetching push title", err);
    } else {
      let businessProperty = res;
      if(businessProperty.push_based_on_chat) {
        let data = utils.jsonParse(businessProperty.push_based_on_chat);
        title = data[opts.chat_type] || constants.pushNotification.DEFAULT_TITLE;
      }
    }
    cb(null, title);
  });
}

function getPushMessage(opts) {
  let message = opts.message;
  if(utils.isHtml(message)) {
    message = utils.HtmlReplacer(message);
  }
  if(opts.tagged_chat) {
    return encoder.htmlDecode(opts.full_name + " mentioned you: " + message);
  }
  if(opts.chat_type == constants.chatType.PRIVATE_GROUP || opts.chat_type == constants.chatType.PUBLIC_GROUP
    || opts.chat_type == constants.chatType.GENERAL_CHAT) {
    return encoder.htmlDecode(opts.full_name + ": " + message);
  }
  return encoder.htmlDecode(message);
}

function preparePushNotificationList(opts) {
  let users = Array.from(opts.userPushList);

  let currentTime = utils.getCurrentTime();
  for (let i = 0; i < users.length; i++) {
    let web_payload = pushNotificationBuilder.getObject(pushNotificationBuilder.notificationType.FIRE_BASE);
    web_payload.title = opts.title || "New Conversation";
    web_payload.body  = getPushMessage(opts);
    web_payload.channel_id = opts.channel_id;
    users[i].firebase_payload = web_payload;

    let payload = pushNotificationBuilder.getObject(pushNotificationBuilder.notificationType.MESSAGE);
    payload.push_message           = getPushMessage(opts);
    payload.message                = opts.message;
    payload.message_type           = opts.message_type;
    payload.muid                   = opts.muid;
    payload.title                  = opts.title;
    payload.chat_type              = opts.chat_type;
    payload.user_id                = opts.user_id;
    payload.channel_id             = opts.channel_id;
    payload.label                  = opts.label || opts.full_name || constants.anonymousUserName;
    payload.date_time              = currentTime;
    payload.label_id               = opts.label_id;
    payload.new_message            = opts.message;
    payload.last_sent_by_full_name = opts.full_name;
    payload.last_sent_by_id        = opts.send_by;
    payload.last_sent_by_user_type = opts.last_sent_by_user_type;
    payload.tagged_users           = opts.tagged_users;
    payload.email                  = opts.email;
    users[i].push_payload = payload;
  }
  return users;
}

function pushNotifications(logHandler, opts, cb) {
  let users = opts.userPushList;

  let validUserIds = [];
  let inValidUserIds = [];
  let pushNotificationList =  [];
  let webNotificationList = [];
  // TODO : refactor
  for (let i = 0; i < users.length; i++) {
    if(utils.isValidObject(users[i].device_type)
      && users[i].device_token
      && !(users[i].user_type == constants.userType.AGENT && users[i].online_status != constants.onlineStatus.AVAILABLE)
    ) {
      if(users[i].notification_level == constants.pushNotificationLevels.ALL_CHATS ||
        (users[i].notification_level == constants.pushNotificationLevels.DIRECT_MESSAGES && opts.chat_type == constants.chatType.O20_CHAT)) {
        let notificationObject          = pushNotificationBuilder.getObject(pushNotificationBuilder.notificationType.NOTIFICATION);
        notificationObject.business_id  = (users[i].user_type != constants.userType.AGENT) ? users[i].business_id : 0;
        notificationObject.push_to      = users[i].user_id;
        notificationObject.device_token = users[i].device_token;
        notificationObject.device_type  = users[i].device_type;
        notificationObject.app_type     = users[i].app_type;
        notificationObject.device_info  = {};
        notificationObject.payload      = users[i].push_payload;
        pushNotificationList.push(notificationObject);
        validUserIds.push(users[i].user_id);
      } else {
        // logger.info(logHandler, { SKIPPING_USER : users[i] });
        inValidUserIds.push(users[i].user_id);
      }
    } else {
      // logger.info(logHandler, { SKIPPING_USER : users[i] });
      inValidUserIds.push(users[i].user_id);
    }

    if(users[i].device_token && users[i].device_type == constants.deviceType.WEB) {
      let body = {};
      body.to = users[i].device_token;
      body.data = users[i].firebase_payload;
      webNotificationList.push(body);
    }
  }
  logger.trace(logHandler, "Skipping notification for users : ", inValidUserIds.length);
  logger.trace(logHandler, "Pushing notifications for users : ", validUserIds.length);
  logger.trace(logHandler, { WEB_NOTIFICATION_LENGTH : webNotificationList.length });

  // logging pushes
  let pushLog = {};
  inValidUserIds.sort();
  validUserIds.sort();
  pushLog.skipping = inValidUserIds;
  pushLog.sending  = validUserIds;
  logger.info(logHandler, { PUSH_LOG : pushLog });

  // send pushes
  // for (let pushObject of pushNotificationList) {
  //   pushNotification.sendNotification(logHandler, pushObject);
  // }
  let pushLogData = {
    message_id : opts.message_id,
    channel_id : opts.channel_id,
    setObject  : {
      skipped : ' | ' + inValidUserIds.toString()
    }
  };

  if(!_.isEmpty(pushNotificationList)) {
    pushNotification.sendBulkNotification(logHandler, pushNotificationList, pushLogData);
  }
  pushNotification.webNotification(logHandler, webNotificationList);

  pushLogsService.updateLog(logHandler, pushLogData).then((result) => {
  }).catch((error) => {
    logger.error(logHandler, { EVENT : "push log error", ERROR : error });
  });
  return cb();
}

function silentPushNotifications(logHandler, opts, cb) {
  let users = opts.userPushList;

  let validUserIds = [];
  let inValidUserIds = [];
  let pushNotificationList =  [];
  let webNotificationList = [];

  for (let i = 0; i < users.length; i++) {
    if(utils.isValidObject(users[i].device_type) && users[i].device_token &&
        !(users[i].user_type == constants.userType.AGENT && users[i].online_status != constants.onlineStatus.AVAILABLE)) {
      let notificationObject = pushNotificationBuilder.getObject(pushNotificationBuilder.notificationType.SILENT_NOTIFICATION);
      notificationObject.business_id  = (users[i].user_type != constants.userType.AGENT) ? users[i].business_id : 0;
      notificationObject.push_to      = users[i].user_id;
      notificationObject.device_token = users[i].device_token;
      notificationObject.device_type  = users[i].device_type;
      notificationObject.app_type     = users[i].app_type;
      notificationObject.device_info  = {};
      notificationObject.payload      = users[i].push_payload;
      pushNotificationList.push(notificationObject);

      validUserIds.push(users[i].user_id);
    } else {
      inValidUserIds.push(users[i].user_id);
    }
  }
  logger.trace(logHandler, "Skipping notification for users : ", validUserIds.length);
  logger.trace(logHandler, "Pushing notifications for users : ", inValidUserIds.length);
  logger.trace(logHandler, { WEB_NOTIFICATION_LENGTH : webNotificationList.length });

  // logging pushes
  let pushLog = {};
  inValidUserIds.sort();
  validUserIds.sort();
  pushLog.skipping = inValidUserIds;
  pushLog.sending  = validUserIds;
  logger.info(logHandler, { PUSH_LOG : pushLog });


  // send pushes
  for (let pushObject of pushNotificationList) {
    pushObject.payload.notification_type = pushNotificationBuilder.notificationType.SILENT_NOTIFICATION;
    pushNotification.sendNotification(logHandler, pushObject);
  }
  // pushNotification.webNotification(logHandler, webNotificationList);

  return cb();
}

function smartAutoAssign(logHandler, businessInfo, channelInfo, messageInfo, activeAgents, userId) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      // check whether smart auto assign is enabled or not
      let businessProperties = yield businessService.getConfiguration(logHandler, { business_id : businessInfo.business_id });
      if(utils.parseInteger(businessProperties['adroit_assign-auto_assign']) !== 1) {
        return { assigned : false };
      }

      let tagIds = [];


      // get agent whose tag matches which channel tags
      // most chat closed (most efficient) and least open chats (most free right now)
      let channelTags = yield tagService.getChannelAssociatedTags(logHandler, channelInfo.channel_id);
      for (let tag of channelTags) {
        tagIds.push(tag.tag_id);
      }

      let agents      = yield tagService.getAgentIdsFromTags(logHandler, { tagIds : tagIds });
      let agentIds    = [];
      for (let agent of agents) {
        agentIds.push(agent.user_id);
      }
      let agentData = yield agentService.getLeastLoadAgentsWithIds(logHandler, { business_id : businessInfo.business_id, agentIds : agentIds });
      if(!agentData.length) {
        agentData = yield agentService.getLeastLoadAgents(logHandler, { business_id : businessInfo.business_id });
      }

      if(!agentData.length) {
        return { assigned : false };
      }

      const userInfo = {
        user_id   : agentData[0].agent_id,
        full_name : agentData[0].full_name,
        user_type : agentData[0].user_type
      };

      let agent_id = agentData[0].agent_id;
      yield channelService.assignAgent(logHandler, { user_id : userInfo.user_id, channel_id : channelInfo.channel_id });



      // insert note
      let message = userInfo.full_name + " was auto assigned";
      let opts = {};
      opts.business_id = businessInfo.business_id;
      opts.user_id = userInfo.user_id;
      opts.channel_id = channelInfo.channel_id;
      opts.channel_name = channelInfo.channel_name;
      opts.full_name = userInfo.full_name;
      opts.data = { message : message };
      opts.user_type = userInfo.user_type;
      opts.label_id = channelInfo.label_id;
      opts.message_type = constants.messageType.NOTE;
      opts.tags = tagIds;
      yield Promise.promisify(dbquery.insertUsersConversation).call(null, logHandler, opts);


      // update message history
      let historyPayload = {
        user_id       : userInfo.user_id,
        business_id   : businessInfo.business_id,
        channel_id    : channelInfo.channel_id,
        mark_all_read : true
      };
      yield conversationService.syncMessageHistory(logHandler, historyPayload);
      let ownerAndAgent = yield channelService.getOwnerAndAgentOfChannel(logHandler, { channel_id : channelInfo.channel_id });




      // prepare cc pushes notifying agent got assigned
      let controlChannelPushes = [];
      let currentTime = utils.getCurrentTime();
      for (let user of activeAgents) {
        let messageToSend = notificationBuilder.getObject(notificationBuilder.notificationType.ASSIGNMENT);
        messageToSend.user_id = userId; // not needed
        messageToSend.channel_id = channelInfo.channel_id;
        messageToSend.bot_channel_name = channelInfo.label; // not needed
        messageToSend.message = messageInfo.message;
        messageToSend.agent_id = agent_id;
        messageToSend.assigned_to = agent_id;
        messageToSend.label = channelInfo.custom_label || ownerAndAgent.owner_name || userInfo.full_name || "Agent";
        messageToSend.assigned_by = agent_id;
        messageToSend.assigned_to_name = userInfo.full_name;
        messageToSend.assigned_by_name = userInfo.full_name;
        messageToSend.date_time = currentTime;
        messageToSend.chat_status = channelInfo.status;
        messageToSend.status = channelInfo.status;
        messageToSend.attributes.label    = opts.tags;
        messageToSend.attributes.channel  = (opts.label_id == -1) ? [] : [opts.label_id];
        if(user.user_id == agent_id) {
          messageToSend.attributes.type     = [constants.conversationType.MY_CHAT];
        } else {
          messageToSend.attributes.type     = [];
        }

        let messageTo = user.user_id;
        let messageAt = '/' + utils.getSHAOfObject(user.user_id);
        controlChannelPushes.push({
          messageTo : messageTo,
          messageAt : messageAt,
          message   : messageToSend
        });
      }
      // send pushes
      notifierService.sendControlChannelPushes({ ccPushList : controlChannelPushes });
      return { assigned : true };
    })().then(
      (data) => {
        logger.trace(logHandler, { RESPONSE : data });
        resolve(data);
      },
      (error) => {
        logger.logError(logHandler, "Error in Chat Handler", error);
        logger.error(logHandler, error);
        reject(error);
      }
    );
  });
}

function handleChatAgentFirstMessage(logHandler, userInfo, channelInfo, businessInfo, messageInfo) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      logger.trace(logHandler, userInfo, channelInfo, businessInfo, messageInfo);
      yield channelService.updateLastActivityAtChannel(logHandler, {
        channel_id : channelInfo.channel_id,
        user_id    : userInfo.user_id
      });

      if(messageInfo.message_type != constants.messageType.PRIVATE_MESSAGE) {
        logger.trace(logHandler, "Control Channel");
        let message = messageInfo.message;

        let options = {};
        options.userInfo = utils.cloneObject(userInfo);
        options.user_id = userInfo.user_id;
        options.send_by = userInfo.user_id;
        options.last_sent_by_user_type = userInfo.user_type;
        options.channel_id = channelInfo.channel_id;
        options.message = !utils.isEmptyString(message) ? message : 
          utils.getDefaultMessage(logHandler, messageInfo.message_type, { agent_name : userInfo.full_name });
        options.full_name = userInfo.full_name;
        options.business_id = businessInfo.business_id;
        options.bot_channel_name = channelInfo.label;
        options.chat_type = channelInfo.chat_type;
        options.channel_status = channelInfo.status;
        options.message_type = messageInfo.message_type;


        // get owner and agent of channel
        let ownerAndAgent = yield channelService.getOwnerAndAgentOfChannel(logHandler, { channel_id : channelInfo.channel_id });
        options.user_id = ownerAndAgent.owner_id;
        options.agent_id = ownerAndAgent.agent_id;
        options.agent_image = ownerAndAgent.agent_image;
        options.agent_name = ownerAndAgent.agent_name;
        options.label = channelInfo.custom_label || ownerAndAgent.owner_name || userInfo.full_name || "Agent";
        options.userCCPushList = yield Promise.promisify(getUsersParticipatedInChannel).call(null, logHandler, options);
        // yield Promise.promisify(controlChannelPushes).call(null, logHandler, options);

        // unread count entry in message history
        let payload = {
          user_id       : ownerAndAgent.owner_id, business_id   : channelInfo.business_id, channel_id    : channelInfo.channel_id, mark_all_read : false
        };
        conversationService.syncMessageHistory(logHandler, payload);
        // notifications  : send pushes to users, remove self pushes
        options.userIds = [];
        let pushList = Array.from(options.userCCPushList);
        for (let user of pushList) {
          if(user.user_id != userInfo.user_id) { options.userIds.push(user.user_id); }
        }
        if(!_.isEmpty(options.userIds)) {
          options.userPushList = yield userService.getUsersWithIds(logHandler, options);
          options.new_message = ownerAndAgent.agent_id ? 0 : 1;
          options.label_id = channelInfo.label_id;
          options.title = yield Promise.promisify(fetchBusinessPushTitle).call(null, logHandler, { business_id : businessInfo.business_id });
          options.userPushList = preparePushNotificationList(options);
          yield Promise.promisify(silentPushNotifications).call(null, logHandler, options);
        } else {
          logger.error(logHandler, "No valid users found to send push notification");
        }
      }
    })().then(
      (data) => {
        logger.trace(logHandler, { RESPONSE : data });
        resolve(data);
      },
      (error) => {
        logger.logError(logHandler, "Error in Chat Handler", error);
        logger.error(logHandler, error);
        reject(error);
      }
    );
  });
}

function getChatTitle(logHandler, userInfo, channelInfo, businessInfo) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      switch (channelInfo.chat_type) {
        case constants.chatType.P2P:
        case constants.chatType.O20_CHAT:
          return  userInfo.full_name;
        case constants.chatType.PRIVATE_GROUP:
        case constants.chatType.PUBLIC_GROUP:
        case constants.chatType.GENERAL_CHAT:
          return  channelInfo.custom_label || businessInfo.business_name;
        default:
          return yield Promise.promisify(fetchBusinessPushTitle).call(null, logHandler, { business_id : businessInfo.business_id });
      }
    })().then(
      (data) => { resolve(data); },
      (error) => { reject(error); }
    );
  });
}




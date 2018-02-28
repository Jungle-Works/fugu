/**
 * Created by ashishprasher on 31/08/17.
 */



const _                             = require('underscore');
const Promise                       = require('bluebird');
const config                        = require('config');
const utils                         = require('./utils');
const logger                        = require('../Routes/logging');
const chathandler                   = require('../Routes/chathandler');
const dbquery                       = require('../DAOManager/query');
const constants                     = require('../Utils/constants');
const notificationBuilder           = require('../Builder/notification');
const notifierService               = require('../services/notifier');
const UniversalFunc                 = require('../Utils/universalFunctions');
const RESP                          = require('../Config').responseMessages;
const userService                   = require('../services/user');
const channelService                = require('../services/channel');
const agentController               = require('../Controller/agentController');
const chatController                = require('../Controller/chatController');
const utilityService                = require('../services/utility');
const users                         = require('../services/user');


exports.sendMessage          = sendMessage;
exports.sendServerMessage    = sendServerMessage;
exports.handleMessage        = handleMessage;
exports.handlePush           = handlePush;
exports.sendMessageFromAgent = sendMessageFromAgent;
exports.handleMessage        = handleMessage;
exports.handlePush           = handlePush;
exports.sendMessageToFaye    = sendMessageToFaye;
exports.groupChatSearch      = groupChatSearch;
exports.createGroupChat      = createGroupChat;
exports.addChatMember        = addChatMember;
exports.removeChatMember     = removeChatMember;
exports.leaveChat            = leaveChat;
exports.getChatMembers       = getChatMembers;
exports.createO2OChat        = createO2OChat;
exports.getChatGroups        = getChatGroups;
exports.joinChat             = joinChat;

function getMessageObject() {
  return Object.freeze({
    attempts : undefined,
    message  : {
      channel  : undefined,
      clientId : undefined,
      data     : {
        date_time      : undefined,
        full_name      : undefined,
        index          : undefined,
        is_typing      : 0,
        message        : undefined,
        message_status : 0,
        message_type   : 1,
        user_id        : undefined,
        user_type      : undefined
      },
      id : undefined
    },
    options : {
      attempts : undefined,
      deadline : undefined,
      interval : undefined,
      timeout  : undefined
    }
  });
}

function handleMessage(logHandler, payload) {
  Promise.coroutine(function* () {
    logger.trace(logHandler, { SENDING_MESSAGE : payload });
    if(!payload.content) {
      throw new Error("Invalid message, no content found");
    }
    chathandler.handlePublish(payload.content);
  })().then((data) => {
    logger.info(logHandler, { SUCCESS : data });
  }, (error) => {
    logger.error(logHandler, { ERROR : error });
  });
}

function sendMessageToFaye(logHandler, payload) {
  Promise.coroutine(function* () {
    logger.trace(logHandler, { SENDING_MESSAGE : payload });
    if(!payload.content) {
      throw new Error("Invalid message, no content found");
    }
    chathandler.handlePublish(payload.content);
    let userData;
    if(payload.content && payload.content.data && payload.content.data.user_id) {
      userData = yield users.getUsersWithIds(logHandler, { userIds : [payload.content.data.user_id] });
    } else {
      throw new Error('no user found');
    }
    if(!userData.length) {
      throw new Error('no user found');
    }
    payload.content.data.full_name = userData[0].full_name || '';
    notifierService.sendMessageToFaye(logHandler, payload.content);
  })().then((data) => {
    logger.info(logHandler, { SUCCESS : data });
  }, (error) => {
    logger.error(logHandler, { ERROR : error });
  });
}


function handlePush(logHandler, payload) {
  Promise.coroutine(function* () {
    let pushObject = payload.pushObject;
    if(!pushObject) {
      throw new Error("Invalid push object");
    }

    if(pushObject.ccPushList) {
      notifierService.sendCCPushes(logHandler, pushObject);
    }
    if(pushObject.messageAt) {
      notifierService.sendCCEvent(logHandler, pushObject);
    }
  })().then((data) => {
    logger.trace(logHandler, { SUCCESS : data });
  }, (error) => {
    logger.error(logHandler, { ERROR : error });
  });
}

function sendMessage(logHandler, payload) {
  Promise.coroutine(function* () {
    // message is expected in data field
    let messageObject = getMessageObject().message;
    messageObject.channel         = "/" + payload.channel_id;
    let data = utils.cloneObject(messageObject.data);
    utils.addAllKeyValues(payload.data, data);
    messageObject.data            = data;
    messageObject.data.user_id    = payload.user_id;
    logger.trace(logHandler, { PREPARED_MESSAGE : messageObject });
    let opts = {};
    opts.clientId = messageObject.clientId;
    opts.channel  = messageObject.channel;
    opts.data     = messageObject.data;


    let options = {
      url    : config.get('fuguChatURL') + constants.API_END_POINT.HANDLE_MESSAGE,
      method : 'POST',
      json   : {
        content : opts
      }
    };
    utilityService.sendHttpRequest(logHandler, options);
  })().then((data) => {
    logger.info(logHandler, { SUCCESS : data });
  }, (error) => {
    logger.error(logHandler, { ERROR : error });
  });
}

function sendMessageFromAgent(logHandler, payload) {
  Promise.coroutine(function* () {
    // message is expected in data field
    let messageObject = getMessageObject().message;
    messageObject.channel         = "/" + payload.channel_id;
    let channelInfo = yield channelService.getInfo(logHandler, { channel_id : payload.channel_id });
    if(channelInfo[0].agent_id == '0' || !channelInfo[0].agent_id) {
      throw new Error("no assigned agent found");
    }
    let data = utils.cloneObject(messageObject.data);
    utils.addAllKeyValues(payload.data, data);
    messageObject.data            = data;
    messageObject.data.user_id    = channelInfo[0].agent_id;
    logger.trace(logHandler, { PREPARED_MESSAGE : messageObject });
    let opts = {};
    opts.clientId = messageObject.clientId;
    opts.channel  = messageObject.channel;
    opts.data     = messageObject.data;


    let options = {
      url    : config.get('fuguChatURL') + constants.API_END_POINT.HANDLE_MESSAGE_WITH_FAYE,
      method : 'POST',
      json   : {
        content : opts
      }
    };
    utilityService.sendHttpRequest(logHandler, options);
  })().then((data) => {
    logger.info(logHandler, { SUCCESS : data });
  }, (error) => {
    logger.error(logHandler, { ERROR : error });
  });
}

function sendServerMessage(logHandler, payload) {
  Promise.coroutine(function* () {
    let controlChannelPushes = [];
    let ccPushListUsers = [];

    let channelInfo = yield channelService.getInfo(logHandler, payload);
    if(_.isEmpty(channelInfo)) {
      throw new Error("invalid channel");
    }
    channelInfo = channelInfo[0];

    let opts             = {};
    opts.business_id    = payload.business_id;
    opts.user_id        = payload.user_id || 0;
    opts.channel_id     = payload.channel_id;
    opts.channel_name   = channelInfo.channel_name;
    opts.data           = payload.data;
    opts.label_id       = channelInfo.label_id;
    opts.agent_id       = channelInfo.agent_id;
    opts.message_type   = constants.messageType.MESSAGE;

    yield Promise.promisify(dbquery.insertUsersConversation).call(null, logHandler, opts);

    let channelUsers = yield channelService.getUsersWithDetailsFromUserToChannel(logHandler, payload);

    for (let i = 0; i < channelUsers.length; i++) {
      let messageToSend                    = notificationBuilder.getObject(notificationBuilder.notificationType.MESSAGE);
      messageToSend.channel_id             = opts.channel_id;
      messageToSend.message                = payload.data.message;
      messageToSend.full_name              = payload.businessInfo.business_name;
      messageToSend.user_id                = 0;
      messageToSend.user_type              = 0;
      messageToSend.agent_id               = opts.agent_id;
      messageToSend.agent_name             = opts.agent_name;
      messageToSend.last_sent_by_id        = 0;
      messageToSend.last_sent_by_full_name = "";
      messageToSend.last_sent_by_user_type = 0;
      messageToSend.label                  = opts.label || "anonymous";
      messageToSend.chat_status            = 0;
      messageToSend.bot_channel_name       = "";
      messageToSend.date_time              = utils.getCurrentTime();

      let messageTo = channelUsers[i].user_id;
      let messageAt = '/' + utils.getSHAOfObject(channelUsers[i].user_id);
      controlChannelPushes.push({
        messageTo : messageTo,
        messageAt : messageAt,
        message   : messageToSend
      });
      ccPushListUsers.push({
        user_id   : channelUsers[i].user_id,
        messageAt : messageAt
      });
    }
    // send pushes
    logger.trace(logHandler, "cc push list users, send messages from server ", ccPushListUsers);
    yield Promise.promisify(notifierService.sendControlChannelPushes).call(null, { ccPushList : controlChannelPushes });
  })().then((data) => {
    logger.info(logHandler, { SUCCESS : data });
  }, (error) => {
    logger.error(logHandler, { ERROR : error });
  });
}



function groupChatSearch(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let search_query = {
      business_id : payload.businessInfo.business_id,
      search_text : payload.search_text,
      user_id     : payload.user_id
    };

    // get users
    let users = yield userService.searchByName(logHandler, search_query);
    let userIds = [];
    _.each(users, (user) => {
      userIds.push(user.user_id);
    });


    // get channels
    let channelIdsSet = new Set();
    let channels = yield channelService.getUsersParticipatedChannels(logHandler, { userIds : userIds, user_id : payload.user_id });
    _.each(channels, (channel) => {
      channelIdsSet.add(channel.channel_id);
    });
    channels = yield channelService.groupSearchByName(logHandler, search_query);
    _.each(channels, (channel) => {
      channelIdsSet.add(channel.channel_id);
    });
    let channelIds = Array.from(channelIdsSet);
    let channelsWithInfo = yield channelService.getGroupChannelsWithMemberNames(
      logHandler,
      { business_id : payload.businessInfo.business_id, channel_ids : channelIds }
    );

    let openGroup = yield channelService.getOpenGroups(logHandler, { business_id : payload.businessInfo.business_id, search_query : payload.search_text, user_id : payload.user_id });
    return  {
      users       : users,
      channels    : channelsWithInfo,
      open_groups : openGroup
    };
  })().then((data) => {
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, { ERROR : error.message });
    UniversalFunc.sendError(error, res);
  });
}


function getChatGroups(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let business_id = payload.businessInfo.business_id;
    let userInfo = payload.userInfo;

    let joinedChannels = yield channelService.getUserJoinedGroups(logHandler, { user_id : userInfo.user_id, business_id : business_id });
    let openChannels = yield channelService.getOpenGroups(logHandler, { user_id : userInfo.user_id,  business_id : business_id });

    return  {
      joined_channels : joinedChannels,
      open_channels   : openChannels
    };
  })().then((data) => {
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, { ERROR : error.message });
    UniversalFunc.sendError(error, res);
  });
}


function createGroupChat(logHandler, payload, res) {
  payload.user_ids_to_add = utils.isString(payload.user_ids_to_add) ? utils.jsonParse(payload.user_ids_to_add) : payload.user_ids_to_add;
  Promise.coroutine(function* () {
    let businessInfo = payload.businessInfo;
    let userInfo     = payload.userInfo;

    let activeUsers = yield userService.getActiveUsersOfBusiness(
      logHandler,
      { business_id : businessInfo.business_id, userIds : payload.user_ids_to_add }
    );
    if(payload.user_ids_to_add.length != activeUsers.length) {
      throw new Error("Invalid data in user_ids_to_add");
    }

    activeUsers.push(userInfo);
    activeUsers = Array.from(new Set(activeUsers));
    // create channel and add users
    let params           = {};
    params.chat_type     = payload.chat_type || constants.chatType.PRIVATE_GROUP;
    params.channel_type  = constants.channelType.DEFAULT;
    params.business_id   = businessInfo.business_id;
    params.channel_name  = "user_" + userInfo.user_id + "_" + Math.round(parseFloat(Math.random() * 1000000)) + "";
    params.owner_id      = userInfo.user_id;
    params.custom_label  = payload.custom_label;
    params.channel_image = constants.groupChatImageURL;
    let response = yield Promise.promisify(dbquery.insertIntoChannels).call(null, logHandler, params);
    let channel_id = response.insertId;
    for (let i = 0; i < activeUsers.length; i++) {
      let updateObj        = {};
      updateObj.user_id    = activeUsers[i].user_id;
      updateObj.channel_id = channel_id;
      updateObj.status     = constants.userStatus.ENABLE;
      yield userService.insertOrUpdateUserToChannel(logHandler, updateObj);
    }

    // intro message
    if(payload.intro_message) {
      let opts = {};
      opts.business_id = businessInfo.business_id;
      opts.user_id = userInfo.user_id;
      opts.channel_id = channel_id;
      opts.full_name = userInfo.user_name;
      opts.data = { message : payload.intro_message };
      opts.user_type = userInfo.user_type;
      opts.label_id = -1;
      opts.message_type = 1;
      yield Promise.promisify(dbquery.insertUsersConversation).call(null, logHandler, opts);
    }
    // chatController.sendMessage(logHandler, localOpts);


    let channel = yield channelService.getInfo(logHandler, { channel_id : channel_id });
    channel = channel[0];
    return {
      channel_id    : channel.channel_id,
      label         : channel.custom_label,
      channel_image : channel.channel_image
    };
  })().then((data) => {
    UniversalFunc.sendSuccess(RESP.SUCCESS.ENTRY_ADDED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, { ERROR : error.message });
    UniversalFunc.sendError(error, res);
  });
}


function createO2OChat(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let businessInfo = payload.businessInfo;
    let userInfo     = payload.userInfo;
    let usersIds = [payload.user_id, payload.chat_with_user_id];

    let activeUsers = yield userService.getActiveUsersOfBusiness(logHandler, { business_id : businessInfo.business_id, userIds : usersIds });
    if(activeUsers.length != 2) {
      throw new Error("Invalid user ids ");
    }



    let existingChannel = yield channelService.getChannelsHavingUsers(logHandler, { chat_type : constants.chatType.O20_CHAT, userIds : usersIds });
    if(existingChannel.length > 0) {
      existingChannel = existingChannel[0];
      return {
        channel_id    : existingChannel.channel_id,
        label         : existingChannel.custom_label,
        channel_image : existingChannel.channel_image
      };
    }

    // create channel and add users
    let params           = {};
    params.chat_type     = constants.chatType.O20_CHAT;
    params.channel_type  = constants.channelType.DEFAULT;
    params.business_id   = businessInfo.business_id;
    params.channel_name  = "user_" + userInfo.user_id + "_" + Math.round(parseFloat(Math.random() * 1000000)) + "";
    params.owner_id      = userInfo.user_id;
    let response = yield Promise.promisify(dbquery.insertIntoChannels).call(null, logHandler, params);
    let channel_id = response.insertId;
    for (let i = 0; i < usersIds.length; i++) {
      let updateObj        = {};
      updateObj.user_id    = usersIds[i];
      updateObj.channel_id = channel_id;
      updateObj.status     = constants.userStatus.ENABLE;
      yield userService.insertOrUpdateUserToChannel(logHandler, updateObj);
    }


    let channel = yield channelService.getInfo(logHandler, { channel_id : channel_id });
    channel = channel[0];
    return {
      channel_id    : channel.channel_id,
      label         : channel.custom_label,
      channel_image : channel.channel_image
    };
  })().then((data) => {
    UniversalFunc.sendSuccess(RESP.SUCCESS.ENTRY_ADDED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, { ERROR : error.message });
    UniversalFunc.sendError(error, res);
  });
}

function getChatMembers(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let channelInfo  = payload.channelInfo;
    let allParticipants = yield channelService.getUserToChannelDetails(
      logHandler,
      { channel_id : channelInfo.channel_id, status : constants.userStatus.ENABLE }
    );
    let userIds = [];
    _.each(allParticipants, (user) => {
      userIds.push(user.user_id);
    });
    return yield userService.getUsersWithAppInfo(logHandler, { userIds : userIds });
  })().then((data) => {
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, { ERROR : error.message });
    UniversalFunc.sendError(error, res);
  });
}


function addChatMember(logHandler, payload, res) {
  payload.user_ids_to_add = utils.isString(payload.user_ids_to_add) ? utils.jsonParse(payload.user_ids_to_add) : payload.user_ids_to_add;
  Promise.coroutine(function* () {
    let businessInfo = payload.businessInfo;
    let channelInfo  = payload.channelInfo;
    let userInfo     = payload.userInfo;

    if(channelInfo.chat_type == constants.chatType.O20_CHAT) {
      throw new Error("Can't add member in one to one chat");
    }
    if(channelInfo.label_id > 0) {
      throw new Error("Can't add member in default channel");
    }
    let participationDetails = yield channelService.getUserToChannelDetails(
      logHandler,
      { user_id : userInfo.user_id, channel_id : channelInfo.channel_id, status : constants.userStatus.ENABLE }
    );
    if(!participationDetails.length) {
      throw new Error("Only group member can perform this action");
    }
    let activeUsers = yield userService.getActiveUsersOfBusiness(
      logHandler,
      { business_id : businessInfo.business_id, userIds : payload.user_ids_to_add }
    );
    if(payload.user_ids_to_add.length != activeUsers.length) {
      throw new Error("Invalid data in user_ids_to_add");
    }

    for (let i = 0; i < activeUsers.length; i++) {
      let updateObj        = {};
      updateObj.user_id    = activeUsers[i].user_id;
      updateObj.channel_id = channelInfo.channel_id;
      updateObj.status     = constants.userStatus.ENABLE;
      yield userService.insertOrUpdateUserToChannel(logHandler, updateObj);

      let message = userInfo.full_name + " added " + activeUsers[i].full_name + " to conversation";
      let params = {};
      params.business_id  = businessInfo.business_id;
      params.user_id      = userInfo.user_id;
      params.channel_id   = channelInfo.channel_id;
      params.channel_name = channelInfo.channel_name;
      params.data         = { message : message };
      params.label_id     = channelInfo.label_id;
      params.user_type    = userInfo.user_type;
      params.user_name    = userInfo.user_name;
      params.message_type = userInfo.user_type == constants.userType.CUSTOMER ? constants.messageType.PUBLIC_NOTE : constants.messageType.NOTE;
      yield Promise.promisify(dbquery.insertUsersConversation).call(null, logHandler, params);
    }

    return {};
  })().then((data) => {
    UniversalFunc.sendSuccess(RESP.SUCCESS.ENTRY_ADDED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, { ERROR : error.message });
    UniversalFunc.sendError(error, res);
  });
}


function removeChatMember(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let businessInfo = payload.businessInfo;
    let channelInfo  = payload.channelInfo;
    let userInfo     = payload.userInfo;

    if(channelInfo.chat_type == constants.chatType.O20_CHAT) {
      throw new Error("Can not remove from One to One chat!");
    }
    if(channelInfo.chat_type == constants.chatType.GENERAL_CHAT) {
      throw new Error("Can not remove from General chat!");
    }
    let participationDetails = yield channelService.getUserToChannelDetails(
      logHandler,
      { user_id : userInfo.user_id, channel_id : channelInfo.channel_id, status : constants.userStatus.ENABLE }
    );
    if(!participationDetails.length) {
      throw new Error("Only group member can perform this action");
    }

    let disableUser = yield userService.getUsersOfBusiness(
      logHandler,
      { business_id : businessInfo.business_id, userIds : [payload.user_id_to_remove] }
    );
    if(!disableUser.length) {
      throw new Error("Invalid data in user_id_to_remove");
    }
    disableUser = disableUser[0];



    let updateObj        = {};
    updateObj.user_id    = disableUser.user_id;
    updateObj.channel_id = channelInfo.channel_id;
    updateObj.status     = constants.userStatus.DISABLE;
    yield userService.insertOrUpdateUserToChannel(logHandler, updateObj);

    let message = userInfo.full_name + " removed " + disableUser.full_name + " from conversation";
    let params = {};
    params.business_id  = businessInfo.business_id;
    params.user_id      = userInfo.user_id;
    params.channel_id   = channelInfo.channel_id;
    params.channel_name = channelInfo.channel_name;
    params.data         = { message : message };
    params.label_id     = channelInfo.label_id;
    params.user_type    = userInfo.user_type;
    params.user_name    = userInfo.user_name;
    params.message_type = userInfo.user_type == constants.userType.CUSTOMER ? constants.messageType.PUBLIC_NOTE : constants.messageType.NOTE;
    yield Promise.promisify(dbquery.insertUsersConversation).call(null, logHandler, params);

    return {};
  })().then((data) => {
    UniversalFunc.sendSuccess(RESP.SUCCESS.ENTRY_EDIT_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, { ERROR : error.message });
    UniversalFunc.sendError(error, res);
  });
}


function joinChat(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let businessInfo = payload.businessInfo;
    let channelInfo  = payload.channelInfo;
    let userInfo     = payload.userInfo;

    if(channelInfo.chat_type != constants.chatType.PUBLIC_GROUP) {
      throw new Error("You can join only public group from outside !!");
    }

    let updateObj        = {};
    updateObj.user_id    = userInfo.user_id;
    updateObj.channel_id = channelInfo.channel_id;
    updateObj.status     = constants.userStatus.ENABLE;
    yield userService.insertOrUpdateUserToChannel(logHandler, updateObj);

    let message = userInfo.full_name + " joined  conversation";
    let params = {};
    params.business_id  = businessInfo.business_id;
    params.user_id      = userInfo.user_id;
    params.channel_id   = channelInfo.channel_id;
    params.channel_name = channelInfo.channel_name;
    params.data         = { message : message };
    params.label_id     = channelInfo.label_id;
    params.user_type    = userInfo.user_type;
    params.user_name    = userInfo.user_name;
    params.message_type = userInfo.user_type == constants.userType.CUSTOMER ? constants.messageType.PUBLIC_NOTE : constants.messageType.NOTE;
    yield Promise.promisify(dbquery.insertUsersConversation).call(null, logHandler, params);

    return {};
  })().then((data) => {
    UniversalFunc.sendSuccess(RESP.SUCCESS.ENTRY_ADDED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, { ERROR : error.message });
    UniversalFunc.sendError(error, res);
  });
}

function leaveChat(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let businessInfo = payload.businessInfo;
    let channelInfo  = payload.channelInfo;
    let userInfo     = payload.userInfo;

    if(channelInfo.chat_type == constants.chatType.O20_CHAT) {
      throw new Error("Can not leave One to One chat!");
    }
    if(channelInfo.chat_type == constants.chatType.GENERAL_CHAT) {
      throw new Error("Can not leave General chat!");
    }
    let participationDetails = yield channelService.getUserToChannelDetails(
      logHandler,
      { user_id : userInfo.user_id, channel_id : channelInfo.channel_id, status : constants.userStatus.ENABLE }
    );
    if(!participationDetails.length) {
      throw new Error("Only group member can perform this action");
    }

    let updateObj        = {};
    updateObj.user_id    = userInfo.user_id;
    updateObj.channel_id = channelInfo.channel_id;
    updateObj.status     = constants.userStatus.DISABLE;
    yield userService.insertOrUpdateUserToChannel(logHandler, updateObj);

    let message = userInfo.full_name + " left  conversation";
    let params = {};
    params.business_id  = businessInfo.business_id;
    params.user_id      = userInfo.user_id;
    params.channel_id   = channelInfo.channel_id;
    params.channel_name = channelInfo.channel_name;
    params.data         = { message : message };
    params.label_id     = channelInfo.label_id;
    params.user_type    = userInfo.user_type;
    params.user_name    = userInfo.user_name;
    params.message_type = userInfo.user_type == constants.userType.CUSTOMER ? constants.messageType.PUBLIC_NOTE : constants.messageType.NOTE;
    yield Promise.promisify(dbquery.insertUsersConversation).call(null, logHandler, params);

    return {};
  })().then((data) => {
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, { ERROR : error.message });
    UniversalFunc.sendError(error, res);
  });
}

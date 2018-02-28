/**
 * Created by ashishprasher on 31/08/17.
 */



const async                         = require('async');
const request                       = require('request');
const _                             = require('underscore');
const Promise                       = require('bluebird');
const config                        = require('config');
const dbHandler                     = require('../database').dbHandler;
const RESP                          = require('../Config').responseMessages;
const constants                     = require('../Utils/constants');
const utils                         = require('./utils');
const UniversalFunc                 = require('../Utils/universalFunctions');
const logger                        = require('../Routes/logging');
const dbquery                       = require('../DAOManager/query');
const conversationService           = require('../services/conversation');
const tagService                    = require('../services/tags');
const userService                   = require('../services/user');
const channelService                = require('../services/channel');
const businessService               = require('../services/business');
const agentController               = require('../Controller/agentController');
const chatController                = require('../Controller/chatController');
const utilityService                = require('../services/utility');

exports.createConversation             = createConversation;
exports.getConversations               = getConversations;
exports.getConversationsV1             = getConversationsV1;
exports.getMessages                    = getMessages;
exports.getByLabelId                   = getByLabelId;
exports.uploadFile                     = uploadFile;
exports.markConversation               = markConversation;
exports.markConversationV1             = markConversationV1;

function createConversation(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let user_id = payload.user_id,
      label_id = payload.label_id,
      other_user_id = payload.other_user_id || [], // old p2p
      chat_type = payload.chat_type || 0, // default chat type
      user_unique_key = payload.user_unique_key,
      other_user_unique_keys = payload.other_user_unique_key,
      transaction_id = (payload.transaction_id) ? payload.transaction_id.trim() : payload.transaction_id,
      bot_default_message = payload.bot_default_message,
      user_first_messages = payload.user_first_messages,
      custom_attributes = payload.custom_attributes,
      deprecated_p2p_chat = false;

    payload.business_id = payload.businessInfo.business_id;

    let channel_id,
      channel_name,
      custom_label;
    Promise.coroutine(function* () {
      // old p2p chat
      if(!_.isEmpty(other_user_id)) {
        deprecated_p2p_chat = true;
        chat_type = 1;
      }

      // check if label id is valid
      if(payload.label_id > 0) {
        let labelInfo = yield channelService.getInfo(logHandler, { channel_id : payload.label_id });
        if(_.isEmpty(labelInfo)) { throw new Error("label doesn't exist"); }
      }

      // create tag as app name
      let userWithAppInfo = yield userService.getUserWithAppInfo(logHandler, { business_id : payload.business_id, user_id : user_id, user_unique_key : user_unique_key });
      if(!_.isEmpty(userWithAppInfo) && !utils.isEmptyString(userWithAppInfo[0].app_name)) {
        if(!payload.tags) {
          payload.tags = [];
        }
        payload.tags.push(userWithAppInfo[0].app_name);
      }

      // customer merchant chat functionality
      if(user_id && transaction_id && chat_type == constants.chatType.DEFAULT) {
        transaction_id = transaction_id + '-' + user_id;
        let exisitingChannel = yield channelService.getChannelByTransactionId(logHandler, transaction_id, payload.businessInfo.business_id);
        if(!_.isEmpty(exisitingChannel)) {
          channel_id = exisitingChannel[0].channel_id;
          channel_name = exisitingChannel[0].channel_name;
          custom_label = exisitingChannel[0].custom_label;
        }
      }

      // check if chat exist already
      if(chat_type == constants.chatType.DEFAULT && label_id > 0) {
        let channelDetails = yield channelService.getChannelWithLabelAndOwner(logHandler, { user_id : user_id, label_id : label_id });
        if(channelDetails.length) {
          channel_id = channelDetails[0].channel_id;
          channel_name = channelDetails[0].channel_name;
          custom_label = channelDetails[0].custom_label;
        }
      }


      // normal chat not normal anymore
      if(chat_type == constants.chatType.O20_CHAT && other_user_unique_keys && other_user_unique_keys.length) {
        let existingUsers = yield userService.getUsersUsingUserUniqueKey(logHandler, other_user_unique_keys, payload.business_id);
        if(_.isEmpty(existingUsers)) {
          throw new Error("Invalid User Unique Key!");
        }
        for (let user of Array.from(existingUsers)) {
          other_user_id.push(user.user_id);
        }
      }


      // check if p2p chat
      if(chat_type == constants.chatType.P2P && !deprecated_p2p_chat) {
        if(!user_unique_key || _.isEmpty(other_user_unique_keys) || other_user_unique_keys.length != 1 || !transaction_id) {
          throw new Error("Invalid/missing parameters");
        }
        let existingUsers = yield userService.getUsersUsingUserUniqueKey(logHandler, [user_unique_key, other_user_unique_keys[0]], payload.business_id);
        if(existingUsers.length != 2) {
          throw new Error("Invalid user unique keys ");
        }

        let userIds = [];
        let uuqToUserDetails = {};
        for (let user of Array.from(existingUsers)) {
          userIds.push(user.user_id);
          uuqToUserDetails[user.user_unique_key] = user;
        }
        userIds.sort();
        transaction_id         = transaction_id + '-' + userIds[0] + '-' + userIds[1];

        let exisitingChannel = yield channelService.getChannelByTransactionId(logHandler, transaction_id, payload.business_id);
        if(!_.isEmpty(exisitingChannel)) {
          channel_id = exisitingChannel[0].channel_id;
          channel_name = exisitingChannel[0].channel_name;
          custom_label = exisitingChannel[0].custom_label;
        } else {
          user_id = uuqToUserDetails[user_unique_key].user_id;
          other_user_id = [uuqToUserDetails[other_user_unique_keys[0]].user_id];
          payload.agent_id = other_user_id;
        }
      }

      // check if chat is initiated by agent
      if(payload.initiator_agent_id) {
        let businessDetails = yield businessService.getConfiguration(logHandler, payload.businessInfo);
        if(businessDetails.enable_agent_customer_chat && !utils.jsonParse(businessDetails.enable_agent_customer_chat)) { throw new Error("Business has not activated this feature"); }
        other_user_id = [];
        other_user_id.push(payload.initiator_agent_id);
        payload.agent_id = other_user_id;
        payload.initiated_by_agent = constants.initiated_by_agent.YES;
      }

      // create channel and insert users
      if(!channel_id) {
        if(!user_id) {
          throw new Error("Invalid user id ");
        }
        channel_name = "user_" + user_id + "_" + Math.round(parseFloat(Math.random() * Math.random() * 1000000)) + "";
        let params = {};
        params.chat_type = chat_type;
        params.business_id = payload.business_id;
        params.channel_name = channel_name;
        params.channel_type = constants.channelType.DEFAULT;
        params.owner_id = user_id;
        params.transaction_id = transaction_id || null;
        params.agent_id = payload.agent_id ? payload.agent_id : null;
        params.source = constants.sourceEnum[payload.source] || constants.sourceEnum[constants.source.DEFAULT];
        params.source_type = payload.source_type || constants.source.DEFAULT;
        params.initiated_by_agent = payload.initiated_by_agent || constants.initiated_by_agent.NO;
        params.custom_attributes  = utils.objectStringify(custom_attributes) || null;

        let response = yield Promise.promisify(dbquery.insertIntoChannels).call(null, logHandler, params);
        channel_id = response.insertId;
        payload.channel_id = channel_id;
        params.channel_id = channel_id;

        let userIds = [user_id];
        if(!_.isEmpty(other_user_id)) {
          for (let i = 0; i < other_user_id.length; i++) {
            userIds.push(other_user_id[i]);
          }
        }
        yield userService.insertUserToChannel(logHandler, params, userIds);


        // get label info
        let channelAsLabel = yield channelService.getLabelById(logHandler, label_id);
        let labelInfo = !_.isEmpty(channelAsLabel) ? channelAsLabel[0] : undefined;


        // update fields of channel
        let update_fields = {};
        custom_label = payload.custom_label;
        update_fields.custom_label = payload.custom_label;
        update_fields.label = (labelInfo) ? labelInfo.label_name : "";
        if(label_id) { update_fields.label_id = label_id; }

        let updatePayload = {
          update_fields : update_fields,
          where_clause  : {
            channel_id : channel_id
          }
        };

        yield channelService.update(logHandler, updatePayload);



        // insert default message if label found
        if(labelInfo) {
          let opts = {};
          opts.business_id = payload.business_id;
          opts.user_id = 0;
          opts.channel_id = channel_id;
          opts.channel_name = channel_name;
          opts.full_name = payload.businessInfo.business_name;
          opts.data = { message : labelInfo.default_message };
          opts.user_type = 0;
          opts.label_id = label_id;
          opts.message_type = 1;

          yield Promise.promisify(dbquery.insertUsersConversation).call(null, logHandler, opts);
        }

        if(bot_default_message) {
          let opts = {};
          opts.business_id = payload.business_id;
          opts.user_id = 0;
          opts.channel_id = channel_id;
          opts.channel_name = channel_name;
          opts.full_name = payload.businessInfo.business_name;
          opts.data = { message : bot_default_message };
          opts.user_type = constants.userType.AGENT;
          opts.label_id = -1;
          opts.message_type = 1;

          yield Promise.promisify(dbquery.insertUsersConversation).call(null, logHandler, opts);
        }

        if(user_first_messages) {
          let localOpts = { data : {} };
          localOpts.user_id = payload.userInfo.user_id;
          localOpts.channel_id = channel_id;
          for (let i = 0; i < user_first_messages.length; i++) {
            localOpts.data  = { message : user_first_messages[i] };
            chatController.sendMessage(logHandler, localOpts);
          }
        }


        // create tags if needed and assign tags to channel
        if(!_.isEmpty(payload.tags)) {
          let tagIds = [];
          for (let tag of payload.tags) {
            tag = tag.trim();
          }
          payload.tags        = Array.from(new Set(payload.tags));
          let existingTags    = yield tagService.getTagsByName(logHandler, payload);
          let existingTagsSet = new Set();
          for (let tag of existingTags) {
            existingTagsSet.add(tag.tag_name.toUpperCase());
            tagIds.push(tag.tag_id);
          }

          let newTags = [];
          for (let tagName of payload.tags) {
            if(!existingTagsSet.has(tagName.toUpperCase())) {
              newTags.push(tagName);
            }
          }

          if(!_.isEmpty(newTags)) {
            logger.trace(logHandler, { CREATING_TAGS : newTags });
            let result = yield tagService.insertTags(logHandler, payload, newTags);
            for (let i = 0; i < newTags.length; i++) {
              tagIds.push(result.insertId + i);
            }
          }

          yield tagService.assignTagToChannel(logHandler, payload, tagIds);
        }
      }

      let result = {
        channel_id   : channel_id,
        user_id      : user_id,
        channel_name : channel_name,
        label        : custom_label || channel_name
      };
      return result;
    })().then((data) => {
      resolve(data);
    }, (error) => {
      logger.logError(logHandler, "error occurred : ", error);
      reject(error);
    });
  });
}

function getConversations(logHandler, payload, cb) {
  let userInfo  = payload.userInfo;
  let businessInfo = payload.businessInfo;

  if(userInfo.user_type == constants.userType.AGENT) {
    let error = new Error("Please upgrade your app");
    logger.error(logHandler, "removed agent API : getConversation", error);
    return cb(error);
  }
  if(payload.app_secret_key && !payload.en_user_id && utils.securedBusiness(businessInfo)) {
    return cb(new Error("required parameter en_user_id"));
  }
  let opts = {
    user_id       : userInfo.user_id,
    business_id   : businessInfo.business_id,
    business_name : businessInfo.business_name
  };
  conversationService.getUserConversation(logHandler, opts, (error, result) => {
    if(error) {
      logger.error(logHandler, "Error occurred while fetching user conversation ", error);
      return cb(error);
    }
    // markSentMessagesDelivered(logHandler, userInfo.user_id, () => {});
    return cb(null, result);
  });
}

function getConversationsV1(logHandler, payload, callback) {
  let opts                  = {};
  opts.user_id              = payload.user_id;
  opts.user_type            = payload.userInfo.user_type;
  opts.business_id          = payload.businessInfo.business_id;
  opts.business_name        = payload.businessInfo.business_name;
  opts.typeList             = utils.isString(payload.type) ? utils.jsonParse(payload.type) : payload.type;
  opts.statusList           = utils.isString(payload.status) ? utils.jsonParse(payload.status) : payload.status;  // open close status of chat
  opts.labelList            = utils.isString(payload.label) ? utils.jsonParse(payload.label) : payload.label;
  opts.page_start           = utils.parseInteger(payload.page_start) || 1;  // pagination
  opts.page_end             = payload.page_end || opts.page_start + constants.getConversationsPageSize - 1;
  opts.search_user_id       = payload.search_user_id;
  opts.channelFilter        = utils.isString(payload.channel_filter) ? utils.jsonParse(payload.channel_filter) : payload.channel_filter; // Default channel filter

  if(opts.search_user_id) {
    opts.typeList = [0];
    opts.labelList = [];
    opts.channelFilter = [];
    opts.statusList = [];
  }


  // type filter : 0 default , my chats 1, unassigned 2, mentions 3, 10 all chats
  // select all types on default
  opts.fetchAllChats = false;
  if(new Set(opts.typeList).has(constants.conversationType.DEFAULT)) {
    opts.typeList = [constants.conversationType.MY_CHAT, constants.conversationType.UNASSIGNED];
  }
  // if fetch all conversation
  else if(new Set(opts.typeList).has(constants.conversationType.ALL)) {
    opts.typeList = [constants.conversationType.ALL];
    opts.fetchAllChats = true;
  }

  let asyncTasks = [];

  asyncTasks.push(getUserConversation.bind(null, opts));
  async.series(asyncTasks, (error, result) => {
    if(error) {
      logger.error(logHandler, "Error in getConversationsV1 ", error);
      logger.logError(logHandler, "Error in getConversationsV1 ", error);
      return callback(error);
    }
    opts.result.version = payload.version;
    return callback(null, opts.result);
  });

  function getUserConversation(opts, cb) {
    const user_type = opts.user_type;
    opts.validChannelIds = [];

    let asyncTasks = [];

    // fetch channels based on filter
    let typesOfChat = new Set(opts.typeList);
    if(!_.isEmpty(opts.typeList)) {
      if(typesOfChat.has(constants.conversationType.MY_CHAT)
        || typesOfChat.has(constants.conversationType.UNASSIGNED)
        || typesOfChat.has(constants.conversationType.ALL)) {
        asyncTasks.push(fetchValidChannelIds.bind(null, opts));
      }

      if(typesOfChat.has(constants.conversationType.TAGGED)) {
        asyncTasks.push(fetchChannelIdsBasedOnTaggedUser.bind(null, opts));
      }
    }


    // fetch channels based on labels
    if(!_.isEmpty(opts.labelList)) {
      asyncTasks.push(fetchChannelIdsBasedOnTags.bind(null, opts));
    }


    // fetch actual conversation
    asyncTasks.push(fetchConversation.bind(null, opts));


    async.series(asyncTasks, (error, result) => {
      if(error) {
        logger.error(logHandler, "Error in getUserConversation ", error);
        return cb(error);
      }
      return cb();
    });

    function fetchValidChannelIds(opts, cb) {
      const user_id  = opts.user_id;
      let whereClause = "";
      let values = [];
      if(opts.fetchAllChats) {
        whereClause = "channels.business_id = ?";
        values.push(opts.business_id);
      } else {
        whereClause = "utc.user_id = ?";
        let user = opts.search_user_id || user_id;
        values.push(user);
      }
      let sql = `SELECT utc.channel_id , utc.status as user_participation_status ` +
                `FROM user_to_channel as utc LEFT JOIN channels on utc.channel_id = channels.channel_id WHERE ${whereClause} `;
      let logHandlerLocal = utils.cloneObject(logHandler);
      logHandlerLocal.logResultLength = true;
      dbHandler.query(logHandlerLocal, " query :: getConversationsV1 ::  fetchValidChannelIds ",  sql, values, (err, res) => {
        if(err) {
          return cb(err);
        }
        let channelIds = new Set();
        for (let field of res) {
          if(field.user_participation_status == 1) {
            channelIds.add(field.channel_id);
          }
        }
        opts.myChatsChannelIds = Array.from(channelIds);
        logger.trace(logHandler, " myChatsChannelIds [length]", opts.myChatsChannelIds.length);
        return cb();
      });
    }

    function fetchChannelIdsBasedOnTags(opts, cb) {
      const tagList  = opts.labelList;
      let sql = "SELECT channel_id , status  FROM tags_to_channel WHERE tag_id in ( " + new Array(tagList.length).fill("?").join(', ') + " )";
      dbHandler.query(logHandler, " query :: getConversationsV1 ::  fetchChannelIdsBasedOnFilter ",  sql, tagList, (err, res) => {
        if(err) {
          return cb(err);
        }
        let channelIds = new Set();
        for (let field of res) {
          channelIds.add(field.channel_id);
        }
        opts.labelledChannelIds = Array.from(channelIds);
        logger.trace(logHandler, " labelledChannelIds [length]", opts.labelledChannelIds.length);
        return cb();
      });
    }

    function fetchChannelIdsBasedOnTaggedUser(opts, cb) {
      let sql = "SELECT distinct channel_id  FROM tagged_users WHERE tagged_user_id = ? ";
      dbHandler.query(logHandler, " query :: getConversationsV1 ::  fetchChannelIdsBasedOnTaggedUser ", sql, opts.user_id, (err, res) => {
        if(err) {
          return cb(err);
        }
        opts.taggedChannelIds = [];
        for (let field of res) {
          opts.taggedChannelIds.push(field.channel_id);
        }

        logger.trace(logHandler, " taggedChannelIds [length]", opts.taggedChannelIds.length);
        return cb();
      });
    }

    function fetchConversation(opts, cb) {
      let params = {};
      params.user_id          = opts.user_id;
      params.business_id      = opts.business_id;
      params.user_type        = opts.user_type;
      params.limit_start      = Math.abs(opts.page_start - 1);
      params.limit_end        = Math.abs(opts.page_end - opts.page_start + 1);
      params.statusList       = opts.statusList;
      params.typeList         = opts.typeList;
      params.search_user_id   = opts.search_user_id;
      params.showUnassignedChats = false;
      params.applyTypeFilter   = false;
      params.applyAdditionalFilter   = false;
      params.validChannelIds  = [];
      params.filterChannelIds  = [];
      params.channelFilter  = opts.channelFilter;



      // filters
      // type filter : my chats 1, unassigned 2, mentions 3, 10 all chats
      let typesOfChat = new Set(opts.typeList);
      if(typesOfChat.has(constants.conversationType.MY_CHAT)) {
        params.validChannelIds = params.validChannelIds.concat(opts.myChatsChannelIds);
        params.applyTypeFilter = true;
      }
      if(typesOfChat.has(constants.conversationType.UNASSIGNED)) {
        params.showUnassignedChats = true;
        params.applyTypeFilter = true;
      }
      if(typesOfChat.has(constants.conversationType.TAGGED)) {
        params.validChannelIds = params.validChannelIds.concat(opts.taggedChannelIds);
        params.applyTypeFilter = true;
      }
      if(typesOfChat.has(constants.conversationType.ALL)) {
        params.validChannelIds = params.validChannelIds.concat(opts.myChatsChannelIds);
        params.applyTypeFilter = true;
      }

      // label filter is applied
      if(!_.isEmpty(opts.labelList)) {
        // no matching channel id's found
        if(_.isEmpty(opts.labelledChannelIds)) {
          opts.result = {
            conversation_list : [],
            page_size         : constants.getConversationsPageSize
          };
          return cb();
        }
        params.applyAdditionalFilter = true;
        params.filterChannelIds = params.filterChannelIds.concat(opts.labelledChannelIds);
      }


      // if user is a agent
      if(params.user_type == constants.userType.AGENT) {
        // if no filter is given
        if(!params.applyTypeFilter) {
          opts.result = {
            conversation_list : [],
            page_size         : constants.getConversationsPageSize
          };
          return cb();
        }
        dbquery.getAgentConversation(logHandler, params, (err, res) => {
          if(err) {
            logger.error(logHandler, "Error occurred while fetching agent conversation ", err);
            return cb(err);
          }

          let param = {};
          param.user_id = params.user_id;
          param.channelIds = [];
          for (let row of res) {
            row.label = row.custom_label || row.owner_full_name || opts.business_name;
            delete row.custom_label;
            delete row.owner_full_name;
            param.channelIds.push(row.channel_id);
          }


          // fetchUnreadCount
          conversationService.getUnreadCountForAgent(logHandler, param.channelIds, param.user_id).then((data) => {
            for (let row of res) {
              row.unread_count = data[row.channel_id] || 0;
            }

            opts.result = {
              conversation_list : res,
              page_size         : constants.getConversationsPageSize
            };
            return cb();
          }, (error) => {
            logger.logError(logHandler, "Error occured in getUnreadCountForCustomer", error);
            return cb(error);
          });
        });
      }
      // if user is a customer
      else if(params.user_type == constants.userType.CUSTOMER) {
        let options = {
          user_id       : opts.user_id,
          business_id   : opts.business_id,
          business_name : opts.business_name
        };
        conversationService.getUserConversation(logHandler, options, (err, res) => {
          if(err) {
            logger.error(logHandler, "Error occurred while fetching user conversation ", err);
            return cb(err);
          }
          opts.result = {
            version           : payload.version,
            conversation_list : res,
            page_size         : constants.getConversationsPageSize
          };
          return cb();
        });
      } else {
        return cb(new Error("Unknown user type " + user_type));
      }
    }
  }
}

function getMessages(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let opts            = {};
    opts.app_secret_key = payload.app_secret_key;
    opts.access_token   = payload.access_token;
    opts.channel_id     = payload.channel_id;
    opts.user_id        = payload.user_id;
    opts.user_type      = payload.userInfo.user_type;
    opts.business_id    = payload.businessInfo.business_id;
    opts.app_secret_key = payload.businessInfo.app_secret_key;
    let response        = {};
    if(!utils.isDefined(payload.page_start) && !utils.isDefined(payload.page_end)) {
      opts.page_start = 1;
      opts.page_end = constants.getMessagesPageSize;
    } else {
      opts.page_start = payload.page_start || 1;  // pagination
      opts.page_end = payload.page_end || opts.page_start + constants.getMessagesPageSize - 1;
    }
    Promise.coroutine(function* () {
      let channelInfo = payload.channelInfo;

      if(payload.app_secret_key && !payload.en_user_id && utils.securedBusiness(payload.businessInfo)) {
        throw new Error("required parameter en_user_id");
      }
      if(payload.userInfo.user_type == constants.userType.AGENT && payload.userInfo.user_id != payload.user_id) {
        logger.error(logHandler, "access token and user id mismatch");
        throw new Error(RESP.ERROR.eng.UNAUTHORIZED.customMessage);
      }
      if(payload.userInfo.user_type == constants.userType.CUSTOMER && channelInfo.chat_type != constants.chatType.PUBLIC_GROUP) {
        let userExistsInChannel = yield channelService.getUserFromUserToChannel(logHandler, payload.userInfo.user_id, payload.channel_id);
        if(_.isEmpty(userExistsInChannel)) {
          logger.error(logHandler, "user does not belong to this channel");
          throw new Error(RESP.ERROR.eng.UNAUTHORIZED.customMessage);
        }
      }
      let userInfo = yield userService.getInfo(logHandler, opts.user_id);
      if(_.isEmpty(userInfo)) {
        throw new Error("User does not exist");
      }
      userInfo  = userInfo[0];
      if(userInfo.business_id != channelInfo.business_id) {
        let error = {
          user_id             : userInfo.user_id,
          user_business_id    : userInfo.business_id,
          channel_id          : channelInfo.channel_id,
          channel_business_id : channelInfo.business_id
        };
        logger.error(logHandler, "user and channel don't belong to same business ", error);
        throw new Error("user and channel don't belong to same business ");
      }


      // get chat
      let chatMessages = yield conversationService.getChatMessages(logHandler, opts);
      chatMessages = chatMessages.reverse();
      let message_ids = [];
      // convert json to fields
      for (let j = 0; j < chatMessages.length; j++) {
        utils.addAllKeyValues(utils.jsonToObject(logHandler, chatMessages[j].message), chatMessages[j]);
        message_ids.push(chatMessages[j].id);
        chatMessages[j].user_type = chatMessages[j].user_type || 0;
      }
      if(!_.isEmpty(message_ids)) {
        let lastReadMessage = yield conversationService.getReadLastReadMessageByOtherUser(logHandler, channelInfo.channel_id, userInfo.user_id);
        for (let i = 0; i < chatMessages.length; i++) {
          chatMessages[i].message_status = (lastReadMessage.last_read_message_id >= chatMessages[i].id) ? constants.messageStatus.READ : constants.messageStatus.SENT;
        }
      }


      let channelAndLabelInfo = yield channelService.getChannelAndLabelInfo(logHandler, opts.channel_id);
      let ownerAndAgentInfo   = yield channelService.getOwnerAndAgentOfChannel(logHandler, opts);

      // if user is a customer assign business name to auto message
      if(opts.user_type == constants.userType.CUSTOMER) {
        if(!_.isEmpty(chatMessages)) { chatMessages[0].full_name = chatMessages[0].full_name || payload.businessInfo.business_name; }
      }
      // if user is a agent
      else {
        response.tags             = yield tagService.getChannelAssociatedTags(logHandler, opts.channel_id);
        let businessInfo          = payload.businessInfo;
        opts.app_secret_key       = businessInfo.app_secret_key;
        response.customer_name    = ownerAndAgentInfo.owner_name;
        response.customer_phone   = ownerAndAgentInfo.owner_phone_number;
        response.customer_email   = ownerAndAgentInfo.owner_email;
        response.customer_address = utils.getFormattedAddress(logHandler, ownerAndAgentInfo.owner_address);
      }


      // sync message history
      let historyPayload = {
        user_id       : userInfo.user_id, business_id   : channelInfo.business_id, channel_id    : channelInfo.channel_id, mark_all_read : true
      };
      conversationService.syncMessageHistory(logHandler, historyPayload);
      // sending read notification
      conversationService.notifyReadAll(logHandler, opts);


      response.messages           = chatMessages;
      response.channel_id         = opts.channel_id;
      response.page_size          = constants.getMessagesPageSize;
      response.channel_name       = channelAndLabelInfo[0].channel_name;
      response.channel_attributes =  channelAndLabelInfo[0].custom_attributes || {};
      response.on_subscribe       = 0;
      response.full_name          = userInfo.full_name;
      response.agent_name         = ownerAndAgentInfo.agent_name;
      response.user_id            = channelInfo.agent_id ||  -1;
      response.label_status       = channelAndLabelInfo[0].label_status;
      if(opts.user_type == constants.userType.AGENT) {
        response.label            = channelInfo.custom_label || ownerAndAgentInfo.owner_name;
      } else {
        response.label            = channelInfo.custom_label     || channelAndLabelInfo[0].label || channelInfo.label ||
          ownerAndAgentInfo.agent_name || payload.businessInfo.business_name;
      }

      if(opts.user_type == constants.userType.CUSTOMER && channelInfo.chat_type == constants.chatType.O20_CHAT) {
        let otherUsers = yield channelService.getUsersFromUserToChannelExceptUserId(logHandler, { channel_id : opts.channel_id, user_id : opts.user_id });
        response.label = (otherUsers.length > 0) ? (otherUsers[0].full_name || payload.businessInfo.business_name) : response.label;
      }



      return response;
    })().then(
      (data) => { resolve(data); },
      (error) => { reject(error); }
    );
  });
}

function getByLabelId(logHandler, payload) {
  let errorFlag = false;
  return new Promise((resolve, reject) => {
    payload.business_id    = payload.businessInfo.business_id;
    Promise.coroutine(function* () {
      let labelInfo         = yield channelService.getInfo(logHandler, { channel_id : payload.label_id });
      if(_.isEmpty(labelInfo)) { throw new Error(RESP.ERROR.eng.WRONG_LABEL_ID.customMessage); }
      labelInfo = labelInfo[0];

      if(labelInfo.status == constants.channelStatus.DISABLED) {
        let defaultChannels = yield channelService.getDefaultChannelsInfoExceptLabelIds(logHandler, payload.business_id, [-1]);
        if(_.isEmpty(defaultChannels)) {
          logger.info(logHandler, "No active default channel found for business_id " + payload.business_id);
          errorFlag = true;
          throw new Error("No active default channel");
        }
        payload.label_id          = defaultChannels[0].label_id;
        labelInfo                 = defaultChannels[0];
        labelInfo.created_at      = defaultChannels[0].date_time;
        labelInfo.default_message = defaultChannels[0].message;
      }

      let channelInfo = yield conversationService.getChannelInfoFromLabelId(logHandler, payload);

      let result = {};
      if(!_.isEmpty(channelInfo)) {
        payload.channelInfo = channelInfo[0];
        payload.channel_id  = payload.channelInfo.channel_id;
        result              = yield getMessages(logHandler, payload);
        result.status       = channelInfo.status;
      } else {
        let message = {
          full_name      : payload.businessInfo.business_name,
          user_type      : 0,
          user_id        : 0,
          date_time      : labelInfo.created_at,
          message        : labelInfo.default_message,
          message_type   : 1,
          message_status : 3
        };
        result.messages     = [message];
        result.channel_id   = -1;
        result.full_name    = payload.businessInfo.business_name;
        result.on_subscribe = 0;
        result.label        = labelInfo.channel_name;
        result.label_id     = payload.label_id;
      }
      result.business_name  = payload.businessInfo.business_name;
      result.status         = constants.channelStatus.OPEN;
      return result;
    })().then(
      (data) => { resolve(data); },
      (error) => {
        if(errorFlag) {
          return reject(RESP.ERROR.eng.DATA_UNAVAILABLE);
        }
        return reject(error);
      }
    );
  });
}


function uploadFile(logHandler, payload, callback) {
  let opts                             = {};
  opts.file                        = payload.file;
  opts.response = {};

  let asyncTasks = [];

  asyncTasks.push(imageUpload.bind(null, opts));

  function imageUpload(opts, callback) {
    if(!opts.file) {
      return callback();
    }

    utilityService.uploadFile(logHandler, { file : opts.file }).then(
      (result) => {
        opts.response.url = result.url;
        opts.response.image_url = result.url;
        opts.response.thumbnail_url = result.url;
        return callback(null, opts);
      },
      (error) => {
        logger.error(logHandler, "Error in upload file ", error);
        return callback(error);
      }
    );
  }
  async.series(asyncTasks, (error) => {
    if(error) {
      logger.error(logHandler, error);
      return callback(error);
    }
    logger.trace(logHandler, "Final response ", opts.response);
    return callback(null, opts.response);
  });
}

function markConversationV1(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let channelsInfo = payload.channelsInfo;
      for (let i = 0; i < channelsInfo.length; i++) {
        payload.channelInfo = channelsInfo[i];
        try {
          yield markConversation(logHandler, payload);
        } catch (e) {
          logger.error(logHandler, e);
        }
      }
    })().then(
      (data) => { resolve(data); },
      (error) => {
        reject(error);
      }
    );
  });
}


function markConversation(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      // pyload user_id neglected
      let user_id                     = payload.user_id,
        status                      = payload.status,
        channelInfo                 = payload.channelInfo,
        businessInfo                = payload.businessInfo,
        userInfo                    = payload.userInfo;


      if(channelInfo.status == status) {
        logger.trace(logHandler, "This channel is already having the same status");
        throw new Error("This channel is already have the same status");
      }


      if(!channelInfo.agent_id && status == constants.channelStatus.CLOSED) {
        payload.user_id = userInfo.user_id;
        yield agentController.assignAgent(logHandler, payload);
      }


      let opts = {};
      opts.status = status;
      opts.userInfo = userInfo;
      opts.businessInfo = businessInfo;
      opts.channelInfo = channelInfo;
      yield conversationService.markConversation(logHandler, opts);

      return {};
    })().then(
      (data) => { resolve(data); },
      (error) => {
        reject(error);
      }
    );
  });
}

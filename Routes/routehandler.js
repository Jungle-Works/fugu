

const cache                   = require('memory-cache');
const UniversalFunc           = require('../Utils/universalFunctions');
const RESP                    = require('../Config').responseMessages;
const logger                  = require('../Routes/logging');
const constants               = require('../Utils/constants');
const utils                   = require('../Controller/utils');
const UserController          = require('../Controller/userController');
const ResellerController      = require('../Controller/reseller');
const BusinessController      = require('../Controller/business');
const ChannelController       = require('../Controller/channelController');
const ConversationController  = require('../Controller/conversationController');
const ChatController          = require('../Controller/chatController');
const AgentController         = require('../Controller/agentController');
const TagController           = require('../Controller/tagController');
const AlertController         = require('../Controller/alertController');
const BillingController       = require('../Controller/billingController');
const SuperAdminController    = require('../Controller/superAdminController');
const cacheBuilder            = require('../cachebuilder');
const FuguController          = require('../Controller/fuguController');

//--------------------------------------------------------------
//                     USER APIs
//--------------------------------------------------------------


exports.userLogout = function (req, res) {
  UserController.userLogout(req.logHandler, req.body, (err, result) => {
    if(err) {
      logger.error(req.logHandler, "User logout error", err);
    } else {
      logger.trace(req.logHandler, "Successfully logged out", result);
    }
  });
  UniversalFunc.sendSuccess(RESP.SUCCESS.LOGOUT, null, res);
};

exports.getUsers = function (req, res) {
  UserController.getUsers(req.logHandler, req.body, res);
};

exports.getUserDetails = function (req, res) {
  UserController.getUserDetails(req.logHandler, req.body, res);
};

exports.getUserInfo = function (req, res) {
  UserController.getUserInfo(req.logHandler, req.body, res);
};

exports.getUserChannelsInfo = function (req, res) {
  UserController.getUserChannelsInfo(req.logHandler, req.body, res);
};

exports.getUserChannelInfo = function (req, res) {
  UserController.getUserChannelInfo(req.logHandler, req.body, res);
};

exports.putUserDetails = function (req, res) {
  UserController.putUserDetailsV1(req.logHandler, req.body).then((data) => {
    logger.trace(req.logHandler, { RESPONSE : data });
    return UniversalFunc.sendSuccess(RESP.SUCCESS.ENTRY_ADDED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(req.logHandler, { EVENT : "PUT USER DETAILS ERROR" }, { MESSAGE : error.message });
    return UniversalFunc.sendError(error, res);
  });
};

exports.editUserDetails = function (req, res) {
  UserController.editUserDetails(req.logHandler, req.body, res);
};

exports.getUserMessageStats = function (req, res) {
  UserController.getUserMessageStats(req.logHandler, req.body).then((data) => {
    logger.trace(req.logHandler, { RESPONSE : data });
    return UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(req.logHandler, { EVENT : "Get User Messages Statstices Error" }, { MESSAGE : error.message });
    return UniversalFunc.sendError(error, res);
  });
};

exports.testPushNotification = function (req, res) {
  UserController.testPushNotification(req.logHandler, req.body, res);
};

//--------------------------------------------------------------





//--------------------------------------------------------------
//                     CHANNEL APIs
//--------------------------------------------------------------

exports.getChannels = function (req, res) {
  ChannelController.getChannels(req.logHandler, req.body, res);
};

exports.editChannelPriority = function (req, res) {
  ChannelController.editChannelPriority(req.logHandler, req.body, res);
};

exports.createChannelsV2 = function (req, res) {
  req.body.channel_image = req.files[0];
  ChannelController.createChannelsV2(req.logHandler, req.body, (err, result) => {
    if(err) {
      logger.error(req.logHandler, "Error occurred while create channel", err);
      UniversalFunc.sendError(err, res);
    } else {
      logger.trace(req.logHandler, "Channel creation done", result);
      UniversalFunc.sendSuccess(RESP.SUCCESS.ENTRY_ADDED_SUCCESSFULLY, result, res);
    }
  });
};

exports.editChannelsV2 = function (req, res) {
  req.body.channel_image = req.files ? req.files[0] : null;
  ChannelController.editChannelsV2(req.logHandler, req.body, (err, result) => {
    if(err) {
      logger.error(req.logHandler, "Error occurred while edit channel", err, err.stack);
      UniversalFunc.sendError(err, res);
    } else {
      logger.trace(req.logHandler, "Successfully edited channel", result);
      UniversalFunc.sendSuccess(RESP.SUCCESS.UPDATED_SUCCESSFULLY, result, res);
    }
  });
};

exports.editInfo = function (req, res) {
  req.body.channel_image = req.files ? req.files[0] : null;
  ChannelController.editInfo(req.logHandler, req.body, res);
};

exports.channelEnableDisable = function (req, res) {
  ChannelController.channelEnableDisable(req.logHandler, req.body, (err, result) => {
    if(err) {
      logger.error(req.logHandler, "Error occurred in channelEnableDisable ", err);
      UniversalFunc.sendError(err, res);
    } else {
      logger.trace(req.logHandler, "Successfully logged in", result);
      UniversalFunc.sendSuccess(RESP.SUCCESS.UPDATED_SUCCESSFULLY, null, res);
    }
  });
};

//--------------------------------------------------------------





//--------------------------------------------------------------
//                     AGENT APIs
//--------------------------------------------------------------


exports.agentLogin = function (req, res) {
  AgentController.agentLoginEmail(req.logHandler, req.body, res);
};

exports.agentLogout = function (req, res) {
  AgentController.agentLogout(req.logHandler, req.body, res);
};

exports.getAgents = function (req, res) {
  AgentController.getAgents(req.logHandler, req.body, res);
};

exports.inviteAgent = function (req, res) {
  AgentController.inviteAgent(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      UniversalFunc.sendSuccess(RESP.SUCCESS.EMAIL_SENT, data, res);
    },
    (error) => {
      logger.error(req.logHandler, error);
      UniversalFunc.sendError(error, res);
    }
  );
};

exports.resendInvitation = function (req, res) {
  AgentController.resendInvitation(req.logHandler, req.body, res);
};

exports.revokeInvitation = function (req, res) {
  AgentController.revokeInvitation(req.logHandler, req.body, res);
};

exports.verifyToken = function (req, res) {
  AgentController.verifyToken(req.logHandler, req.query, res);
};

exports.otpLogin = function (req, res) {
  AgentController.otpLogin(req.logHandler, req.query, res);
};

exports.registerAgent = function (req, res) {
  req.body.files = req.files;
  AgentController.registerAgent(req.logHandler, req.body, res);
};

exports.editAgent = function (req, res) {
  req.body.files = req.files;
  AgentController.editAgent(req.logHandler, req.body, res);
};

exports.editUserInfo = function (req, res) {
  req.body.files = req.files;
  UserController.editUserInfo(req.logHandler, req.body, res);
};

exports.getAgentInfo  = function (req, res) {
  AgentController.getAgentInfo(req.logHandler, req.body, res);
};
exports.agentEnableDisable = function (req, res) {
  AgentController.agentEnableDisable(req.logHandler, req.body, res);
};

exports.assignAgent = function (req, res) {
  AgentController.assignAgent(req.logHandler, req.body).then((data) => {
    logger.trace(req.logHandler, { EVENT : "ASSIGN AGENT SUCCESS" });
    UniversalFunc.sendSuccess(RESP.SUCCESS.AGENT_ASSIGNED, data, res);
  }, (error) => {
    logger.error(req.logHandler, { EVENT : "AGENT ASSIGN ERROR " }, { MESSAGE : error.message });
    UniversalFunc.sendError(error, res);
  });
};

exports.assignAgentV1 = function (req, res) {
  AgentController.assignAgentV1(req.logHandler, req.body);
  UniversalFunc.sendSuccess(RESP.SUCCESS.AGENT_ASSIGNED, null, res);
};

exports.resetPasswordRequest = function (req, res) {
  AgentController.resetPasswordRequest(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      UniversalFunc.sendSuccess(RESP.SUCCESS.EMAIL_SENT, data, res);
    },
    (error) => {
      logger.error(req.logHandler, error);
      UniversalFunc.sendError(error, res);
    }
  );
};

exports.resetPassword = function (req, res) {
  AgentController.resetPassword(req.logHandler, req.body, res);
};

exports.changePassword = function (req, res) {
  AgentController.changePassword(req.logHandler, req.body, res);
};

exports.adminResetPasswordRequest = function (req, res) {
  AgentController.adminResetPasswordRequest(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      UniversalFunc.sendSuccess(RESP.SUCCESS.EMAIL_SENT, data, res);
    },
    (error) => {
      logger.error(req.logHandler, error);
      UniversalFunc.sendError(error, res);
    }
  );
};



exports.agentLoginViaAuthToken = function (req, res) {
  AgentController.agentLoginViaAuthToken(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      UniversalFunc.sendSuccess(RESP.SUCCESS.LOGGED_IN, data, res);
    },
    (error) => {
      logger.error(req.logHandler, error);
      error = (error.errorResponse) ? error.errorResponse : error;
      UniversalFunc.sendError(error, res);
    }
  );
};



//--------------------------------------------------------------




//--------------------------------------------------------------
//                     CONVERSATION APIs
//--------------------------------------------------------------


exports.createConversation = function (req, res) {
  ConversationController.createConversation(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      UniversalFunc.sendSuccess(RESP.SUCCESS.ENTRY_ADDED_SUCCESSFULLY, data, res);
    },
    (error) => {
      logger.error(req.logHandler, { EVENT : "CREATE CONVERSATION ERROR" }, { MESSAGE : error.message });
      return UniversalFunc.sendError(error, res);
    }
  );
};

exports.getConversations = function (req, res) {
  ConversationController.getConversations(req.logHandler, req.body, (err, result) => {
    if(err) {
      logger.error(req.logHandler, "Error occurred while getConversations", err);
      UniversalFunc.sendError(err, res);
    } else {
      logger.trace(req.logHandler, "Successful getConversations ", result);
      UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, result, res);
    }
  });
};

exports.getConversationsV1 = function (req, res) {
  ConversationController.getConversationsV1(req.logHandler, req.body, (err, result) => {
    if(err) {
      logger.error(req.logHandler, "Error occurred while getConversations V1 ", err);
      UniversalFunc.sendError(err, res);
    } else {
      logger.trace(req.logHandler, "Successful getConversations V1 ", result);
      UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, result, res);
    }
  });
};

exports.searchUser = function (req, res) {
  UserController.searchUser(req.logHandler, req.body, res);
};

exports.getMessages = function (req, res) {
  ConversationController.getMessages(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
    },
    (error) => {
      logger.error(req.logHandler, error);
      UniversalFunc.sendError(error, res);
    }
  );
};

exports.uploadFile = function (req, res) {
  let data = req.body;
  data.file = req.files[0];
  ConversationController.uploadFile(req.logHandler, data, (err, result) => {
    if(err) {
      logger.error(req.logHandler, "Error occurred while uploadFile", err);
      return UniversalFunc.sendError(err, res);
    }
    logger.trace(req.logHandler, "File uploaded successfully", result);
    return UniversalFunc.sendSuccess(RESP.SUCCESS.UPLOADED_SUCCESSFULLY, result, res);
  });
};

exports.getByLabelId = function (req, res) {
  ConversationController.getByLabelId(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
    },
    (error) => {
      logger.error(req.logHandler, error);
      UniversalFunc.sendError(error, res);
    }
  );
};

exports.markConversation = function (req, res) {
  ConversationController.markConversation(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      UniversalFunc.sendSuccess(RESP.SUCCESS.CONVERSATION_MARKED_SUCCESSFULLY, data, res);
    },
    (error) => {
      logger.error(req.logHandler, error);
      UniversalFunc.sendError(error, res);
    }
  );
};

exports.markConversationV1 = function (req, res) {
  ConversationController.markConversationV1(req.logHandler, req.body);
  UniversalFunc.sendSuccess(RESP.SUCCESS.CONVERSATION_MARKED_SUCCESSFULLY, null, res);
};

//--------------------------------------------------------------



//--------------------------------------------------------------
//                     CHAT APIs
//--------------------------------------------------------------

exports.groupChatSearch = function (req, res) {
  ChatController.groupChatSearch(req.logHandler, req.body, res);
};
exports.getChatGroups = function (req, res) {
  ChatController.getChatGroups(req.logHandler, req.body, res);
};
exports.createGroupChat = function (req, res) {
  ChatController.createGroupChat(req.logHandler, req.body, res);
};
exports.createO2OChat = function (req, res) {
  ChatController.createO2OChat(req.logHandler, req.body, res);
};
exports.getChatMembers = function (req, res) {
  ChatController.getChatMembers(req.logHandler, req.body, res);
};
exports.addChatMember = function (req, res) {
  ChatController.addChatMember(req.logHandler, req.body, res);
};
exports.removeChatMember = function (req, res) {
  ChatController.removeChatMember(req.logHandler, req.body, res);
};
exports.joinChat = function (req, res) {
  ChatController.joinChat(req.logHandler, req.body, res);
};
exports.leaveChat = function (req, res) {
  ChatController.leaveChat(req.logHandler, req.body, res);
};
//--------------------------------------------------------------




//--------------------------------------------------------------
//                     TAG APIs
//--------------------------------------------------------------
exports.createTags = function (req, res) {
  TagController.createTags(req.logHandler, req.body).then(
    (result) => {
      logger.trace(req.logHandler, "Tags updated successfully", result);
      UniversalFunc.sendSuccess(RESP.SUCCESS.TAG_CREATED_SUCCESSFULLY, result, res);
    },
    (error) => {
      logger.error(req.logHandler, "Error occurred while createTags", error);
      UniversalFunc.sendError(error, res);
    }
  );
};

exports.getTags = function (req, res) {
  TagController.getTags(req.logHandler, req.body).then(
    (result) => {
      logger.trace(req.logHandler, "Tags updated successfully", result);
      UniversalFunc.sendSuccess(RESP.SUCCESS.TAGS_FETCHED_SUCCESSFULLY, result, res);
    },
    (error) => {
      logger.error(req.logHandler, "Error occurred while getTags", error);
      UniversalFunc.sendError(error, res);
    }
  );
};

exports.editTags = function (req, res) {
  TagController.editTags(req.logHandler, req.body).then(
    (result) => {
      logger.trace(req.logHandler, "Tags updated successfully", result);
      UniversalFunc.sendSuccess(RESP.SUCCESS.TAGS_EDITED_SUCCESSFULLY, result, res);
    },
    (error) => {
      logger.error(req.logHandler, "Error occurred while editTags", error);
      UniversalFunc.sendError(error, res);
    }
  );
};

exports.getChannelTags = function (req, res) {
  TagController.getChannelTags(req.logHandler, req.body).then(
    (result) => {
      logger.trace(req.logHandler, "Tags updated successfully", result);
      UniversalFunc.sendSuccess(RESP.SUCCESS.TAGS_FETCHED_SUCCESSFULLY, result, res);
    },
    (error) => {
      logger.error(req.logHandler, "Error occurred while getChannelTags", error);
      UniversalFunc.sendError(error, res);
    }
  );
};

exports.assignTagsToChannel = function (req, res) {
  TagController.assignTagsToChannel(req.logHandler, req.body).then(
    (result) => {
      logger.trace(req.logHandler, "Tags updated successfully", result);
      UniversalFunc.sendSuccess(RESP.SUCCESS.TAGS_FETCHED_SUCCESSFULLY, result, res);
    },
    (error) => {
      logger.error(req.logHandler, "Error occurred while assignTagsToChannel", error);
      UniversalFunc.sendError(error, res);
    }
  );
};

exports.enableDisableTag = function (req, res) {
  TagController.enableDisableTag(req.logHandler, req.body).then(
    (result) => {
      logger.trace(req.logHandler, "Tags updated successfully", result);
      UniversalFunc.sendSuccess(RESP.SUCCESS.UPDATED_SUCCESSFULLY, result, res);
    },
    (error) => {
      logger.error(req.logHandler, "Error occurred while enableDisableTag", error);
      UniversalFunc.sendError(error, res);
    }
  );
};

//--------------------------------------------------------------




//--------------------------------------------------------------
//                     BUSINESS APIs
//--------------------------------------------------------------

exports.getBusinessConfiguration = function (req, res) {
  BusinessController.getConfiguration(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, "Data fetched successfully in getBusinessConfiguration", data);
      UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
    },
    (error) => {
      logger.error(req.logHandler, "Error occurred while getBusinessConfiguration", error);
      UniversalFunc.sendError(error, res);
    }
  );
};

exports.editBusinessConfiguration = function (req, res) {
  BusinessController.editConfiguration(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, "Business configuration edit successful ", data);
      UniversalFunc.sendSuccess(RESP.SUCCESS.UPDATED_SUCCESSFULLY, data, res);
    },
    (error) => {
      logger.error(req.logHandler, "Error occurred while editBusinessConfiguration", error);
      UniversalFunc.sendError(error, res);
    }
  );
};

exports.getDevices = function (req, res) {
  BusinessController.getDevices(req.logHandler, req.body, res);
};

exports.addDevice = function (req, res) {
  BusinessController.addDevice(req.logHandler, req.body, res);
};

exports.editDevice = function (req, res) {
  req.body.files = req.files;
  BusinessController.editDevice(req.logHandler, req.body, res);
};

exports.getBusinessInfo = function (req, res) {
  BusinessController.getBusinessInfo(req.logHandler, req.body, res);
};

exports.editBusinessInfo = function (req, res) {
  req.body.files = req.files;
  BusinessController.editBusinessInfo(req.logHandler, req.body, res);
};

exports.addBusinessCannedMessages = function (req, res) {
  BusinessController.addBusinessCannedMessages(req.logHandler, req.body, (err, result) => {
    if(err) {
      logger.error(req.logHandler, "Error occurred while adding canned message ", err);
      UniversalFunc.sendError(err, res);
    } else {
      logger.trace(req.logHandler, "Successfully added canned message", result);
      UniversalFunc.sendSuccess(RESP.SUCCESS.ENTRY_ADDED_SUCCESSFULLY, result, res);
    }
  });
};

exports.getBusinessCannedMessages = function (req, res) {
  BusinessController.getBusinessCannedMessages(req.logHandler, req.body, (err, result) => {
    if(err) {
      logger.error(req.logHandler, "Error occurred in get canned message ", err);
      UniversalFunc.sendError(err, res);
    } else {
      logger.trace(req.logHandler, "Get canned message successful", result);
      UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, result, res);
    }
  });
};

exports.editBusinessCannedMessages = function (req, res) {
  BusinessController.editBusinessCannedMessages(req.logHandler, req.body, (err, result) => {
    if(err) {
      logger.error(req.logHandler, "Error occurred in edit canned message ", err);
      UniversalFunc.sendError(err, res);
    } else {
      logger.trace(req.logHandler, "Canned message edit successful ", result);
      UniversalFunc.sendSuccess(RESP.SUCCESS.ENTRY_EDIT_SUCCESSFULLY, result, res);
    }
  });
};

exports.signUp = function (req, res) {
  BusinessController.signUp(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      return UniversalFunc.sendSuccess(RESP.SUCCESS.BUSINESS_SIGNUP_SUCCESSFULL, data, res);
    },
    (error) => {
      logger.error(req.logHandler, { EVENT : "BUSINESS SIGNUP ERROR" }, { MESSAGE : error.message });
      return UniversalFunc.sendError(error, res);
    }
  );
};

exports.getBusinessStats = function (req, res) {
  BusinessController.getBusinessStats(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
    },
    (error) => {
      logger.error(req.logHandler, error);
      error = (error.errorResponse) ? error.errorResponse : error;
      UniversalFunc.sendError(error, res);
    }
  );
};

exports.getAllBusinessStats = function (req, res) {
  BusinessController.getAllBusinessStats(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
    },
    (error) => {
      logger.error(req.logHandler, error);
      error = (error.errorResponse) ? error.errorResponse : error;
      UniversalFunc.sendError(error, res);
    }
  );
};

exports.editBusinessStats = function (req, res) {
  BusinessController.editBusinessStats(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      UniversalFunc.sendSuccess(RESP.SUCCESS.UPDATED_SUCCESSFULLY, data, res);
    },
    (error) => {
      logger.error(req.logHandler, error);
      UniversalFunc.sendError(error, res);
    }
  );
};
//--------------------------------------------------------------




//--------------------------------------------------------------
//                     EMAIL APIs
//--------------------------------------------------------------
exports.entryEmail = function (req, res) {
  UserController.entryEmail(req.logHandler, req.body, (err, result) => {
    if(err) {
      logger.error(req.logHandler, "Error occurred in entryEmail ", err);
      UniversalFunc.sendError(err, res);
    } else {
      logger.trace(req.logHandler, "Successfully recorded emails ", result);
      UniversalFunc.sendSuccess(RESP.SUCCESS.CONVERSATION_MARKED_SUCCESSFULLY, null, res);
    }
  });
};

exports.logException = function (req, res) {
  UserController.logException(req.logHandler, req.body, res);
};

exports.handleMessage = function (req, res) {
  ChatController.handleMessage(req.logHandler, req.body);
  UniversalFunc.sendSuccess(RESP.SUCCESS.MESSAGE_RECEIVED, {}, res);
};

exports.handleMessageWithFaye = function (req, res) {
  ChatController.sendMessageToFaye(req.logHandler, req.body);
  UniversalFunc.sendSuccess(RESP.SUCCESS.MESSAGE_RECEIVED, {}, res);
};

exports.handlePush = function (req, res) {
  ChatController.handlePush(req.logHandler, req.body);
  UniversalFunc.sendSuccess(RESP.SUCCESS.MESSAGE_RECEIVED, {}, res);
};

exports.cacheReload = function (req, res) {
  cacheBuilder.invalidateCache();
  UniversalFunc.sendSuccess({}, null, res);
};

exports.heapDump = function (req, res) {
  logger.error(req.logHandler, " request received for dump");
  const heapdump = require('heapdump');
  heapdump.writeSnapshot((err, filename) => {
    logger.error(req.logHandler, 'dump written to', filename);
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, null, res);
  });
};

exports.logEdit = function (req, res) {
  let payload = req.body;
  let logPermission = cache.get(constants.cache.SERVER_LOGGING);
  if(logPermission[payload.module]) {
    logPermission[payload.module].loggingEnabled = true;
    if(utils.isDefined(logPermission[payload.module][payload.handler])) {
      logPermission[payload.module][payload.handler] = !logPermission[payload.module][payload.handler];
    } else {
      logger.error(req.logHandler, "handler not found");
    }
  } else {
    logger.error(req.logHandler, "module not found");
  }
  UniversalFunc.sendSuccess({}, null, res);
};


//----------------------------------------------------------------------------
//                    Reseller API's
//----------------------------------------------------------------------------

exports.resellerPutUserDetails = function (req, res) {
  logger.trace(req.logHandler, { REQUEST : req.body });
  ResellerController.resellerPutUserDetails(req.logHandler, req.body, res);
};

exports.resellerBusinessInfo = function (req, res) {
  ResellerController.getBusinessInfo(req.logHandler, req.body, res);
};

exports.assignReseller = function (req, res) {
  ResellerController.assignReseller(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      return UniversalFunc.sendSuccess(RESP.SUCCESS.ENTRY_EDIT_SUCCESSFULLY, data, res);
    },
    (error) => {
      logger.error(req.logHandler, { EVENT : "ASSIGN RESELLER ERROR" }, { MESSAGE : error.message });
      return UniversalFunc.sendError(error, res);
    }
  );
};

exports.activateBusiness = function (req, res) {
  ResellerController.activateBusiness(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      return UniversalFunc.sendSuccess(RESP.SUCCESS.BUSINESS_ACTIVATION_SUCCESSFUL, data, res);
    },
    (error) => {
      logger.error(req.logHandler, { EVENT : "ACTIVATE BUSINESS ERROR" }, { MESSAGE : error.message });
      return UniversalFunc.sendError(error, res);
    }
  );
};

exports.deactivateBusiness = function (req, res) {
  ResellerController.deactivateBusiness(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      return UniversalFunc.sendSuccess(RESP.SUCCESS.BUSINESS_DEACTIVATION_SUCCESSFUL, data, res);
    },
    (error) => {
      logger.error(req.logHandler, { EVENT : "DEACTIVATE BUSINESS ERROR" }, { MESSAGE : error.message });
      return UniversalFunc.sendError(error, res);
    }
  );
};

exports.addOrUpdateConfig = function (req, res) {
  ResellerController.addOrUpdateConfig(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      return UniversalFunc.sendSuccess(RESP.SUCCESS.ENTRY_EDIT_SUCCESSFULLY, data, res);
    },
    (error) => {
      logger.error(req.logHandler, { EVENT : "ADD OR UPDATE DEVICES ERROR" }, { MESSAGE : error.message });
      return UniversalFunc.sendError(error, res);
    }
  );
};

exports.resellerCreate = function (req, res) {
  ResellerController.create(req.logHandler, req.body, res);
};


exports.resellerUpdate = function (req, res) {
  req.body.files = req.files;
  ResellerController.update(req.logHandler, req.body, res);
};

exports.resellerDisable = function (req, res) {
  ResellerController.disable(req.logHandler, req.body, res);
};

exports.resellerInfo = function (req, res) {
  ResellerController.resellerInfo(req.logHandler, req.body, res);
};

//----------------------------------------------------------------------------
//                    MESSAGE APIs
//----------------------------------------------------------------------------

exports.sendMessage = function (req, res) {
  ChatController.sendMessage(req.logHandler, req.body);
  UniversalFunc.sendSuccess(RESP.SUCCESS.MESSAGE_RECEIVED, {}, res);
};

exports.sendMessageFromAgent = function (req, res) {
  ChatController.sendMessageFromAgent(req.logHandler, req.body);
  UniversalFunc.sendSuccess(RESP.SUCCESS.MESSAGE_RECEIVED, {}, res);
};

exports.sendServerMessage = function (req, res) {
  ChatController.sendServerMessage(req.logHandler, req.body);
  UniversalFunc.sendSuccess(RESP.SUCCESS.MESSAGE_RECEIVED, {}, res);
};

//----------------------------------------------------------------------------
//                    ALERT APIs
//----------------------------------------------------------------------------

exports.createAlert = function (req, res) {
  AlertController.createAlert(req.logHandler, req.body).then((data) => {
    logger.trace(req.logHandler, { RESPONSE : data });
    return UniversalFunc.sendSuccess(RESP.SUCCESS.ENTRY_ADDED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(req.logHandler, { EVENT : "createAlert" }, { MESSAGE : error.message });
    return UniversalFunc.sendError(error, res);
  });
};

exports.updateAlert = function (req, res) {
  AlertController.updateAlert(req.logHandler, req.body).then((data) => {
    logger.trace(req.logHandler, { RESPONSE : data });
    return UniversalFunc.sendSuccess(RESP.SUCCESS.UPDATED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(req.logHandler, { EVENT : "updateAlert" }, { MESSAGE : error.message });
    return UniversalFunc.sendError(error, res);
  });
};

exports.getAlert = function (req, res) {
  AlertController.getAlert(req.logHandler, req.body).then((data) => {
    logger.trace(req.logHandler, { RESPONSE : data });
    return UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(req.logHandler, { EVENT : "getAlert" }, { MESSAGE : error.message });
    return UniversalFunc.sendError(error, res);
  });
};

exports.closeAlert = function (req, res) {
  AlertController.closeAlert(req.logHandler, req.body).then((data) => {
    logger.trace(req.logHandler, { RESPONSE : data });
    return UniversalFunc.sendSuccess(RESP.SUCCESS.DEFAULT, data, res);
  }, (error) => {
    logger.error(req.logHandler, { EVENT : "closeAgent" }, { MESSAGE : error.message });
    return UniversalFunc.sendError(error, res);
  });
};

exports.getAllAlerts = function (req, res) {
  AlertController.getAllAlerts(req.logHandler, req.body).then((data) => {
    logger.trace(req.logHandler, { RESPONSE : data });
    return UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(req.logHandler, { EVENT : "getAllAlert" }, { MESSAGE : error.message });
    return UniversalFunc.sendError(error, res);
  });
};

exports.editAlertPriority = function (req, res) {
  AlertController.editAlertPriority(req.logHandler, req.body).then((data) => {
    logger.trace(req.logHandler, { RESPONSE : data });
    return UniversalFunc.sendSuccess(RESP.SUCCESS.UPDATED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(req.logHandler, { EVENT : "editAlertPriority" }, { MESSAGE : error.message });
    return UniversalFunc.sendError(error, res);
  });
};

exports.thirdPartyPublish = function (req, res) {
  let logHandler =  {
    apiModule  : "conversation",
    apiHandler : "thirdPartyPublish"
  };
  ChatController.thirdPartySendMessage(logHandler, req.body).then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    return UniversalFunc.sendSuccess(RESP.SUCCESS.MESSAGE_RECEIVED, data, res);
  }, (error) => {
    logger.error(logHandler, { EVENT : "thirdPartyPublish" }, { MESSAGE : error.message });
    return UniversalFunc.sendError(error, res);
  });
};


//----------------------------------------------------------------------------
//                    BILLING APIs
//----------------------------------------------------------------------------
exports.startAgentPlan = function (req, res) {
  BillingController.startAgentPlan(req.logHandler, req.body, res);
};

exports.addCard = function (req, res) {
  BillingController.addCard(req.logHandler, req.body, res);
};

exports.getCard = function (req, res) {
  BillingController.getCard(req.logHandler, req.body, res);
};

exports.editAgentPlan = function (req, res) {
  BillingController.editAgentPlan(req.logHandler, req.body, res);
};

exports.getBillingPlans = function (req, res) {
  BillingController.getBillingPlans(req.logHandler, req.body, res);
};

exports.getTransactions = function (req, res) {
  BillingController.getTransactions(req.logHandler, req.body, res);
};

exports.getBillingProperties = function (req, res) {
  BillingController.getBillingProperties(req.logHandler, req.body, res);
};


//----------------------------------------------------------------------------
//                    BILLING SUPER_ADMIN APIs
//----------------------------------------------------------------------------

exports.deductPayment = function (req, res) {
  BillingController.deductPayment(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      UniversalFunc.sendSuccess(RESP.SUCCESS.DEFAULT, data, res);
    },
    (error) => {
      logger.error(req.logHandler, error);
      UniversalFunc.sendError(error, res);
    }
  );
};


exports.runBilling = function (req, res) {
  BillingController.runBilling(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      UniversalFunc.sendSuccess(RESP.SUCCESS.DEFAULT, data, res);
    },
    (error) => {
      logger.error(req.logHandler, error);
      UniversalFunc.sendError(error, res);
    }
  );
};


exports.runDayEndTask = function (req, res) {
  BillingController.runDayEndTask(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      UniversalFunc.sendSuccess(RESP.SUCCESS.DEFAULT, data, res);
    },
    (error) => {
      logger.error(req.logHandler, error);
      UniversalFunc.sendError(error, res);
    }
  );
};


exports.getAllTransactions = function (req, res) {
  BillingController.getAllTransactions(req.logHandler, req.body, res);
};

// Super admin Login

exports.superAdminLogin = function (req, res) {
  SuperAdminController.superAdminLogin(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      UniversalFunc.sendSuccess(RESP.SUCCESS.DEFAULT, data, res);
    },
    (error) => {
      logger.error(req.logHandler, error);
      error = (error.errorResponse) ? error.errorResponse : error;
      UniversalFunc.sendError(error, res);
    }
  );
};


//----------------------------------------------------------------------------
//                    Fugu External APIs call
//----------------------------------------------------------------------------

exports.fuguExternalCreateConversation = function (req, res) {
  FuguController.fuguExternalCreateConversation(req.logHandler, req.body, res).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      return UniversalFunc.sendSuccess(RESP.SUCCESS.DEFAULT, data, res);
    },
    (error) => {
      logger.error(req.logHandler, { EVENT : "thirdPartyPublish" }, { MESSAGE : error.message });
      return UniversalFunc.sendError(error, res);
    }
  );
};


exports.thirdPartyPublish = function (req, res) {
  FuguController.thirdPartySendMessage(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      return UniversalFunc.sendSuccess(RESP.SUCCESS.MESSAGE_RECEIVED, data, res);
    },
    (error) => {
      logger.error(req.logHandler, { EVENT : "thirdPartyPublish" }, { MESSAGE : error.message });
      return UniversalFunc.sendError(error, res);
    }
  );
};

exports.fuguPutUserDetails = function (req, res) {
  FuguController.fuguPutUserDetails(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      return UniversalFunc.sendSuccess(RESP.SUCCESS.DEFAULT, data, res);
    },
    (error) => {
      logger.error(req.logHandler, { EVENT : "thirdPartyPublish" }, { MESSAGE : error.message });
      return UniversalFunc.sendError(error, res);
    }
  );
};

exports.fuguCreateConversation = function (req, res) {
  FuguController.fuguCreateConversation(req.logHandler, req.body).then(
    (data) => {
      logger.trace(req.logHandler, { RESPONSE : data });
      return UniversalFunc.sendSuccess(RESP.SUCCESS.DEFAULT, data, res);
    },
    (error) => {
      logger.error(req.logHandler, { EVENT : "thirdPartyPublish" }, { MESSAGE : error.message });
      return UniversalFunc.sendError(error, res);
    }
  );
};


exports.editFuguUserInfo = function (req, res) {
  let logHandler = req.logHandler;
  FuguController.editFuguUserInfo(logHandler, req.body).then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    return UniversalFunc.sendSuccess(RESP.SUCCESS.MESSAGE_RECEIVED, data, res);
  }, (error) => {
    logger.error(logHandler, { EVENT : "editFuguUserInfo" }, { MESSAGE : error.message });
    return UniversalFunc.sendError(error, res);
  });
};


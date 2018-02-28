/**
 * @module logging
 */
/*
 *
 *   LOGGING HANDLER FOR THE APIs
 *
 *   All the logging calls will be routed through this module
 *   to handle selective logging depending upon the module
 *   and the particular handler generating the log
 */
const    cache          = require('memory-cache');
const constants         = require('../Utils/constants');
const _                 = require('underscore');
const    utils          = require('../Controller/utils');
const winstonLogger     = require('../libs/winston_logger');

var levels = {
  trace : 0,
  debug : 1,
  info  : 2,
  warn  : 3,
  error : 4
};

var levelToWinstonLevel = {
  0 : 'verbose',
  1 : 'debug',
  2 : 'info',
  3 : 'warn',
  4 : 'error',
};

// pick this property from
var debuggingPermissions = {
  loggingEnabled      : true,
  globalLoggingLevel  : levels.info,
  defaultLoggingLevel : levels.trace,

  user : {
    loggingEnabled      : true,
    defaultLoggingLevel : levels.trace,

    userLogout           : true,
    getUsers             : false,
    getUserDetails       : false,
    putDetails           : false,
    editUserDetails      : false,
    getUserMessageStats  : false,
    editUserInfo         : true,
    getUserInfo          : false,
    getUserChannelsInfo  : false,
    getUserChannelInfo   : false,
    testPushNotification : true
  },
  channel : {
    loggingEnabled      : true,
    defaultLoggingLevel : levels.trace,

    getChannels          : false,
    editChannelPriority  : false,
    createChannels       : false,
    createChannelsV2     : false,
    editChannels         : false,
    editChannelsV2       : false,
    channelEnableDisable : false,
    editInfo             : true
  },
  agent : {
    loggingEnabled      : true,
    defaultLoggingLevel : levels.trace,

    agentLogin                : false,
    agentLogout               : false,
    getAgents                 : false,
    createAgents              : false,
    editAgent                 : false,
    agentEnableDisable        : false,
    assignAgent               : false,
    assignAgentv1             : false,
    revokeInvitation          : false,
    verifyToken               : true,
    resendInvitation          : false,
    registerAgent             : false,
    inviteAgent               : false,
    resetPasswordRequest      : false,
    resetPassword             : true,
    changePassword            : true,
    adminResetPasswordRequest : false,
    getAgentInfo              : false,
    otpLogin                  : true,
    agentLoginViaAuthToken    : true
  },
  conversation : {
    loggingEnabled      : false,
    defaultLoggingLevel : levels.trace,

    createConversation : false,
    getConversations   : true,
    getConversationsV1 : true,
    getMessages        : true,
    uploadFile         : false,
    getByLabelId       : false,
    markConversation   : false,
    markConversationv1 : false,
    searchUser         : false,
    thirdPartyPublish  : false
  },
  tags : {
    loggingEnabled      : false,
    defaultLoggingLevel : levels.trace,

    createTags          : false,
    getTags             : false,
    editTags            : false,
    getChannelTags      : false,
    assignTagsToChannel : false
  },
  business : {
    loggingEnabled      : true,
    defaultLoggingLevel : levels.trace,

    getBusinessInfo           : false,
    editBusinessInfo          : false,
    getBusinessConfiguration  : false,
    editBusinessConfiguration : false,
    addDevice                 : false,
    getDevices                : false,
    editDevice                : true,
    addCannedMessages         : false,
    getCannedMessages         : false,
    editCannedMessages        : false,
    signUp                    : true,
    getBusinessStats          : false,
    getAllBusinessStats       : false,
    editBusinessStats         : false
  },
  billing : {
    loggingEnabled      : true,
    defaultLoggingLevel : levels.trace,

    addCard            : true,
    getCard            : true,
    deductPayment      : true,
    editAgentPlan      : true,
    getBillingPlan     : true,
    runBilling         : true,
    runDayEndTask      : true,
    getTransactions    : true,
    getAllTransactions : true,
    getProperties      : false,
    startAgentPlan     : true
  },
  email : {
    loggingEnabled      : false,
    defaultLoggingLevel : levels.trace,

    entryEmail : false
  },
  cache : {
    loggingEnabled      : true,
    defaultLoggingLevel : levels.trace,

    buildcache : false
  },
  notifier : {
    loggingEnabled           : false,
    defaultLoggingLevel      : levels.trace,
    sendControlChannelPushes : true
  },
  chathandler : {
    loggingEnabled      : true,
    defaultLoggingLevel : levels.trace,

    handleChat          : false,
    handleSocket        : true,
    handlePublish       : false,
    checkSubscription   : false,
    controlChannel      : false,
    messageHistory      : false,
    channelStatus       : false,
    checkOnSubscription : false,
    saveTaggedUsers     : false
  },
  chat : {
    loggingEnabled      : true,
    defaultLoggingLevel : levels.trace,

    addChatMember    : false,
    removeChatMember : false,
    getChatMembers   : false,
    createGroupChat  : false,
    createO2OChat    : false,
    groupChatSearch  : false,
    leaveChat        : false,
    getChatGroups    : true,
    joinChat         : true
  },
  server : {
    loggingEnabled      : true,
    defaultLoggingLevel : levels.trace,

    logger                : false,
    handleMessageWithFaye : true,
    heapdump              : false,
    validation            : false,
    handleMessage         : true,
    handlePush            : false,
    cacheReload           : true,
    fuguWinston           : false,
    logException          : false,
    logEdit               : false,
    email                 : false
  },
  reseller : {
    loggingEnabled      : true,
    defaultLoggingLevel : levels.trace,

    resellerPutUser    : false,
    getBusinessInfo    : true,
    assignReseller     : true,
    activateBusiness   : true,
    addOrUpdateConfig  : true,
    deactivateBusiness : true,
    create             : true,
    update             : true,
    disable            : true,
    getInfo            : true
  },
  mqHandler : {
    loggingEnabled      : true,
    defaultLoggingLevel : levels.trace,

    handleMqMessage : false
  },
  fugu : {
    loggingEnabled      : true,
    defaultLoggingLevel : levels.trace,

    sendMessage                    : true,
    sendMessageFromAgent           : false,
    fuguExternalCreateConversation : false,
    thirdPartyPublish              : false,
    putUser                        : true,
    createConversation             : true,
    sendServerMessage              : true,
    editFuguUserInfo               : true
  },
  alert : {
    loggingEnabled      : false,
    defaultLoggingLevel : levels.trace,

    getAlert             : false,
    markAlert            : false,
    createAlert          : false,
    updateAlert          : false,
    closeAlert           : false,
    getAllAlert          : false,
    getAlertByIdentifier : false,
    initiallizeWidget    : false
  },
  cron : {
    loggingEnabled      : true,
    defaultLoggingLevel : levels.trace,

    dayEndTask   : true,
    monthEndTask : true
  },
  superAdmin : {
    loggingEnabled      : true,
    defaultLoggingLevel : levels.trace,

    superAdminLogin  : true,
    getBusinessStats : true
  }
};

exports.levels           = levels;
exports.levelToWinstonLevel = levelToWinstonLevel;
exports.trace            = trace;
exports.debug            = debug;
exports.info             = info;
exports.warn             = warn;
exports.error            = error;
exports.logDatabaseQuery = logDatabaseQuery;
exports.logFileWrite     = logFileWrite;
exports.logFileRead      = logFileRead;
exports.logRequest       = logRequest;
exports.logResponse      = logResponse;
exports.logErrorResponse = logErrorResponse;
exports.logError         = logError;




// A variadic function to log the stuff
function log(loggingLevel, loggingParameters) {
  let handlingInfo = loggingParameters[0];
  let apiModule    = handlingInfo.apiModule;
  let apiHandler   = handlingInfo.apiHandler;

  // winston logging
  winstonLogger.log(loggingLevel, loggingParameters);


  // rest of the logging
  let defaultLoggingLevel = debuggingPermissions[apiModule].defaultLoggingLevel;
  if(loggingLevel !== levels.error && loggingLevel < debuggingPermissions.globalLoggingLevel && (!isLoggingEnabled(apiModule, apiHandler))) {
    return;
  }

  let stream = process.stdout;
  if(loggingLevel === levels.error) {
    stream = process.stderr;
  }
  let requestId = handlingInfo.uuid ? ' - ' + handlingInfo.uuid : '';
  let loggingTime = '[ ' + utils.getLoggingTime() + requestId + ' ] ';
  for (let i = 1; i < loggingParameters.length; i++) {
    stream.write(loggingTime + apiModule + ' ::: ' + apiHandler + ' ::: ' + JSON.stringify(loggingParameters[i]) + '\n');
  }
}


function trace(/* arguments */) {
  log(levels.trace, arguments);
}

function debug(/* arguments */) {
  log(levels.debug, arguments);
}

function info(/* arguments */) {
  log(levels.info, arguments);
}

function warn(/* arguments */) {
  log(levels.warn, arguments);
}

function error(/* arguments */) {
  log(levels.error, arguments);
}

// use this once execution
function logError(logHandler, message, error) {
  const stream = process.stderr;
  let data = "";
  data += ' ::: ' + '\t' + JSON.stringify(logHandler) + '\t';
  data += ' ::: ' + '\t' + JSON.stringify({ ERROR : message }) + '\t';
  data += ' ::: ' + '\t' + JSON.stringify(error) + '\n';
  data += ' ::: ' + '\t' + " Stack trace : [" + error.stack + ' ] \n';

  stream.write(data);
}

function logDatabaseQuery(message, query, result, error) {
  if(!arguments[0].apiModule) {
    console.error("handler not passed ", new Error("handler not passed ").stack);
    return;
  }
  let logHandler = arguments[0];
  message = arguments[1];
  query = arguments[2];
  result = arguments[3];
  error = arguments[4];

  if((typeof error !== 'undefined') && (error != null)) {
    module.exports.error(logHandler, {
      event        : message, error        : error, query        : query,  query_result : result
    });
  } else {
    module.exports.trace(logHandler, { event : message, query : query,  query_result : result });
  }
}



// function logSendingEmail(logHandler, mailOptions, error, response)

function logFileWrite(logHandler, filename, error) {
  if(error) {
    module.exports.error(logHandler, { FILENAME : filename }, { ERROR : error });
  } else {
    module.exports.trace(logHandler, { FILENAME : filename }, { ERROR : error });
  }
}

function logFileRead(logHandler, filename, error, data) {
  if(error) {
    module.exports.error(logHandler, { FILENAME : filename }, { ERROR : error });
  } else {
    module.exports.trace(logHandler, { FILENAME : filename }, { ERROR : error });
  }
}

function logRequest(logHandler, request) {
  module.exports.trace(logHandler, { REQUEST : request });
}

function logResponse(logHandler, response) {
  module.exports.trace(logHandler, { RESPONSE : response });
}

function logErrorResponse(logHandler, response) {
  module.exports.error(logHandler, { RESPONSE : response });
}



function isLoggingEnabled(module, handler) {
  let logPermission;
  if(_.isEmpty(cache.get(constants.cache.SERVER_LOGGING))) {
    cache.put(constants.cache.SERVER_LOGGING, debuggingPermissions);
  }
  logPermission = cache.get(constants.cache.SERVER_LOGGING);

  // Check if the logging has been enabled
  if(!logPermission.loggingEnabled) {
    return false;
  }

  // Check if the logging has been enabled for the complete module
  if(!logPermission[module].loggingEnabled) {
    return false;
  }

  // Check if the logging has been enabled for the particular handler function for the module
  if(!logPermission[module][handler]) {
    return false;
  }

  return true;
}

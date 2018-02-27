
const async                         = require('async');
const Joi                           = require('joi');
const _                             = require('underscore');
const Promise                       = require('bluebird');
const config                        = require('config');
const RESP                          = require('../Config').responseMessages;
const Controller                    = require('../Controller').userController;
const UniversalFunc                 = require('../Utils/universalFunctions');
const utils                         = require('../Controller/utils');
const logger                        = require('../Routes/logging');
const constants                     = require('../Utils/constants');
const dbHandler                     = require('../database').dbHandler;
const utilityService                = require('../services/utility');
const agentService                  = require('../services/agent');
const userService                   = require('../services/user');
const businessService               = require('../services/business');
const billingService                = require('../services/billing');
const authService                   = require('../services/auth');
const superAdminService             = require('../services/superAdmin');

/** @namespace Joi.string */
/** @namespace Joi.boolean */
/** @namespace Joi.number */
/** @namespace Joi.array */
/** @namespace Joi.validate */
/** @namespace Joi.object */
/** @namespace Promise.promisify */
/** @namespace Promise.coroutine */


const joiObject = Joi.object().keys({
  app_version : Joi.any().optional(),
  device_type : Joi.number().valid(constants.validDeviceTypes).optional()
});

const joiEmail = Joi.string().trim().email({ minDomainAtoms : constants.MIN_DOTAT, tldWhitelist : ['+'] }).max(constants.EMAIL_MAX_SIZE);


Joi.string().hexColor =  function () {
  let opts = {};
  return this._test('hexColor', opts, function (value, state, options) {
    if(utils.isHexaColor(value)) {
      return value;
    }
    return this.createError('string.hex', { value }, state, options);
  });
};
//--------------------------------------------------------------
//                     USER APIs
//--------------------------------------------------------------


exports.userLogout = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "user",
    apiHandler : "userLogout"
  };

  logger.trace(req.logHandler, { REQUEST : req.body });
  const schema = joiObject.keys({
    app_secret_key : Joi.string().required(),
    user_id        : Joi.number().positive().required(),
    device_id      : Joi.string().optional()
  });
  replaceBusinessKey(req);

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    next();
  }
};

exports.getUsers = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "user",
    apiHandler : "getUsers"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token   : Joi.string().required(),
    anonymous_only : Joi.boolean().optional(),
    page_start     : Joi.number().positive().optional().default(1),
    page_end       : Joi.number().positive().optional()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.getUserDetails = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "user",
    apiHandler : "getUserDetails"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    business_id  : Joi.number().positive().optional(),
    user_id      : Joi.number().positive().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.getUserInfo = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "user",
    apiHandler : "getUserInfo"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    app_secret_key : Joi.string().required(),
    en_user_id     : Joi.string().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    req.body.user_id = utils.decryptText(req.body.en_user_id);
    if(!utils.isValidInteger(req.body.user_id)) {
      return UniversalFunc.sendError(new Error("Invalid parameter en_user_id"), res);
    }
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.getUserChannelsInfo = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "user",
    apiHandler : "getUserChannelsInfo"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    app_secret_key : Joi.string().required(),
    en_user_id     : Joi.string().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    req.body.user_id = utils.decryptText(req.body.en_user_id);
    if(!utils.isValidInteger(req.body.user_id)) {
      return UniversalFunc.sendError(new Error("Invalid parameter en_user_id"), res);
    }
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.getUserChannelInfo = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "user",
    apiHandler : "getUserChannelInfo"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    app_secret_key : Joi.string().required(),
    en_user_id     : Joi.string().required(),
    channel_id     : Joi.number().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    req.body.user_id = utils.decryptText(req.body.en_user_id);
    if(!utils.isValidInteger(req.body.user_id)) {
      return UniversalFunc.sendError(new Error("Invalid parameter en_user_id"), res);
    }
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.putUserDetails = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "user",
    apiHandler : "putDetails"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });
  replaceBusinessKey(req);

  if(secretKeyOnly(req, res) && putUserDetailsCommon(req, res)) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.editUserDetailsValidation = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "user",
    apiHandler : "editUserDetails"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    user_id      : Joi.number().positive().required(),
    email        : Joi.string().trim().email({ minDomainAtoms : constants.MIN_DOTAT }).max(constants.EMAIL_MAX_SIZE).optional(),
    phone_number : Joi.string().optional()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.editUserInfo = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "user",
    apiHandler : "editUserInfo"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const emptySchema = Joi.object().keys({}).unknown(true);
  const schema = joiObject.keys({
    app_secret_key     : Joi.string().required(),
    en_user_id         : Joi.string().required(),
    mute_channel_id    : Joi.number().positive().optional(),
    unmute_channel_id  : Joi.number().positive().optional(),
    notification_level : Joi.string().valid(constants.validPushNotificationLevels).optional(),
    user_properties    : emptySchema
  });

  if(utils.isString(req.body.user_properties)) {
    if(!utils.validStringifiedJson(req.logHandler, req.body.user_properties)) {
      return UniversalFunc.sendError(new Error("Invalid user_properties"), res);
    }
    req.body.user_properties = utils.jsonParse(req.body.user_properties);
  }

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    req.body.user_id = utils.decryptText(req.body.en_user_id);
    if(!utils.isValidInteger(req.body.user_id)) {
      return UniversalFunc.sendError(new Error("Invalid parameter en_user_id"), res);
    }
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.getUserMessageStats = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "user",
    apiHandler : "getUserMessageStats"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    shared_secret   : Joi.string().required(),
    user_unique_key : Joi.string().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    next();
  }
};

exports.testPushNotification = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "user",
    apiHandler : "testPushNotification"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    app_secret_key : Joi.string().required(),
    en_user_id     : Joi.string().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    req.body.user_id = utils.decryptText(req.body.en_user_id);
    if(!utils.isValidInteger(req.body.user_id)) {
      return UniversalFunc.sendError(new Error("Invalid parameter en_user_id"), res);
    }
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

//--------------------------------------------------------------
//                     CHANNEL APIs
//--------------------------------------------------------------


exports.getChannels = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "channel",
    apiHandler : "getChannels"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    app_secret_key : Joi.string().optional(),
    access_token   : Joi.string().optional(),
    business_id    : Joi.number().positive().optional()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.editChannelPriority = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "channel",
    apiHandler : "editChannelPriority"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  let joiKeys = Joi.object().keys({ channel_id : Joi.number().positive().required(), channel_priority : Joi.number().min(0).required() });
  const schema = joiObject.keys({
    access_token   : Joi.string().required(),
    priority_array : Joi.array().required().items(joiKeys)
  });

  let validFields = validateFields(req.body, res, schema);
  if(!validFields) {
    return;
  }

  if(utils.isString(req.body.priority_array)) {
    if(!utils.validStringifiedJson(req.logHandler, req.body.priority_array)) {
      return UniversalFunc.sendError(new Error("Invalid priority array"), res);
    }
    req.body.priority_array = utils.jsonParse(req.body.priority_array);
  }
  loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
};

exports.createChannelsV2 = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "channel",
    apiHandler : "createChannelsV2"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token    : Joi.string().required(),
    business_id     : Joi.number().positive().required(),
    channel_name    : Joi.string().required(),
    default_message : Joi.string().required(),
    channel_image   : Joi.any().optional()
  });

  let validFields = validateFields(req.body, res, schema);
  if(!validFields) {
    return;
  }

  if(utils.isString(req.body.custom_attributes)) {
    if(!utils.validStringifiedJson(req.logHandler, req.body.custom_attributes)) {
      return UniversalFunc.sendError(new Error("Invalid custom attributes"), res);
    }
    req.body.custom_attributes = utils.jsonParse(req.body.custom_attributes);
  }

  loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
};

exports.editChannelsV2 = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "channel",
    apiHandler : "editChannelsV2"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token    : Joi.string().required(),
    business_id     : Joi.number().positive().required(),
    channel_id      : Joi.number().positive().required(),
    channel_image   : Joi.any().optional(),
    channel_name    : Joi.string().optional(),
    default_message : Joi.string().optional(),
    remove_image    : Joi.boolean().optional()
  });

  let validFields = validateFields(req.body, res, schema);
  if(!validFields) {
    return;
  }

  if(req.body.attributes && (_.isEmpty(req.body.attributes) || utils.isString(req.body.attributes))) {
    return UniversalFunc.sendError(new Error("Invalid attributes"), res);
  }

  loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
};

exports.editInfo = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "channel",
    apiHandler : "editInfo"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    app_secret_key : Joi.string().required(),
    en_user_id     : Joi.string().required(),
    channel_id     : Joi.number().positive().required(),
    channel_image  : Joi.any().optional(),
    custom_label   : Joi.string().optional()
  });

  let validFields = validateFields(req.body, res, schema);
  if(!validFields) {
    return;
  }

  loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
};

exports.channelEnableDisable = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "channel",
    apiHandler : "channelEnableDisable"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    business_id  : Joi.number().positive().required(),
    channel_id   : Joi.number().positive().required(),
    status       : Joi.number().required().valid(0, 1) // 1-ENABLE 0-DISABLE
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};


//--------------------------------------------------------------
//                     AGENT APIs
//--------------------------------------------------------------


exports.agentLoginValidation = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "agent",
    apiHandler : "agentLogin"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    email        : Joi.string().trim().email({ minDomainAtoms : constants.MIN_DOTAT }).max(constants.EMAIL_MAX_SIZE).optional(),
    password     : Joi.string().trim().min(6).optional(),
    access_token : Joi.string().optional(),
    device_token : Joi.string().optional(),
    web_token    : Joi.string().optional(),
    device_id    : Joi.string().optional()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    next();
  }
};

exports.agentLoginViaAuthTokenValidation = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "agent",
    apiHandler : "agentLoginViaAuthToken"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    auth_token : Joi.string().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    next();
  }
};

exports.agentLogoutValidation = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "agent",
    apiHandler : "agentLogout"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });
  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    device_id    : Joi.string().optional()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.getAgents = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "agent",
    apiHandler : "getAgents"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  if(tokenOnly(req, res)) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.getAgentInfo = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "agent",
    apiHandler : "getAgentInfo"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    user_id      : Joi.number().positive().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.editAgent = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "agent",
    apiHandler : "editAgent"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token       : Joi.string().required(),
    business_id        : Joi.number().positive().optional(),
    user_id            : Joi.number().positive().required(),
    full_name          : Joi.string().optional(),
    status             : Joi.number().valid(0, 1).optional(), // 0-inactive,1-active
    agent_type         : Joi.number().valid(constants.validUserSubTypes).optional(), // 11 agent 13 admin
    phone_number       : Joi.string().optional(),
    web_token          : Joi.string().optional(),
    online_status      : Joi.string().valid(constants.validOnlineStatuses).optional(),
    assign_to_agent_id : Joi.number().optional(),
    tags_to_add        : Joi.array().items(Joi.number().optional()).optional(),
    tags_to_remove     : Joi.array().items(Joi.number().optional()).optional(),
    device_id          : Joi.string().optional()
  });

  let validFields = validateFields(req.body, res, schema);
  if(!validFields) {
    return;
  }

  if(req.files && req.files.length > 0) {
    let supportedFileTypes = new Set(constants.fileTypes.image);
    if(!supportedFileTypes.has(req.files[0].mimetype)) {
      return UniversalFunc.sendError(new Error("Invalid file type, file not supported " + req.files[0].mimetype), res);
    }
  }

  loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
};

exports.agentEnableDisableValidation = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "agent",
    apiHandler : "agentEnableDisable"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    business_id  : Joi.number().required(),
    user_id      : Joi.number().positive().required(),
    status       : Joi.number().valid(0, 1).required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.assignAgent = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "agent",
    apiHandler : "assignAgent"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    channel_id   : Joi.number().positive().required(),
    user_id      : Joi.number().positive().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.assignAgentV1 = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "agent",
    apiHandler : "assignAgentv1"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    channel_ids  : Joi.array().required().items(Joi.number().positive().required()),
    user_id      : Joi.number().positive().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(utils.isString(req.body.channel_ids)) {
    req.body.channel_ids = utils.jsonParse(req.body.channel_ids);
  }
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.inviteAgent = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "agent",
    apiHandler : "inviteAgent"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  let emails = req.body.emails;
  req.body.emails = utils.isString(emails) ? utils.jsonParse(emails) : emails;
  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    agent_type   : Joi.number().valid(constants.validUserSubTypes).required(),
    emails       : Joi.array().required().items(Joi.string().trim().email({ minDomainAtoms : constants.MIN_DOTAT }).max(constants.EMAIL_MAX_SIZE).required())
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.resendInvitation = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "agent",
    apiHandler : "resendInvitation"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token        : Joi.string().required(),
    invited_agent_email : Joi.string().trim().email({ minDomainAtoms : constants.MIN_DOTAT }).max(constants.EMAIL_MAX_SIZE).required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.revokeInvitation = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "agent",
    apiHandler : "revokeInvitation"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token        : Joi.string().required(),
    invited_agent_email : Joi.string().trim().email({ minDomainAtoms : constants.MIN_DOTAT }).max(constants.EMAIL_MAX_SIZE).required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.verifyToken = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "agent",
    apiHandler : "verifyToken"
  };
  logger.trace(req.logHandler, { REQUEST : req.query });

  const schema = joiObject.keys({
    email_token          : Joi.string().optional(),
    reset_password_token : Joi.string().optional(),
  });

  let validFields = validateFields(req.query, res, schema);
  if(validFields) {
    next();
  }
};

exports.otpLogin = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "agent",
    apiHandler : "otpLogin"
  };
  logger.trace(req.logHandler, { REQUEST : req.query });

  const schema = joiObject.keys({
    otp_token : Joi.string().required()
  });

  let validFields = validateFields(req.query, res, schema);
  if(validFields) {
    next();
  }
};

exports.registerAgent = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "agent",
    apiHandler : "registerAgent"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    email_token         : Joi.string().required(),
    invited_agent_email : Joi.string().trim().email({ minDomainAtoms : constants.MIN_DOTAT }).max(constants.EMAIL_MAX_SIZE).required(),
    password            : Joi.string().trim().min(6).required(),
    full_name           : Joi.string().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    next();
  }
};

exports.resetPasswordRequest = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "agent",
    apiHandler : "resetPasswordRequest"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    agent_email : Joi.string().trim().email({ minDomainAtoms : constants.MIN_DOTAT }).max(constants.EMAIL_MAX_SIZE).required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    next();
  }
};

exports.resetPassword = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "agent",
    apiHandler : "resetPassword"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    reset_password_token : Joi.string().required(),
    agent_email          : Joi.string().trim().email({ minDomainAtoms : constants.MIN_DOTAT }).max(constants.EMAIL_MAX_SIZE).required(),
    new_password         : Joi.string().trim().min(6).required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    next();
  }
};

exports.changePassword = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "agent",
    apiHandler : "changePassword"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token  : Joi.string().required(),
    old_password  : Joi.string().required(),
    new_password  : Joi.string().trim().min(6).required(),
    refresh_token : Joi.string().optional()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.adminResetPasswordRequest = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "agent",
    apiHandler : "adminResetPasswordRequest"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    agent_email  : Joi.string().trim().email({ minDomainAtoms : constants.MIN_DOTAT }).max(constants.EMAIL_MAX_SIZE).required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};


//--------------------------------------------------------------
//                     CONVERSATION APIs
//--------------------------------------------------------------


exports.createConversation = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "conversation",
    apiHandler : "createConversation"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  replaceBusinessKey(req);
  if(tokenOrSecretKey(req, res) && createConversationCommon(req, res)) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.getConversations = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "conversation",
    apiHandler : "getConversations"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });
  replaceBusinessKey(req);

  const schema = joiObject.keys({
    app_secret_key : Joi.string().optional(),
    access_token   : Joi.string().optional(),
    en_user_id     : Joi.string().optional(),
    type           : Joi.array().optional().items(Joi.number().optional().valid(0, 1, 2, 3, 10)), // 0-ALL TYPE CHATS 1-MY 2-UNASSIGNED 3-ALL
    status         : Joi.array().optional().items(Joi.number().optional().valid(1, 2)),
    page_start     : Joi.number().optional(),
    page_end       : Joi.number().optional(),
    label          : Joi.array().optional().items(Joi.number().optional()),
    channel_filter : Joi.array().optional().items(Joi.number().optional())
  });

  if(!req.body.user_id && !req.body.en_user_id) {
    return UniversalFunc.sendError(new Error("Required parameter en_user_id"), res);
  }
  if(req.body.en_user_id) {
    req.body.user_id = utils.decryptText(req.body.en_user_id);
    if(!utils.isValidInteger(req.body.user_id)) {
      return UniversalFunc.sendError(new Error("Invalid parameter en_user_id"), res);
    }
  }

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.getConversationsV1 = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "conversation",
    apiHandler : "getConversationsV1"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    app_secret_key : Joi.string().optional(),
    access_token   : Joi.string().optional(),
    user_id        : Joi.number().positive().required(),
    type           : Joi.array().optional().items(Joi.number().optional().valid(0, 1, 2, 3, 10)), // 0-ALL TYPE CHATS 1-MY 2-UNASSIGNED 3-ALL
    status         : Joi.array().optional().items(Joi.number().optional().valid(1, 2)),
    page_start     : Joi.number().positive().optional(),
    page_end       : Joi.number().positive().optional(),
    label          : Joi.array().optional().items(Joi.number().optional()),
    channel_filter : Joi.array().optional().items(Joi.number().optional()),
    search_user_id : Joi.number().optional()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.conversationSearch = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "conversation",
    apiHandler : "searchUser"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    search_text  : Joi.string().required().min(3)
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.getMessages = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "conversation",
    apiHandler : "getMessages"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });
  replaceBusinessKey(req);

  const schema = joiObject.keys({
    app_secret_key : Joi.string().optional(),
    access_token   : Joi.string().optional(),
    channel_id     : Joi.number().positive().required(),
    en_user_id     : Joi.string().optional(),
    page_start     : Joi.number().optional(),
    page_end       : Joi.number().optional(),
    custom_label   : Joi.string().optional()
  });

  if(!req.body.user_id && !req.body.en_user_id) {
    return UniversalFunc.sendError(new Error("Required parameter en_user_id"), res);
  }
  if(req.body.en_user_id) {
    req.body.user_id = utils.decryptText(req.body.en_user_id);
    if(!req.body.user_id) {
      return UniversalFunc.sendError(new Error("Invalid parameter en_user_id"), res);
    }
  }


  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.uploadFileValidation = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "conversation",
    apiHandler : "uploadFile"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });
  replaceBusinessKey(req);

  const schema = joiObject.keys({
    access_token   : Joi.string().optional(),
    app_secret_key : Joi.string().optional(),
    file_type      : Joi.string().optional()
  }).unknown(true);

  let validFields = validateFields(req.body, res, schema);
  if(!validFields) {
    return;
  }

  let supportedFileTypes = new Set(constants.fileTypes.image.concat(constants.fileTypes.file));
  if(!req.files && req.files.length < 0) {
    return UniversalFunc.sendError(new Error("Invalid file type, no file found"), res);
  }

  if(!supportedFileTypes.has(req.files[0].mimetype)) {
    return UniversalFunc.sendError(new Error("Invalid file type, file not supported " + req.files[0].mimetype), res);
  }

  loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
};

exports.getByLabelId = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "conversation",
    apiHandler : "getByLabelId"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });
  replaceBusinessKey(req);

  const schema = joiObject.keys({
    app_secret_key : Joi.string().required(),
    label_id       : Joi.number().positive().required(),
    en_user_id     : Joi.string().optional(),
    page_start     : Joi.number().positive().optional(),
    page_end       : Joi.number().positive().optional()
  });

  if(!req.body.user_id && !req.body.en_user_id) {
    return UniversalFunc.sendError(new Error("Required parameter en_user_id"), res);
  }
  if(req.body.en_user_id) {
    req.body.user_id = utils.decryptText(req.body.en_user_id);
    if(!req.body.user_id) {
      return UniversalFunc.sendError(new Error("Invalid parameter en_user_id"), res);
    }
  }

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.markConversation = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "conversation",
    apiHandler : "markConversation"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().optional(),
    channel_id   : Joi.number().positive().required(),
    user_id      : Joi.number().positive().required(),
    status       : Joi.number().required().valid(1, 2).description(" 1- Open, 2-Closed")
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.markConversationV1 = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "conversation",
    apiHandler : "markConversationv1"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().optional(),
    channel_ids  : Joi.array().required().items(Joi.number().required()),
    user_id      : Joi.number().positive().required(),
    status       : Joi.number().required().valid(1, 2).description(" 1- Open, 2-Closed")
  });

  let validFields = validateFields(req.body, res, schema);
  if(utils.isString(req.body.channel_ids)) {
    req.body.channel_ids = utils.jsonParse(req.body.channel_ids);
  }
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

//--------------------------------------------------------------
//                     TAG APIs
//--------------------------------------------------------------


exports.createTags = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "tags",
    apiHandler : "createTags"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    tag_name     : Joi.string().required(),
    color_code   : Joi.string().hexColor().optional()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.getTags = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "tags",
    apiHandler : "getTags"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  if(tokenOnly(req, res)) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.editTags = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "tags",
    apiHandler : "editTags"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    tag_id       : Joi.number().positive().required(),
    color_code   : Joi.string().hexColor().required(),
    tag_name     : Joi.string().required(),
    status       : Joi.number().valid(0, 1).optional()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.getChannelTags = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "tags",
    apiHandler : "getChannelTags"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    channel_id   : Joi.number().positive().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.assignTagsToChannel = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "tags",
    apiHandler : "assignTagsToChannel"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    tag_id       : Joi.number().positive().required(),
    channel_id   : Joi.number().positive().required(),
    status       : Joi.number().valid(0, 1).required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.enableDisableTag = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "tags",
    apiHandler : "enableDisableTag"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    tag_id       : Joi.number().positive().required(),
    is_enabled   : Joi.number().required().valid(0, 1)
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};


//--------------------------------------------------------------
//                     BUSINESS APIs
//--------------------------------------------------------------

exports.getBusinessConfiguration = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "business",
    apiHandler : "getBusinessConfiguration"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  if(tokenOrSecretKey(req, res)) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.editBusinessConfiguration = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "business",
    apiHandler : "editBusinessConfiguration"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  if(tokenOnly(req, res)) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.getDevices = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "business",
    apiHandler : "getDevices"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  if(tokenOnly(req, res)) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.addDevice = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "business",
    apiHandler : "addDevice"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    app_name     : Joi.string().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.editDevice = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "business",
    apiHandler : "editDevice"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    app_name     : Joi.string().optional(),
    api_key      : Joi.string().optional(),
    topic        : Joi.string().optional(),
    passphrase   : Joi.string().optional(),
    app_type     : Joi.number().required()
  });

  req.api_key      = (req.api_key)      ? req.api_key.trim()      : req.api_key;
  req.topic        = (req.topic)        ? req.topic.trim()        : req.topic;

  let validFields = validateFields(req.body, res, schema);
  if(!validFields) {
    return;
  }

  if(req.files && req.files.length > 0) {
    if(req.files[0].mimetype != 'application/x-x509-ca-cert') {
      return UniversalFunc.sendError(new Error("Invalid file type " + req.files[0].mimetype), res);
    }
  }
  loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
};

exports.addBusinessCannedMessages = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "business",
    apiHandler : "addBusinessCannedMessages"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    title        : Joi.string().required(),
    message      : Joi.string().required(),
    sku          : Joi.string().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.getBusinessCannedMessages = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "business",
    apiHandler : "getBusinessCannedMessages"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    sku          : Joi.string().optional(),
    title        : Joi.string().optional()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.editBusinessCannedMessages = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "business",
    apiHandler : "editBusinessCannedMessages"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token   : Joi.string().required(),
    message_id     : Joi.number().positive().required(),
    title          : Joi.string().optional(),
    message        : Joi.string().optional(),
    sku            : Joi.string().optional(),
    delete_message : Joi.number().allow(0, 1).description("1 Delete Message").optional()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.signUpValidation = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "business",
    apiHandler : "signUp"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const emptySchema = Joi.object().keys({}).unknown(true);
  const schema = joiObject.keys({
    business_name  : Joi.string().optional(),
    full_name      : Joi.string().required(),
    email          : Joi.string().trim().email({ minDomainAtoms : constants.MIN_DOTAT }).max(constants.EMAIL_MAX_SIZE).required(),
    password       : Joi.string().trim().min(6).required(),
    contact_number : Joi.string().required(),
    config         : emptySchema
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    req.body.ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    next();
  }
};

exports.getBusinessInfo = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "business",
    apiHandler : "getBusinessInfo"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.editBusinessInfo = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "business",
    apiHandler : "editBusinessInfo"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token        : Joi.string().required(),
    business_name       : Joi.string().optional(),
    address             : Joi.string().optional(),
    city                : Joi.string().optional(),
    pincode             : Joi.string().optional(),
    contact_number      : Joi.string().optional(),
    contact_person      : Joi.string().optional(),
    custom_notification : Joi.number().optional()
  });

  let validFields = validateFields(req.body, res, schema);
  if(!validFields) {
    return;
  }

  let supportedFileTypes = new Set(constants.fileTypes.image);
  if(req.files && req.files.length > 0) {
    if(!supportedFileTypes.has(req.files[0].mimetype)) {
      return UniversalFunc.sendError(new Error("Invalid file type, file not supported " + req.files[0].mimetype), res);
    }
  }
  loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
};


exports.getBusinessStats = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "business",
    apiHandler : "getBusinessStats"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    business_id  : Joi.number().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    checkSuperAdminToken(req, res, next);
  }
};

exports.getAllBusinessStats = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "business",
    apiHandler : "getAllBusinessStats"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    checkSuperAdminToken(req, res, next);
  }
};


exports.editBusinessStats = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "business",
    apiHandler : "editBusinessStats"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  if(tokenOrSecretKey(req, res)) {
    checkSuperAdminToken(req, res, next);
  }
};

//--------------------------------------------------------------
//                     SERVER APIs
//--------------------------------------------------------------

exports.entryEmail = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "email",
    apiHandler : "entryEmail"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  next();
};

exports.heapDump = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "server",
    apiHandler : "heapDump"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  next();
};

exports.logEdit = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "server",
    apiHandler : "logEdit"
  };
  logger.info(req.logHandler, { REQUEST : req.body });

  next();
};

exports.handleMessage = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "server",
    apiHandler : "handlePush"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  next();
};

// TODO : refactor
exports.handleMessageWithFaye = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "server",
    apiHandler : "handleMessageWithFaye"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  next();
};

exports.handlePush = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "server",
    apiHandler : "handlePush"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  next();
};

exports.cacheReload = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "server",
    apiHandler : "cacheReload"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  next();
};

exports.logException = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "server",
    apiHandler : "logException"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  if(tokenOrSecretKey(req, res)) {
    const emptySchema = Joi.object().keys({}).unknown(true);
    const schema = joiObject.keys({
      device_details : emptySchema,
      error          : emptySchema
    }).unknown(true);

    let validFields = validateFields(req.body, res, schema);
    if(!validFields) {
      return;
    }

    if(_.isEmpty(req.body.device_details) || _.isEmpty(req.body.error)) {
      return UniversalFunc.sendError(new Error("invalid device details or error "), res);
    }
    if(utils.isString(req.body.device_details)) {
      if(!utils.validStringifiedJson(req.logHandler, req.body.device_details)) {
        return UniversalFunc.sendError(new Error("Invalid device details"), res);
      }
      req.body.device_details = utils.jsonParse(req.body.device_details);
    }
    if(utils.isString(req.body.error)) {
      if(!utils.validStringifiedJson(req.logHandler, req.body.error)) {
        return UniversalFunc.sendError(new Error("Invalid error"), res);
      }
      req.body.error = utils.jsonParse(req.body.error);
    }
    next();
  }
};


//--------------------------------------------------------------
//                     RESELLER APIs
//--------------------------------------------------------------


exports.resellerPutUserDetails = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "reseller",
    apiHandler : "resellerPutUser"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    reseller_token : Joi.string().required(),
    reference_id   : Joi.number().positive().required()
  }).unknown(true);

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    if(putUserDetailsCommon(req, res)) {
      checkResellerToken(req, res, req.logHandler, next);
    }
  }
};

exports.createReseller = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "reseller",
    apiHandler : "create"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = Joi.object().keys({
    access_token : Joi.string().required(),
    email        : Joi.string().trim().email({ minDomainAtoms : constants.MIN_DOTAT }).max(constants.EMAIL_MAX_SIZE).required(),
    name         : Joi.string().required(),
    phone_no     : Joi.string().optional(),
    api_key      : Joi.string().optional(),
    certificate  : Joi.string().optional(),
    topic        : Joi.string().optional()
  }).unknown(true);

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    checkSuperAdminToken(req, res, next);
  }
};

exports.updateReseller = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "reseller",
    apiHandler : "update"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    reseller_token : Joi.string().required(),
    name           : Joi.string().optional(),
    phone_no       : Joi.string().optional(),
    api_key        : Joi.string().optional(),
    certificate    : Joi.string().optional(),
    topic          : Joi.string().optional()
  });

  let validFields = validateFields(req.body, res, schema);
  if(!validFields) {
    return;
  }

  if(req.files && req.files.length > 0) {
    if(req.files[0].mimetype != 'application/x-x509-ca-cert') {
      return UniversalFunc.sendError(new Error("Invalid file type " + req.files[0].mimetype), res);
    }
  }
  checkResellerToken(req, res, req.logHandler, next);
};

exports.disableReseller = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "reseller",
    apiHandler : "disable"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = Joi.object().keys({
    access_token : Joi.string().required(),
    email        : Joi.string().trim().email({ minDomainAtoms : constants.MIN_DOTAT }).max(constants.EMAIL_MAX_SIZE).required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    checkSuperAdminToken(req, res, next);
  }
};

exports.resellerInfo = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "reseller",
    apiHandler : "getInfo"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = Joi.object().keys({
    access_token  : Joi.string().required(),
    email         : Joi.string().trim().email({ minDomainAtoms : constants.MIN_DOTAT }).max(constants.EMAIL_MAX_SIZE).required(),
    refresh_token : Joi.number().optional()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    checkSuperAdminToken(req, res, next);
  }
};

exports.assignReseller = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "reseller",
    apiHandler : "assignReseller"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = Joi.object().keys({
    access_token   : Joi.string().required(),
    reference_id   : Joi.number().required(),
    reseller_email : Joi.string().trim().email({ minDomainAtoms : constants.MIN_DOTAT }).max(constants.EMAIL_MAX_SIZE).required(),
    business_email : Joi.string().trim().email({ minDomainAtoms : constants.MIN_DOTAT }).max(constants.EMAIL_MAX_SIZE).required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    checkSuperAdminToken(req, res, next);
  }
};

exports.activateBusiness = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "reseller",
    apiHandler : "activateBusiness"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const emptySchema = Joi.object().keys({}).unknown(true);
  const schema = joiObject.keys({
    reseller_token      : Joi.string().required(),
    reference_id        : Joi.number().positive().required(),
    business_name       : Joi.string().optional(),
    full_name           : Joi.string().required(),
    email               : Joi.string().trim().email({ minDomainAtoms : constants.MIN_DOTAT }).max(constants.EMAIL_MAX_SIZE).required(),
    contact_number      : Joi.string().optional(),
    custom_notification : Joi.number().valid(0, 1).description("0 default, 1 enable").optional(),
    disable_autopilot   : Joi.boolean().optional(),
    password            : Joi.string().optional(),
    config              : emptySchema
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    req.body.ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    checkResellerToken(req, res, req.logHandler, next);
  }
};

exports.resellerBusinessInfo = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "reseller",
    apiHandler : "getBusinessInfo"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  if(validateResellerBusiness(req, res)) {
    checkResellerToken(req, res, req.logHandler, next);
  }
};

exports.deactivateBusiness = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "reseller",
    apiHandler : "deactivateBusiness"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  if(validateResellerBusiness(req, res)) {
    checkResellerToken(req, res, req.logHandler, next);
  }
};

exports.addOrUpdateConfig = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "reseller",
    apiHandler : "addOrUpdateConfig"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const deviceSchema = Joi.object().keys({
    app_type    : Joi.number().positive().required(),
    app_name    : Joi.string().required(),
    api_key     : Joi.string().optional(),
    certificate : Joi.string().optional(),
    topic       : Joi.string().optional()
  });
  const schema = joiObject.keys({
    reseller_token   : Joi.string().required(),
    reference_id     : Joi.number().positive().required(),
    business_devices : Joi.array().optional().items(deviceSchema),
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    checkResellerToken(req, res, req.logHandler, next);
  }
};

exports.resellerValidation = function (req, res, next) {
  const schema = joiObject.keys({
    reseller_token : Joi.string().required(),
    reference_id   : Joi.number().required()
  }).unknown(true);

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    checkResellerToken(req, res, req.logHandler, next);
  }
};

exports.createBusinessValidate = function (req, res, next) {
  const schema = joiObject.keys({
    access_token   : Joi.string().required(),
    business_name  : Joi.string().required(),
    contact_number : Joi.string().required(),
    email          : Joi.string().trim().email({ minDomainAtoms : constants.MIN_DOTAT }).max(constants.EMAIL_MAX_SIZE).required(),
    option         : Joi.string().required()

  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    next();
  }
};


//--------------------------------------------------------------
//                     ALERT APIs
//--------------------------------------------------------------


exports.createAlert = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "alert",
    apiHandler : "createAlert"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = Joi.object().keys({
    access_token  : Joi.string().required(),
    alert_content : Joi.string().required(),
    type          : Joi.number().required().valid(1, 2, 3),
    mandatory     : Joi.number().required().valid(0, 1),
    alert_color   : Joi.string().required(),
    description   : Joi.string().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    checkSuperAdminToken(req, res, next);
  }
};

exports.updateAlert = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "alert",
    apiHandler : "updateAlert"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = Joi.object().keys({
    access_token  : Joi.string().required(),
    alert_id      : Joi.number().required(),
    alert_content : Joi.string().optional(),
    type          : Joi.number().optional().valid(constants.validDeviceTypes),
    mandatory     : Joi.number().optional().valid(0, 1),
    identifier    : Joi.string().optional(),
    alert_color   : Joi.string().optional(),
    is_enabled    : Joi.number().optional().valid(0, 1),
    description   : Joi.string().optional()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    checkSuperAdminToken(req, res, next);
  }
};

exports.getAlert = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "alert",
    apiHandler : "getAlert"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.closeAlert = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "alert",
    apiHandler : "closeAlert"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    alert_id     : Joi.number().positive().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.getAllAlerts = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "alert",
    apiHandler : "getAllAlerts"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = Joi.object().keys({
    access_token : Joi.string().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    checkSuperAdminToken(req, res, next);
  }
};

exports.editAlertPriority = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "alert",
    apiHandler : "editAlertPriority"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  let joiKeys = Joi.object().keys({ alert_id : Joi.number().positive().required(), priority : Joi.number().positive().required() });
  const schema = Joi.object().keys({
    access_token   : Joi.string().required(),
    priority_array : Joi.array().items(joiKeys)
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};


//--------------------------------------------------------------
//                     MESSAGE / EXTERNAL / FUGU APIs
//--------------------------------------------------------------

exports.fuguPutUserDetails = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "fugu",
    apiHandler : "putUser"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  if(putUserDetailsCommon(req, res)) {
    checkValidComponent(req, res, next);
  }
};

exports.fuguCreateConversation = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "fugu",
    apiHandler : "createConversation"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    user_id : Joi.number().positive().required(),
    tags    : Joi.array().required().items(Joi.string().required())
  }).unknown(true);

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    checkValidComponent(req, res, next);
  }
};

exports.fuguExternalCreateConversation = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "fugu",
    apiHandler : "fuguExternalCreateConversation"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const emptySchema = Joi.object().keys({}).unknown(true);
  const schema = joiObject.keys({
    business_id           : Joi.number().required(),
    shared_secret_key     : Joi.string().required(),
    chat_type             : Joi.number().required(),
    label_id              : Joi.number().optional(),
    tags                  : Joi.array().optional().items(Joi.string().required()),
    custom_label          : Joi.string().optional(),
    user_unique_key       : Joi.string().required(),
    transaction_id        : Joi.string().required(),
    source                : Joi.number().optional().valid(constants.validSources),
    source_type           : Joi.number().optional(),
    user_first_messages   : Joi.array().optional().items(Joi.string().required()),
    other_user_unique_key : Joi.array().optional().items(Joi.string().required()),
    custom_attributes     : emptySchema
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    next();
  }
};

exports.thirdPartyPublish = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "fugu",
    apiHandler : "thirdPartyPublish"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });
  next();
};



exports.sendMessage = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "fugu",
    apiHandler : "sendMessage"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const dataSchema = Joi.object().keys({
    message : Joi.string().required()
  });
  const schema = joiObject.keys({
    channel_id : Joi.number().positive().required(),
    user_id    : Joi.number().positive().required(),
    data       : dataSchema
  }).unknown(true);

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    checkValidComponent(req, res, next);
  }
};

// TODO : refactor
exports.sendMessageFromAgent = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "fugu",
    apiHandler : "sendMessageFromAgent"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
};

exports.sendServerMessage = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "fugu",
    apiHandler : "sendServerMessage"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const dataSchema = Joi.object().required({
    message : Joi.string().required()
  });
  const schema = joiObject.keys({
    channel_id : Joi.number().positive().required(),
    data       : dataSchema
  }).unknown(true);

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    checkValidComponent(req, res, next);
  }
};


exports.editFuguUserInfo = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "fugu",
    apiHandler : "editFuguUserInfo"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    app_secret_key  : Joi.string().required(),
    component_key   : Joi.string().required(),
    user_unique_key : Joi.string().required(),
    email           : Joi.string().trim().email({ minDomainAtoms : constants.MIN_DOTAT }).max(constants.EMAIL_MAX_SIZE).optional().default(" "),
    full_name       : Joi.string().optional().default(constants.anonymousUserName),
    phone_number    : Joi.string().optional().default(" "),
    user_image_url  : Joi.string().optional(),
    status          : Joi.number().optional().valid("1", "0")
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};


//--------------------------------------------------------------
//                    FUGU CHAT APIs
//--------------------------------------------------------------


exports.groupChatSearch = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "chat",
    apiHandler : "groupChatSearch"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    app_secret_key : Joi.string().required(),
    en_user_id     : Joi.string().required(),
    search_text    : Joi.string().required().min(3)
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.getChatGroups = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "chat",
    apiHandler : "getChatGroups"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    app_secret_key : Joi.string().required(),
    en_user_id     : Joi.string().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.createGroupChat = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "chat",
    apiHandler : "createGroupChat"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    app_secret_key  : Joi.string().required(),
    en_user_id      : Joi.string().required(),
    user_ids_to_add : Joi.array().items(Joi.number().positive().required()).required(),
    custom_label    : Joi.string().required(),
    intro_message   : Joi.string().required(),
    chat_type       : Joi.number().valid([constants.chatType.PRIVATE_GROUP, constants.chatType.PUBLIC_GROUP]).optional()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};


exports.createO2OChat = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "chat",
    apiHandler : "createO2OChat"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    app_secret_key    : Joi.string().required(),
    en_user_id        : Joi.string().required(),
    chat_with_user_id : Joi.number().positive().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.getChatMembers = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "chat",
    apiHandler : "getChatMembers"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token   : Joi.string().optional(),
    user_id        : Joi.number().optional(),
    app_secret_key : Joi.string().optional(),
    en_user_id     : Joi.string().optional(),
    channel_id     : Joi.number().positive().required()
  });

  if(req.body.app_secret_key && !req.body.en_user_id) {
    return UniversalFunc.sendError(new Error("required parameter en_user_id"), res);
  }
  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.addChatMember = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "chat",
    apiHandler : "addChatMember"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token    : Joi.string().optional(),
    app_secret_key  : Joi.string().optional(),
    user_id         : Joi.number().optional(),
    en_user_id      : Joi.string().optional(),
    user_ids_to_add : Joi.array().items(Joi.number().positive().required()).required(),
    channel_id      : Joi.number().positive().required()
  });

  if(req.body.app_secret_key && !req.body.en_user_id) {
    return UniversalFunc.sendError(new Error("required parameter en_user_id"), res);
  }
  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.removeChatMember = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "chat",
    apiHandler : "removeChatMember"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    app_secret_key    : Joi.string().optional(),
    access_token      : Joi.string().optional(),
    user_id           : Joi.number().optional(),
    en_user_id        : Joi.string().optional(),
    user_id_to_remove : Joi.number().positive().required(),
    channel_id        : Joi.number().positive().required()
  });

  if(req.body.app_secret_key && !req.body.en_user_id) {
    return UniversalFunc.sendError(new Error("required parameter en_user_id"), res);
  }
  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.joinChat = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "chat",
    apiHandler : "joinChat"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    app_secret_key : Joi.string().required(),
    en_user_id     : Joi.string().required(),
    channel_id     : Joi.number().positive().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};


exports.leaveChat = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "chat",
    apiHandler : "leaveChat"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    app_secret_key : Joi.string().required(),
    en_user_id     : Joi.string().required(),
    channel_id     : Joi.number().positive().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};



//--------------------------------------------------------------
//                     BILLING VALIDATIONS
//--------------------------------------------------------------


exports.startAgentPlan = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "billing",
    apiHandler : "startAgentPlan"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });



  const schema = joiObject.keys({
    access_token             : Joi.string().required(),
    agent_count              : Joi.number().positive().required(),
    stripe_token             : Joi.string().required(),
    to_be_disabled_agent_ids : Joi.array().items(Joi.number().optional()).optional(),
    to_be_revoked_invite_ids : Joi.array().items(Joi.number().optional()).optional()
  });



  let validFields = validateFields(req.body, res, schema);

  let agent_ids = req.body.to_be_disabled_agent_ids;
  req.body.to_be_disabled_agent_ids = utils.isString(agent_ids) ? utils.jsonParse(agent_ids) : agent_ids;

  let invite_ids = req.body.to_be_revoked_invite_ids;
  req.body.to_be_revoked_invite_ids = utils.isString(invite_ids) ? utils.jsonParse(invite_ids) : invite_ids;

  if(validFields) {
    checkIfAccessTokenValidInAuth(req.logHandler, req.body, (err) => {
      if(err) {
        logger.error(req.logHandler, { Validation_Error : err });
        if(err.invalid_token_access_denied) {
          return UniversalFunc.sendError(RESP.ERROR.eng.INVALID_TOKEN_ACCESS_DENIED, res);
        }
        return UniversalFunc.sendError(err, res);
      }
      next();
    });
  }
};


exports.addCard = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "billing",
    apiHandler : "addCard"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    access_token : Joi.string().required(),
    stripe_token : Joi.string().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    checkIfAccessTokenValidInAuth(req.logHandler, req.body, (err) => {
      if(err) {
        logger.error(req.logHandler, { Validation_Error : err });
        if(err.invalid_token_access_denied) {
          return UniversalFunc.sendError(RESP.ERROR.eng.INVALID_TOKEN_ACCESS_DENIED, res);
        }
        return UniversalFunc.sendError(err, res);
      }
      next();
    });
  }
};

exports.getCard = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "billing",
    apiHandler : "getCard"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  if(tokenOnly(req, res)) {
    checkIfAccessTokenValidInAuth(req.logHandler, req.body, (err) => {
      if(err) {
        logger.error(req.logHandler, { Validation_Error : err });
        if(err.invalid_token_access_denied) {
          return UniversalFunc.sendError(RESP.ERROR.eng.INVALID_TOKEN_ACCESS_DENIED, res);
        }
        return UniversalFunc.sendError(err, res);
      }
      next();
    });
  }
};




exports.editAgentPlan = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "billing",
    apiHandler : "editAgentPlan"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });
  const schema = joiObject.keys({
    access_token             : Joi.string().required(),
    agent_count              : Joi.number().positive().required(),
    to_be_disabled_agent_ids : Joi.array().items(Joi.number().optional()).optional(),
    to_be_revoked_invite_ids : Joi.array().items(Joi.number().optional()).optional()
  });

  let validFields = validateFields(req.body, res, schema);

  let agent_ids = req.body.to_be_disabled_agent_ids;
  req.body.to_be_disabled_agent_ids = utils.isString(agent_ids) ? utils.jsonParse(agent_ids) : agent_ids;

  let invite_ids = req.body.to_be_revoked_invite_ids;
  req.body.to_be_revoked_invite_ids = utils.isString(invite_ids) ? utils.jsonParse(invite_ids) : invite_ids;

  if(validFields) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};


exports.getBillingPlans = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "billing",
    apiHandler : "getBillingPlans"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  if(tokenOnly(req, res)) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};

exports.getTransactions = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "billing",
    apiHandler : "getTransactions"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  if(tokenOnly(req, res)) {
    loginUsingAccessTokenOrAppSecretKey(req, res, req.logHandler, next);
  }
};


exports.getBillingProperties = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "billing",
    apiHandler : "getProperties"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  if(tokenOnly(req, res)) {
    loginUsingAccessTokenOrAppSecretKeyWithoutTrialExpiryCheck(req, res, req.logHandler, next);
  }
};


exports.deductPayment = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "billing",
    apiHandler : "deductPayment"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    admin_token      : Joi.string().required(),
    business_id      : Joi.number().positive().required(),
    billing_amount   : Joi.number().positive().required(),
    comment          : Joi.string().required(),
    transaction_type : Joi.string().valid(constants.validBillingTransactionTypes).required(),
    transaction_name : Joi.string().required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    next();
  }
};

exports.runBilling = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "billing",
    apiHandler : "runBilling"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = Joi.object().keys({
    access_token : Joi.string().required(),
    business_id  : Joi.number().positive().optional(),
    month        : Joi.number().min(1).max(12).required(),
    year         : Joi.number().min(2017).max(2050).required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    checkSuperAdminToken(req, res, next);
  }
};

exports.runDayEndTask = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "billing",
    apiHandler : "runDayEndTask"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = Joi.object().keys({
    access_token       : Joi.string().required(),
    plan_created_after : Joi.date().iso().max('now').min('2017-12-01').required()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    checkSuperAdminToken(req, res, next);
  }
};


exports.getAllTransactions = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "billing",
    apiHandler : "getAllTransactions"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = Joi.object().keys({
    access_token : Joi.string().required(),
    business_id  : Joi.number().positive().optional()
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    checkSuperAdminToken(req, res, next);
  }
};

//--------------------------------------------------------------
//                     COMMON VALIDATIONS
//--------------------------------------------------------------


function putUserDetailsCommon(req, res) {
  const emptySchema = Joi.object().keys({}).unknown(true);
  const schema = joiObject.keys({
    device_id             : Joi.string().required(),
    device_key            : Joi.string().optional(),
    device_token          : Joi.string().optional(),
    user_unique_key       : Joi.string().optional(),
    email                 : Joi.string().trim().email({ minDomainAtoms : constants.MIN_DOTAT }).max(constants.EMAIL_MAX_SIZE).optional().default(" "),
    full_name             : Joi.string().optional().default(constants.anonymousUserName),
    phone_number          : Joi.string().optional().default(" "),
    device_details        : Joi.string().optional().description(`{"Operating System": "Android","Model":"Mi 5","App Version Code":303,"Manufacturer":"Xiaomi","Screen width":1080,"etc_key":"etc_data"}`),
    custom_attributes     : emptySchema, // Joi.string().optional().description(`{"size":"1000px","color":"red","etc_key","etc_data"}`),
    app_type              : Joi.number().optional().description("1- DEFAULT, rest mutiple apps"),
    attributes            : emptySchema,
    neglect_conversations : Joi.boolean().optional(),
    user_image            : Joi.string().optional(),
    web_token             : Joi.string().optional()
  }).unknown(true);

  let validFields = validateFields(req.body, res, schema);
  if(!validFields) {
    return false;
  }

  if(req.body.attributes && _.isEmpty(req.body.attributes)) {
    UniversalFunc.sendError(new Error("Invalid attributes"), res);
    return false;
  }
  if(utils.isString(req.body.attributes)) {
    if(!utils.validStringifiedJson(req.logHandler, req.body.attributes)) {
      UniversalFunc.sendError(new Error("Invalid attributes"), res);
      return false;
    }
    req.body.attributes = utils.jsonParse(req.body.attributes);
  }

  if(req.body.custom_attributes && _.isEmpty(req.body.custom_attributes)) {
    UniversalFunc.sendError(new Error("Invalid custom attributes"), res);
    return false;
  }
  if(utils.isString(req.body.custom_attributes)) {
    if(!utils.validStringifiedJson(req.logHandler, req.body.custom_attributes)) {
      UniversalFunc.sendError(new Error("Invalid custom attributes"), res);
      return false;
    }
    req.body.custom_attributes = utils.jsonParse(req.body.custom_attributes);
  }
  return true;
}

function createConversationCommon(req, res) {
  const emptySchema = Joi.object().keys({}).unknown(true);
  const schema = joiObject.keys({
    app_secret_key        : Joi.string().optional(),
    chat_type             : Joi.number().optional(),
    access_token          : Joi.string().optional(),
    en_user_id            : Joi.string().optional(),
    label_id              : Joi.number().optional(),
    tags                  : Joi.array().optional().items(Joi.string().required()),
    custom_label          : Joi.string().optional(),
    other_user_id         : Joi.array().optional().items(Joi.number().required()), // old p2p
    user_unique_key       : Joi.string().optional().allow(""),
    other_user_unique_key : Joi.array().optional().items(Joi.string().required()),
    transaction_id        : Joi.string().optional(),
    initiator_agent_id    : Joi.number().optional(),
    source                : Joi.number().optional().valid(constants.validSources),
    source_type           : Joi.number().optional(),
    bot_default_message   : Joi.string().optional(),
    user_first_messages   : Joi.array().optional().items(Joi.string().required()),
    custom_attributes     : emptySchema
  }).unknown(true);

  if(!req.body.user_id && !req.body.en_user_id) {
    UniversalFunc.sendError(new Error("Required parameter en_user_id"), res);
    return false;
  }
  if(req.body.en_user_id) {
    req.body.user_id = utils.decryptText(req.body.en_user_id);
    if(!req.body.user_id) {
      UniversalFunc.sendError(new Error("Invalid parameter en_user_id"), res);
      return false;
    }
  }

  let validFields = validateFields(req.body, res, schema);
  if(utils.isString(req.body.tags)) {
    req.body.tags = utils.jsonParse(req.body.tags);
  }
  if(req.body.custom_attributes && _.isEmpty(req.body.custom_attributes)) {
    UniversalFunc.sendError(new Error("Invalid custom attributes"), res);
    return false;
  }

  return validFields;
}

function validateResellerBusiness(req, res) {
  const schema = joiObject.keys({
    reseller_token : Joi.string().required(),
    reference_id   : Joi.number().required()
  });

  return validateFields(req.body, res, schema);
}


//--------------------------------------------------------------
//                     GENERIC VALIDATIONS
//--------------------------------------------------------------


exports.empty = function (req, res, next) {
  next();
};

exports.checkAppVersion = function (req, res, next) {
  let logHandler = req.logHandler;
  Promise.coroutine(function* () {
    let appVersion = req.body.app_version;
    let version = {};
    let deviceType = 0;
    if(req.body.device_type) {
      deviceType = req.body.device_type;
    } else if(req.body.userInfo) {
      deviceType = req.body.userInfo.device_type;
    }

    if(!appVersion || deviceType == 0) {
      req.body.version = version;
      return {};
    }
    let versionDetails = yield utilityService.getAppVersion(logHandler, constants.enumDeviceType[deviceType]);
    if(!_.isEmpty(versionDetails)) {
      version.latest_version    = versionDetails.latest_version;
      version.current_version   = appVersion;
      version.text              = versionDetails.text;
      version.download_link     = versionDetails.download_link;
      version.is_force          = 0;

      if(appVersion < versionDetails.critical_version) {
        version.is_force        = 1;
      }
    }
    logger.trace(logHandler, { EVENT : "checkAppVersion", VERSION : version });
    req.body.version = version;
    return {};
  })().then(
    (data) => {
      logger.trace(logHandler, { EVENT : "checkAppVersion", RESULT : data });
      next();
    },
    (error) => {
      logger.error(logHandler, { EVENT : "checkAppVersion", ERROR : error });
      next();
    }
  );
};




// TODO : remove temporary
function replaceBusinessKey(req) {
}

//--------------------------------------------------------------
//                     Auth using token or secret key
//-------------------------------------------------------------

function tokenOnly(req, res) {
  const schema = joiObject.keys({
    access_token : Joi.string().required()
  }).unknown(true);

  req.access_token   = (req.access_token)   ? req.access_token.trim()   : req.access_token;

  let validFields = validateFields(req.body, res, schema);
  if(!validFields) {
    return false;
  }

  if(req.body.app_secret_key) {
    UniversalFunc.sendError(new Error("App secret key not allowed"), res);
    return false;
  }
  return true;
}

function secretKeyOnly(req, res) {
  const schema = joiObject.keys({
    app_secret_key : Joi.string().required()
  }).unknown(true);

  req.app_secret_key   = (req.app_secret_key)   ? req.app_secret_key.trim()   : req.app_secret_key;

  let validFields = validateFields(req.body, res, schema);
  if(!validFields) {
    return false;
  }

  if(req.body.access_token) {
    UniversalFunc.sendError(new Error("Access token not allowed"), res);
    return false;
  }
  return true;
}

function tokenOrSecretKey(req, res) {
  const schema = joiObject.keys({
    access_token   : Joi.string().optional(),
    app_secret_key : Joi.string().optional()
  }).unknown(true);

  req.access_token   = (req.access_token)   ? req.access_token.trim()   : req.access_token;
  req.app_secret_key = (req.app_secret_key) ? req.app_secret_key.trim() : req.app_secret_key;

  return validateFields(req.body, res, schema);
}

const validateFields = function (req, res, schema) {
  const validation = Joi.validate(req, schema);
  if(validation.error) {
    let errorName = validation.error.name;
    let errorReason =
      validation.error.details !== undefined
        ? validation.error.details[0].message
        : 'Parameter missing or parameter type is wrong';
    UniversalFunc.sendError(new Error(errorName + ' ' + errorReason), res);
    return false;
  }
  return true;
};

const loginUsingAccessTokenOrAppSecretKey = function (req, res, logHandler, next) {
  if(!accessTokenOrAppSecretKey(req, res)) { return; }
  let asyncTasks = [];
  let opts = req.body;

  if(opts.app_secret_key && opts.access_token) {
    return UniversalFunc.sendError(RESP.ERROR.eng.INVALID_PARAMETERS, res);
  }

  utils.isDefined(opts.app_secret_key)
    ? asyncTasks.push(checkIfAppSecretKeyValid.bind(null, logHandler, opts))
    : asyncTasks.push(checkIfAccessTokenValid.bind(null, logHandler, opts));


  async.series(asyncTasks, (error) => {
    if(error) {
      logger.error(logHandler, { Validation_Error : error });
      if(error.invalid_token_access_denied) {
        return UniversalFunc.sendError(RESP.ERROR.eng.INVALID_TOKEN_ACCESS_DENIED, res);
      }
      if(error.errorResponse) {
        return UniversalFunc.sendError(error.errorResponse, res);
      }
      return UniversalFunc.sendError(error, res);
    }
    next();
  });
};

const loginUsingAccessTokenOrAppSecretKeyWithoutTrialExpiryCheck = function (req, res, logHandler, next) {
  if(!accessTokenOrAppSecretKey(req, res)) { return; }
  let asyncTasks = [];
  let opts = req.body;

  if(opts.app_secret_key && opts.access_token) {
    return UniversalFunc.sendError(RESP.ERROR.eng.INVALID_PARAMETERS, res);
  }

  utils.isDefined(opts.app_secret_key)
    ? asyncTasks.push(checkIfAppSecretKeyValid.bind(null, logHandler, opts))
    : asyncTasks.push(checkIfAccessTokenValidWithoutTrialExpiryCheck.bind(null, logHandler, opts));

  async.series(asyncTasks, (error) => {
    if(error) {
      logger.error(logHandler, { Validation_Error : error });
      if(error.invalid_token_access_denied) {
        return UniversalFunc.sendError(RESP.ERROR.eng.INVALID_TOKEN_ACCESS_DENIED, res);
      }
      return UniversalFunc.sendError(error, res);
    }
    next();
  });
};



function accessTokenOrAppSecretKey(req, res) {
  if(req.body.app_secret_key) { return true; }
  if(req.body.access_token) { return true; }
  logger.error(req.logHandler, " Missing access token or secret key ", { request : req.body });
  UniversalFunc.sendError({ customMessage : " Missing access token or secret key " }, res);
  return false;
}

function checkIfAppSecretKeyValid(logHandler, opts, callback) {
  const app_secret_key = opts.app_secret_key;
  const en_user_id     = opts.en_user_id;
  let user_id          = opts.user_id;
  if(en_user_id) {
    user_id = utils.decryptText(en_user_id);
    if(!user_id) {
      return callback(new Error("Invalid parameter en_user_id"));
    }
    opts.user_id = user_id;
  }

  if(!utils.isDefined(app_secret_key)) {
    return callback(new Error("App secret key not passed"));
  }

  Promise.coroutine(function* () {
    opts.businessInfo      = yield businessService.getInfoUsingAppSecretKey(logHandler, { app_secret_key : app_secret_key });

    if(user_id) {
      let userInfo = yield userService.getInfo(logHandler, user_id);
      if(!userInfo.length) {
        throw new Error("Invalid user id : " + user_id);
      }
      if(userInfo[0].user_type != constants.userType.CUSTOMER) {
        throw new Error("Invalid user id : " + user_id + ", user is not customer");
      }
      if(userInfo[0].status == constants.userStatus.DISABLE) {
        throw new Error("user is disabled ");
      }
      opts.userInfo = userInfo[0];
    }
    return opts;
  })().then((data) => {
    callback(null);
  }, (error) => {
    callback(error);
  });
}

function checkIfAccessTokenValid(logHandler, opts, callback) {
  const access_token = opts.access_token;
  if(!utils.isDefined(access_token)) {
    return callback(new Error("Access token not passed "));
  }

  Promise.coroutine(function* () {
    let agentInfo = yield agentService.getInfo(logHandler, { access_token : access_token });
    if(!agentInfo.length) {
      let error = new Error("Session Expired, Please Login Again");
      error.errorResponse = RESP.ERROR.eng.INVALID_TOKEN_ACCESS_DENIED;
      throw error;
    }
    if(agentInfo[0].status != constants.userStatus.ENABLE) {
      let error = new Error("Agent account disabled");
      error.errorResponse = RESP.ERROR.eng.ACCOUNT_BLOCKED;
      throw error;
    }
    agentInfo = agentInfo[0];
    opts.userInfo        = agentInfo;
    opts.businessInfo    = yield businessService.getInfo(logHandler, { business_id : agentInfo.business_id });
    if(utils.equalsIgnoreCase(opts.businessInfo.email, opts.userInfo.email)) {
      opts.userInfo.businessOwner = true;
    }

    let expiry_date      = yield billingService.getTrialExpiryDate(logHandler, agentInfo.business_id);
    if(!_.isEmpty(expiry_date) &&  expiry_date[0].expiry_date && utils.compareDate(new Date(), expiry_date[0].expiry_date) == 1) {
      let error = new Error("Free Trial expired");
      error.errorResponse = RESP.ERROR.eng.TRIAL_EXPIRED;
      if(opts.userInfo.businessOwner) {
        error.errorResponse = RESP.ERROR.eng.TRIAL_EXPIRED_OWNER;
      }
      throw error;
    }


    return opts;
  })().then((data) => {
    callback(null);
  }, (error) => {
    callback(error);
  });
}


function checkIfAccessTokenValidWithoutTrialExpiryCheck(logHandler, opts, callback) {
  const access_token = opts.access_token;
  if(!utils.isDefined(access_token)) {
    return callback(new Error("Access token not passed "));
  }

  Promise.coroutine(function* () {
    let agentInfo = yield agentService.getInfo(logHandler, { access_token : access_token });
    if(!agentInfo.length) {
      let error = new Error("Session Expired, Please Login Again");
      error.invalid_token_access_denied = true;
      throw error;
    }
    agentInfo = agentInfo[0];
    opts.userInfo        = agentInfo;
    opts.businessInfo    = yield businessService.getInfo(logHandler, { business_id : agentInfo.business_id });
    if(utils.equalsIgnoreCase(opts.businessInfo.email, opts.userInfo.email)) {
      opts.userInfo.businessOwner = true;
    }

    return opts;
  })().then((data) => {
    callback(null);
  }, (error) => {
    callback(error);
  });
}



function checkIfAccessTokenValidInAuth(logHandler, opts, callback) {
  const access_token = opts.access_token;
  if(!utils.isDefined(access_token)) {
    return callback(new Error("Access token not passed "));
  }

  Promise.coroutine(function* () {
    let agentInfo = yield agentService.getInfo(logHandler, { access_token : access_token });
    if(_.isEmpty(agentInfo)) {
      let error = new Error("Session Expired, Please Login Again");
      error.invalid_token_access_denied = true;
      throw error;
    }
    agentInfo = agentInfo[0];

    let businessOwnerData = yield businessService.syncAndGetBusinessOwner(logHandler, agentInfo.business_id);
    if(businessOwnerData.access_token != access_token) {
      logger.error(logHandler, "refreshed access token did not match");
      let error = new Error("Session Expired, Please Login Again");
      error.invalid_token_access_denied = true;
      throw error;
    }
    opts.userInfo               = agentInfo;
    opts.businessInfo           = yield businessService.getInfo(logHandler, { business_id : agentInfo.business_id });
    opts.userInfo.auth_user_id  = businessOwnerData.auth_user_id;
    if(_.isEqual(opts.businessInfo.email, opts.userInfo.email)) {
      opts.userInfo.businessOwner = true;
    }

    return opts;
  })().then((data) => {
    callback(null);
  }, (error) => {
    callback(error);
  });
}

//--------------------------------------------------------------
//                     Super Admin
//-------------------------------------------------------------


function checkSuperAdminToken(req, res, next) {
  return new Promise((resolve, reject) => {
    let logHandler = req.logHandler;
    Promise.coroutine(function* () {
      let error = {};
      let userInfo = yield superAdminService.getInfoUsingEmailOrAccessToken(req.logHandler, { access_token : req.body.access_token });
      if(_.isEmpty(userInfo)) {
        error.errorResponse = RESP.ERROR.eng.INVALID_ACCESS_TOKEN;
        throw error;
      }
      let result = utils.compareDate(new Date(), userInfo[0].access_token_expiry_datetime);
      if(result != -1) {
        error.errorResponse = RESP.ERROR.eng.INVALID_ACCESS_TOKEN;
        throw error;
      }
      req.body.userInfo = userInfo[0];
      if(req.body.business_id) {
        req.body.businessInfo = yield businessService.getInfo(logHandler, req.body);
      }
      req.body.isSuperAdminRequest = 1;
    })().then((data) => {
      logger.trace(logHandler, { RESPONSE : data });
      next();
    }, (error) => {
      logger.error(logHandler, { EVENT : "Admin Access Token Validation Failed" }, { MESSAGE : error.message });
      error = (error.errorResponse) ? error.errorResponse : error;
      UniversalFunc.sendError(error, res);
    });
  });
}

exports.superAdminLoginValidation = function (req, res, next) {
  req.logHandler = {
    uuid       : req.uuid,
    apiModule  : "superAdmin",
    apiHandler : "superAdminLogin"
  };
  logger.trace(req.logHandler, { REQUEST : req.body });

  const schema = joiObject.keys({
    email        : Joi.string().trim().email({ minDomainAtoms : constants.MIN_DOTAT }).max(constants.EMAIL_MAX_SIZE).optional(),
    password     : Joi.string().trim().min(6).optional(),
    access_token : Joi.string().optional(),
    device_token : Joi.string().optional(),
    web_token    : Joi.string().optional(),
  });

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    next();
  }
};

//--------------------------------------------------------------
//                     Reseller Token
//-------------------------------------------------------------


const checkResellerToken = function (req, res, logHandler, next) {
  if(!req.body.reseller_token) {
    return UniversalFunc.sendError({ customMessage : " Missing reseller token " }, res);
  }
  fetchResellerDetails(logHandler, req.body.reseller_token)
    .then((result) => {
      if(!result.length) {
        return UniversalFunc.sendError(RESP.ERROR.eng.INVALID_RESELLER_TOKEN, res);
      }
      if(result[0].status == 0) {
        return UniversalFunc.sendError(RESP.ERROR.eng.RESELLER_DISABLED, res);
      }
      req.body.reseller_info = result[0];
      next();
    }, error => UniversalFunc.sendError(error, res));
};

function fetchResellerDetails(logHandler, token) {
  return new Promise((resolve, reject) => {
    let query = "select * from reseller_info where reseller_token = ? ";
    let queryObj = {
      query : query,
      args  : [token],
      event : "Validating reseller token"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}





//--------------------------------------------------------------
//                    Fugu Components
//-------------------------------------------------------------


function checkValidComponent(req, res, next) {
  const schema = joiObject.keys({
    component_key : Joi.string().required(),
    business_id   : Joi.number().positive().required(),
    source        : Joi.number().required().valid(constants.validSources),
    source_type   : Joi.number().positive().optional()
  }).unknown(true);

  let validFields = validateFields(req.body, res, schema);
  if(validFields) {
    checkComponentBusiness(req, res, req.logHandler, next);
  }
}

function checkComponentBusiness(req, res, logHandler, next) {
  if(!req.body.component_key) {
    return UniversalFunc.sendError({ customMessage : " Missing component key" }, res);
  }
  if(constants.keyToComponent[req.body.component_key]) {
    fetchBusinessDetails(logHandler, req.body.business_id)
      .then((result) => {
        if(!result.length) {
          return UniversalFunc.sendError(RESP.ERROR.eng.INVALID_BUSINESS_ID, res);
        }

        req.body.businessInfo = result[0];
        req.body.component = constants.keyToComponent[req.body.component_key];
        next();
      }, error => UniversalFunc.sendError(error, res));
  } else {
    return UniversalFunc.sendError(RESP.ERROR.eng.INVALID_COMPONENT_KEY, res);
  }
}

// TODO : use service layer
function fetchBusinessDetails(logHandler, business_id) {
  return new Promise((resolve, reject) => {
    let query = "select * from business_details where business_id = ? ";
    let queryObj = {
      query : query,
      args  : [business_id],
      event : "fetchBusinessDetails"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

/**
 * Created by ashishprasher on 31/08/17.
 */



const async                         = require('async');
const md5                           = require('MD5');
const bcrypt                        = require('bcryptjs');
const _                             = require('underscore');
const Promise                       = require('bluebird');
const config                        = require('config');

const saltRounds                    = 10;
const RESP                          = require('../Config').responseMessages;
const sendEmail                     = require('../Notification/email').sendEmailToUser;
const constants                     = require('../Utils/constants');
const utils                         = require('./utils');
const UniversalFunc                 = require('../Utils/universalFunctions');
const notification                  = require('../Controller/pushNotification');
const notificationBuilder           = require('../Builder/notification');
const logger                        = require('../Routes/logging');
const dbquery                       = require('../DAOManager/query');
const agentService                  = require('../services/agent');
const businessService               = require('../services/business');
const notifierService               = require('../services/notifier');
const tagService                    = require('../services/tags');
const channelService                = require('../services/channel');
const userService                   = require('../services/user');
const authService                   = require('../services/auth');
const utilityService                = require('../services/utility');
const billingService                = require('../services/billing');


exports.agentLoginEmail             = agentLoginEmail;
exports.agentLogout                 = agentLogout;
exports.getAgents                   = getAgents;
exports.inviteAgent                 = inviteAgent;
exports.resendInvitation            = resendInvitation;
exports.revokeInvitation            = revokeInvitation;
exports.verifyToken                 = verifyToken;
exports.registerAgent               = registerAgent;
exports.editAgent                   = editAgent;
exports.agentEnableDisable          = agentEnableDisable;
exports.assignAgent                 = assignAgent;
exports.resetPasswordRequest        = resetPasswordRequest;
exports.resetPassword               = resetPassword;
exports.changePassword              = changePassword;
exports.adminResetPasswordRequest   = adminResetPasswordRequest;
exports.getAgentInfo                = getAgentInfo;
exports.assignAgentV1               = assignAgentV1;
exports.otpLogin                    = otpLogin;
exports.agentLoginViaAuthToken      = agentLoginViaAuthToken;


function agentLoginEmail(logHandler, payload, res) {
  let loginViaAccessToken = (!payload.email);
  payload.email           = (payload.email) ? payload.email.toLowerCase() : undefined;
  payload.access_token    = (payload.access_token) ? payload.access_token : undefined;
  payload.token           = payload.device_token || payload.web_token;

  Promise.coroutine(function* () {
    if(!payload.access_token && !payload.email) {
      throw new Error("Both Email and Access token can't be empty");
    }
    let md5Password = (!loginViaAccessToken) ? md5(payload.password) : null;
    let error;


    let agentInfo = yield agentService.getInfoUsingEmailOrAccessToken(logHandler, payload);


    // nothing found in local db
    if(_.isEmpty(agentInfo)) {
      error = new Error("No agent found with given credentials");
      if(loginViaAccessToken) {
        error.errorResponse = RESP.ERROR.eng.INVALID_ACCESS_TOKEN;
        throw error;
      }

      let authUserDetails = yield authService.getAuthUserDetails(logHandler, { email : payload.email });
      if(_.isEmpty(authUserDetails)) {
        error.errorResponse = RESP.ERROR.eng.NOT_REGISTERED;
        throw error;
      }
      if(!_.isEqual(authUserDetails.password, md5Password)) {
        error.errorResponse = RESP.ERROR.eng.INVALID_PASSWORD;
        throw error;
      }

      // very rare create business flow
      let createPayload = {};
      createPayload.business_name  = authUserDetails.company_name || "";
      createPayload.email          = payload.email;
      createPayload.contact_number = authUserDetails.phone;
      createPayload.contact_person = payload.email;
      createPayload.full_name      = (authUserDetails.first_name || "") + (authUserDetails.last_name || "");
      createPayload.password       = authUserDetails.password;
      logger.error(logHandler, "business signup using agent login");
      yield businessService.createBusiness(logHandler, createPayload);
      agentInfo = yield agentService.getInfoUsingEmailOrAccessToken(logHandler, payload);
    }



    // agent found in local db
    agentInfo = agentInfo[0];
    let businessInfo = yield businessService.getInfo(logHandler, { business_id : agentInfo.business_id });


    // agent is owner of business
    if(utils.equalsIgnoreCase(agentInfo.email, businessInfo.email)) {
      agentInfo.businessOwner = true;
      let authUserDetails = yield authService.getAuthUserDetails(logHandler, { email : agentInfo.email });
      if(_.isEmpty(authUserDetails)) {
        error = new Error("Owner not found in auth");
        error.errorResponse = RESP.ERROR.eng.INVALID_CREDENTIALS;
        throw error;
      }
      agentInfo.password     = authUserDetails.password;
      agentInfo.access_token = authUserDetails.access_token;
    }


    // password and status validations
    if(!loginViaAccessToken && agentInfo.password != md5Password) {
      error = new Error("Password is incorrect");
      error.errorResponse = RESP.ERROR.eng.INVALID_PASSWORD;
      throw error;
    }
    if(agentInfo.status != constants.userStatus.ENABLE) {
      error = new Error("This account has been blocked");
      error.errorResponse = RESP.ERROR.eng.ACCOUNT_BLOCKED;
      throw error;
    }


    // notify agent login
    if(!loginViaAccessToken) {
      agentInfo.online_status = (agentInfo.user_sub_type != constants.userSubType.ADMIN) ?  constants.onlineStatus.AVAILABLE : constants.onlineStatus.AWAY;
      agentService.insertUserOnlineStatusLogs(logHandler, { user_id : agentInfo.user_id, online_status : agentInfo.online_status });
    }



    if(!loginViaAccessToken && !agentInfo.access_token) {
      agentInfo.access_token = bcrypt.hashSync(payload.email, saltRounds);
    }
    payload.password        = agentInfo.password;
    payload.online_status   = agentInfo.online_status;
    payload.access_token    = agentInfo.access_token;
    payload.user_id         = agentInfo.user_id;
    yield agentService.updateInfo(logHandler, payload);
    if(payload.token && payload.device_type && payload.device_id) {
      logger.error(logHandler, "Updating token : " + agentInfo.user_id);
      let userDeviceInfo = yield userService.getDeviceInfo(logHandler, payload, agentInfo);
      if(!userDeviceInfo.length) {
        yield userService.insertDeviceInfo(logHandler, payload, agentInfo);
      } else {
        yield userService.updateDeviceInfo(logHandler, payload, agentInfo);
      }
    }

    if(!loginViaAccessToken) {
      let agentLatestInfo = yield agentService.getAgentInfo(logHandler, payload);
      agentLatestInfo = utils.getSpecifiedKeyMapFromExistingMap(agentLatestInfo[0], constants.agentFayeKeys);
      notifierService.sendBusinessLevelNotification(businessInfo.app_secret_key, notificationBuilder.notificationType.AGENT_REFRESH, { agent_id : agentInfo.user_id, agent_info : agentLatestInfo });
    }

    let busIdPayload = { business_id : agentInfo.business_id };
    let tags = yield tagService.getTags(logHandler, busIdPayload.business_id);
    let defaultChannel = yield  tagService.getDefaultChannelList(logHandler, busIdPayload);
    let businessDetails = yield businessService.getConfiguration(logHandler, busIdPayload);

    let billingPlanExist = false;
    if(agentInfo.businessOwner) {
      let billingPlan = yield billingService.getBillingPlanDetails(logHandler, busIdPayload);
      if(!_.isEmpty(billingPlan)) {
        billingPlanExist = true;
      }
    }

    let result = {
      access_token      : agentInfo.access_token,
      app_secret_key    : businessInfo.app_secret_key,
      business_name     : businessInfo.business_name,
      user_id           : agentInfo.user_id,
      business_id       : agentInfo.business_id,
      user_name         : agentInfo.user_name,
      full_name         : agentInfo.full_name,
      email             : agentInfo.email,
      phone_number      : agentInfo.phone_number,
      user_channel      : utils.getSHAOfObject(agentInfo.user_id),
      tags              : tags,
      channel_filter    : defaultChannel,
      user_image        : agentInfo.user_image || "",
      agent_type        : agentInfo.user_sub_type,
      online_status     : agentInfo.online_status,
      business_property : businessDetails,
      business_owner    : (agentInfo.businessOwner),
      billing_plan      : billingPlanExist
    };


    logger.trace(logHandler, { EVENT : "Final response" }, { RESULT : result });
    result.version = payload.version;
    return result;
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.LOGGED_IN, data, res);
  }, (error) => {
    logger.error(logHandler, { EVENT : "AGENT LOGIN ERROR" }, { MESSAGE : error.message });
    error = (error.errorResponse) ? error.errorResponse : error;
    UniversalFunc.sendError(error, res);
  });
}



function agentLogout(logHandler, payload, res) {
  Promise.coroutine(function* () {
    payload.user_id      = payload.userInfo.user_id;
    payload.access_token = null;
    payload.device_token = null;
    payload.web_token    = null;
    payload.online_status = constants.onlineStatus.OFFLINE;

    let agentInfo = payload.userInfo;
    yield agentService.updateInfo(logHandler, payload);
    if(payload.device_id && payload.device_type) {
      yield userService.updateDeviceInfo(
        logHandler, { token : null, device_id : payload.device_id, device_type : payload.device_type },
        agentInfo
      );
    } else {
      let updatePayload = {
        update_fields : { token : null },
        where_clause  : { user_id : agentInfo.user_id }
      };
      yield  userService.updateUserDevice(logHandler, updatePayload);
      logger.error(logHandler, "Logging out of all devices : " + agentInfo.user_id + ", " + agentInfo.full_name);
    }

    agentService.insertUserOnlineStatusLogs(logHandler, payload);
    let result = {
      user_id : agentInfo.user_id,
    };
    logger.trace(logHandler, { EVENT : "Final response" }, { RESULT : result });
    // update latest info of agent
    agentInfo = yield agentService.getAgentInfo(logHandler, payload);
    agentInfo = utils.getSpecifiedKeyMapFromExistingMap(agentInfo[0], constants.agentFayeKeys);
    notifierService.sendBusinessLevelNotification(payload.businessInfo.app_secret_key, notificationBuilder.notificationType.AGENT_REFRESH, { agent_id : payload.user_id, agent_info : agentInfo });
    return result;
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.LOGGED_OUT, data, res);
  }, (error) => {
    logger.error(logHandler, { EVENT : "AGENT LOGOUT ERROR" }, { MESSAGE : error.message });
    UniversalFunc.sendError(error, res);
  });
}


function getAgents(logHandler, payload, res) {
  let opts                     = {};
  opts.business_id             = payload.businessInfo.business_id;

  Promise.coroutine(function* () {
    let registeredAgents    =  yield agentService.getRegisteredAgents(logHandler, opts);
    let invitedAgents       =  yield agentService.getInvitedAgents(logHandler, opts);

    let registeredAgentIds = [];
    _.each(registeredAgents, (agent) => {
      registeredAgentIds.push(agent.user_id);
    });
    let agentToTags = yield tagService.getAgentTags(logHandler, { agentIds : registeredAgentIds });
    _.each(registeredAgents, (agent) => {
      if(!_.isEmpty(agentToTags[agent.user_id])) {
        agent.tags = agentToTags[agent.user_id];
      }
    });

    return {
      agents        : registeredAgents,
      invitedAgents : invitedAgents
    };
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}



function inviteAgent(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let opts            = {};
    opts.business_id    = payload.businessInfo.business_id;
    opts.emails         = Array.from(new Set(payload.emails));
    opts.user_sub_type  = payload.agent_type;

    Promise.coroutine(function* () {
      let alreadyInvitedEmails = yield agentService.duplicateAgentInvitationCheck(logHandler, opts);
      opts.emails = opts.emails.filter(el => alreadyInvitedEmails.indexOf(el) < 0);
      if(_.isEmpty(opts.emails)) {
        throw new Error(RESP.ERROR.eng.ALL_EMAILS_ALREADY_INVITED.customMessage);
      }
      let alreadyRegisteredEmails = yield agentService.checkDuplicate(logHandler, opts);
      opts.emails = opts.emails.filter(el => alreadyRegisteredEmails.indexOf(el) < 0);
      if(_.isEmpty(opts.emails)) {
        throw new Error(RESP.ERROR.eng.ALL_EMAILS_ALREADY_INVITED.customMessage);
      }
      opts.emailTokenMap = {};
      for (let i = 0; i < opts.emails.length; i++) {
        opts.emailTokenMap[opts.emails[i]] = utils.getSHAOfObject(opts.emails[i] + Math.round(parseFloat(Math.random() * 10000)) + "");
      }
      let invited = yield agentService.saveInvitedAgents(logHandler, opts);
      if(invited.insertId <= 0) {
        throw new Error("Something went wrong");
      }

      let business = yield businessService.getInfo(logHandler, opts);
      _.each(opts.emailTokenMap, (value, key) => {
        let invitationLink = config.get("frontEndUrl") + "#/agent-signup?email_token=" + value;
        sendEmail(constants.emailType.AGENT_INVITATION, {
          email           : key,
          business_name   : business.business_name,
          invitation_link : invitationLink
        }, key, "You have been invited to join " + business.business_name + " team on Fugu", "Agent Invitation Mail");
      });

      let response = {};

      // check if select agent count is to be increased or not [BILLING]
      let billingPlan         = yield billingService.getBillingPlanDetails(logHandler, { business_id : opts.business_id });
      if(!_.isEmpty(billingPlan)) {
        billingPlan = billingPlan[0];
        let totalActiveAgentAndInvites = yield agentService.getActiveAgentsAndInvitesCount(logHandler, { business_id : opts.business_id });
        if(totalActiveAgentAndInvites > billingPlan.selected_agent_count) {
          billingService.updateBillingPlan(logHandler, { business_id : opts.business_id, selected_agent_count : totalActiveAgentAndInvites });
          response.select_agent_count_updated_to = totalActiveAgentAndInvites;
        }
      }

      response.success            = opts.emails;
      response.alreadyRegistered  = alreadyInvitedEmails;
      return response;
    })().then(
      (data) => { resolve(data); },
      (error) => { reject(error); }
    );
  });
}

function resendInvitation(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let opts = {};
    opts.business_id    = payload.businessInfo.business_id;
    opts.user_image     = payload.userInfo.user_image;
    opts.admin_name     = payload.userInfo.full_name;
    let agentInvitationData         = yield agentService.getAgentInvitationData(logHandler, payload);
    if(_.isEmpty(agentInvitationData)) {
      throw new Error(RESP.ERROR.eng.AGENT_ID_DOES_NOT_EXIST.customMessage);
    }

    let invitationLink = config.get("frontEndUrl") + "#/agent-signup?email_token=" + agentInvitationData[0].email_token;
    let businessInfo = yield businessService.getInfo(logHandler, opts);
    sendEmail(
      constants.emailType.AGENT_INVITATION,
      {
        email           : payload.invited_agent_email,
        business_name   : businessInfo.business_name,
        invitation_link : invitationLink
      }, payload.invited_agent_email, "You have been invited to join " + businessInfo.business_name + " team on Fugu", "Agent Invitation Mail"
    );
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.EMAIL_SENT, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}

function revokeInvitation(logHandler, payload, res) {
  Promise.coroutine(function* () {
    return yield agentService.revokeInvitation(logHandler, payload);
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.AGENT_INVITATION_REVOKED, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}

function verifyToken(logHandler, payload, response) {
  payload.is_invitation = 1;
  payload.email         = payload.invited_agent_email;
  if(payload.reset_password_token) {
    payload.is_invitation = 0;
    payload.email_token   = payload.reset_password_token;
  }

  Promise.coroutine(function* () {
    let agent_data =  yield agentService.verifyAgent(logHandler, payload);
    if(_.isEmpty(agent_data)) {
      throw new Error(RESP.ERROR.eng.EMAIL_TOKEN_NOT_VERIFIED.customMessage);
    }

    return agent_data;
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.EMAIL_TOKEN_VERIFIED, data, response);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, response);
  });
}

function otpLogin(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let accessToken;
    let agent_data =  yield agentService.verifyAgent(logHandler, { email_token : payload.otp_token, is_invitation : 0 });
    if(_.isEmpty(agent_data)) {
      throw new Error(RESP.ERROR.eng.INVALID_OTP_TOKEN.customMessage);
    }
    agent_data = agent_data[0];


    // prepare otp login
    let agentInfo = yield agentService.getInfo(logHandler, { email : agent_data.email });
    agentInfo = agentInfo[0];
    accessToken = agentInfo.access_token;

    let businessInfo = yield businessService.getInfo(logHandler, { business_id : agent_data.business_id });
    if(utils.equalsIgnoreCase(businessInfo.email, agentInfo.email)) {
      let businessOwner =  yield businessService.syncAndGetBusinessOwner(logHandler, agent_data.business_id);
      accessToken = businessOwner.access_token;
    }
    if(!accessToken) {
      accessToken = bcrypt.hashSync(payload.email, saltRounds);
      yield agentService.updateInfo(logHandler, { user_id : agentInfo.user_id, access_token : accessToken });
    }
    yield agentService.disableResetPasswordToken(logHandler, agent_data.email);

    return { access_token : accessToken };
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.OTP_TOKEN_VERIFIED, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}


function registerAgent(logHandler, payload, res) {
  let opts                           = {};
  opts.invited_agent_email           = payload.invited_agent_email;
  opts.email                         = payload.invited_agent_email;
  opts.full_name                     = payload.full_name;
  opts.phone_number                  = payload.phone_number;
  opts.email_token                   = payload.email_token;
  opts.password                      = md5(payload.password);
  opts.access_token                  = payload.access_token;
  opts.is_invitation                 = 1;
  if(utils.isValidObject(payload.files)) {
    opts.file                        = payload.files[0];
  }


  Promise.coroutine(function* () {
    let agent_data    = yield  agentService.verifyAgent(logHandler, opts);
    if(_.isEmpty(agent_data)) {
      throw new Error(RESP.ERROR.eng.AGENT_ID_DOES_NOT_EXIST.customMessage);
    }
    if(opts.file) {
      opts.file_type = constants.FILE_TYPE.FILE;
      let s3_url = yield utilityService.uploadFile(logHandler, opts);
      if(s3_url) {
        opts.user_image = s3_url.url;
      }
    }
    agent_data            = agent_data[0];
    opts.user_sub_type    = agent_data.user_sub_type;
    opts.business_id      = agent_data.business_id;
    opts.emails           = [opts.invited_agent_email];
    let user_data         = yield agentService.checkDuplicate(logHandler, opts);
    if(!_.isEmpty(user_data)) {
      throw new Error(RESP.ERROR.eng.USER_ALREADY_REGISTERED.customMessage);
    }

    opts.email            = opts.invited_agent_email;
    opts.contact_number   = opts.phone_number;




    let result            = yield agentService.insertNew(logHandler, opts);
    logger.trace(logHandler, result);
    if(result.user_id <= 0) {
      throw new Error("something went wrong");
    }

    yield agentService.markInvitedAgentAsUser(logHandler, opts);
    let businessInfo = yield businessService.getInfo(logHandler, { business_id : agent_data.business_id });
    notifierService.sendBusinessLevelNotification(businessInfo.app_secret_key, notificationBuilder.notificationType.AGENTS_REFRESH);

    // check if select agent count is to be increased or not [BILLING]
    let response = {};
    let billingPlan         = yield billingService.getBillingPlanDetails(logHandler, { business_id : opts.business_id });
    if(!_.isEmpty(billingPlan)) {
      billingPlan = billingPlan[0];
      let totalActiveAgentAndInvites = yield agentService.getActiveAgentsAndInvitesCount(logHandler, { business_id : opts.business_id });
      if(totalActiveAgentAndInvites > billingPlan.selected_agent_count) {
        billingService.updateBillingPlan(logHandler, { business_id : opts.business_id, selected_agent_count : totalActiveAgentAndInvites });
        response.select_agent_count_updated_to = totalActiveAgentAndInvites;
      }
    }

    return response;
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.USER_ADDED, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}



function editAgent(logHandler, payload, res) {
  let opts            = {};
  opts.device_id      = payload.device_id;
  opts.business_id    = payload.businessInfo.business_id;
  opts.user_id        = payload.user_id;
  opts.full_name      = payload.full_name;
  opts.user_sub_type  = payload.agent_type;
  opts.status         = payload.status;
  opts.phone_number   = payload.phone_number;
  opts.web_token      = payload.web_token;
  opts.files          = payload.files;
  opts.online_status  = payload.online_status;
  opts.tags_to_add    = utils.isString(payload.tags_to_add) ? utils.jsonParse(payload.tags_to_add) : payload.tags_to_add;
  opts.tags_to_add    = Array.from(new Set(opts.tags_to_add));
  opts.tags_to_remove = utils.isString(payload.tags_to_remove) ? utils.jsonParse(payload.tags_to_remove) : payload.tags_to_remove;
  opts.tags_to_remove = Array.from(new Set(opts.tags_to_remove));
  if(opts.status == constants.userStatus.DISABLE) {
    opts.access_token = null;
  }

  Promise.coroutine(function* () {
    let toBeEditedAgentInfo = yield agentService.getInfo(logHandler, { user_id : payload.user_id });
    if(_.isEmpty(toBeEditedAgentInfo)) {
      throw new Error("invalid user id");
    }
    toBeEditedAgentInfo = toBeEditedAgentInfo[0];
    let isBusinessOwner = utils.equalsIgnoreCase(toBeEditedAgentInfo.email, payload.businessInfo.email);

    if(payload.userInfo.user_sub_type == constants.userSubType.AGENT && payload.userInfo.user_id != payload.user_id) {
      throw new Error(RESP.ERROR.eng.UNAUTHORIZED.customMessage);
    }
    if(payload.userInfo.user_sub_type == constants.userSubType.AGENT && (!_.isEmpty(opts.tags_to_add) || !_.isEmpty(opts.tags_to_remove))) {
      throw new Error(RESP.ERROR.eng.UNAUTHORIZED.customMessage);
    }
    if((!_.isEmpty(opts.tags_to_add) || !_.isEmpty(opts.tags_to_remove))) {
      let tagsToAdd = new Set(opts.tags_to_add);
      let tagsToRemove = new Set(opts.tags_to_remove);
      if(tagsToAdd.intersection(tagsToRemove).size > 0) {
        throw new Error("Can't add and remove same tag");
      }
      let availableTags = new Set();
      let businessTags = yield tagService.getTags(logHandler, payload.businessInfo.business_id);
      for (let tag of businessTags) {
        availableTags.add(tag.tag_id);
      }
      if(!availableTags.isSuperset(tagsToAdd) || !availableTags.isSuperset(tagsToRemove)) {
        throw new Error("Invalid tag ids");
      }
    }
    if(payload.userInfo.user_id == opts.user_id && utils.isDefined(opts.status)) {
      throw new Error("You can not Enable/Disable own account");
    }
    if(isBusinessOwner && utils.isDefined(opts.status)) {
      throw new Error("You can not Enable/Disable business owner");
    }
    if(payload.userInfo.user_id == opts.user_id && utils.isDefined(opts.user_sub_type) && payload.userInfo.user_sub_type != opts.user_sub_type) {
      throw new Error("You can not change your own role");
    }
    if(isBusinessOwner && utils.isDefined(opts.user_sub_type) && toBeEditedAgentInfo.user_sub_type != opts.user_sub_type) {
      throw new Error("You can not change business owner's role");
    }


    if(opts.web_token && opts.device_id) {
      let userInfo = payload.userInfo;
      logger.error(logHandler, "Updating token : " + userInfo.user_id);
      let tokenPayload         = {};
      tokenPayload.business_id = userInfo.business_id;
      tokenPayload.token       = opts.web_token;
      tokenPayload.device_type = constants.deviceType.WEB;
      tokenPayload.device_id   = opts.device_id;
      let userDeviceInfo = yield userService.getDeviceInfo(logHandler, payload, userInfo);
      if(!userDeviceInfo.length) {
        yield userService.insertDeviceInfo(logHandler, tokenPayload, userInfo);
      } else {
        yield userService.updateDeviceInfo(logHandler, tokenPayload, userInfo);
      }
    }

    if(payload.assign_to_agent_id) {
      logger.error(logHandler, " assign_to_agent_id feature disabled");
      /*
       let data = {
        user_id     : payload.assign_to_agent_id,
        business_id : payload.businessInfo.business_id
      };
      let agentDetails    = yield agentService.getInfo(logHandler, data);
      if(_.isEmpty(agentDetails)) {
        throw  new Error("Agent Does Not Exist");
      }
      if(agentDetails[0].status == constants.userStatus.DISABLE) {
        throw new Error("Agent is blocked by Admin");
      }
      if(payload.status == constants.userStatus.DISABLE) {
        yield channelService.migrateAgentChats(logHandler, payload, agentDetails);
        opts.online_status = constants.onlineStatus.OFFLINE;
      }
      */
    }



    // prepare upload info
    if(!_.isEmpty(opts.files)) {
      opts.file = opts.files[0];
      opts.file_type = "image";
      let s3_url = yield utilityService.uploadFile(logHandler, opts);
      if(s3_url) {
        opts.user_image = s3_url.url;
      }
    }


    // update agent tags
    for (let tag of opts.tags_to_add) {
      yield tagService.insertOrUpdateTagsToUser(logHandler, { user_id : opts.user_id, tag_id : tag, enabled : constants.status.ENABLE });
    }
    for (let tag of opts.tags_to_remove) {
      yield tagService.insertOrUpdateTagsToUser(logHandler, { user_id : opts.user_id, tag_id : tag, enabled : constants.status.DISABLE });
    }


    // update info
    yield agentService.updateInfo(logHandler, opts);
    if(opts.online_status) {
      agentService.insertUserOnlineStatusLogs(logHandler, opts);
    }

    /*
    let agentInfo = yield agentService.getAgentInfo(logHandler, payload);
    agentInfo = utils.getSpecifiedKeyMapFromExistingMap(agentInfo[0], constants.agentFayeKeys);
    notifierService.sendBusinessLevelNotification(payload.businessInfo.app_secret_key, notificationBuilder.notificationType.AGENT_REFRESH, {agent_id : payload.user_id, agent_info : agentInfo});
*/

    let result = {};
    // Selected Agent count check [BILLING]
    if(opts.status == constants.userStatus.ENABLE) {
      // check if select agent count is to be increased or not [BILLING]
      let billingPlan         = yield billingService.getBillingPlanDetails(logHandler, { business_id : opts.business_id });
      if(!_.isEmpty(billingPlan)) {
        billingPlan = billingPlan[0];
        let totalActiveAgentAndInvites = yield agentService.getActiveAgentsAndInvitesCount(logHandler, { business_id : opts.business_id });

        if(totalActiveAgentAndInvites > billingPlan.selected_agent_count) {
          billingService.updateBillingPlan(logHandler, { business_id : opts.business_id, selected_agent_count : totalActiveAgentAndInvites });
          result.select_agent_count_updated_to = totalActiveAgentAndInvites;
        }
      }
    }
    result.user_id        = opts.user_id;
    result.message        = "Agent Edit Successful";
    return result;
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.EDITED, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}


// deprecated
function agentEnableDisable(logHandler, payload, res) {
  Promise.coroutine(function* () {
    if(payload.userInfo.user_sub_type == constants.userSubType.AGENT && payload.userInfo.user_id != payload.user_id) {
      throw new Error(RESP.ERROR.eng.UNAUTHORIZED.customMessage);
    }
    let agent = {
      business_id : payload.business_id,
      user_id     : payload.user_id,
      status      : payload.status
    };
    if(agent.status == 0) {
      agent.access_token = null;
    }
    if(agent.user_id == payload.userInfo.user_id) {
      throw new Error("Can't disable yourself");
    }
    yield  agentService.updateInfo(logHandler, agent);

    // let agentInfo = yield agentService.getAgentInfo(logHandler, payload);

    let result = {
      user_id : agent.user_id,
      message : "Agent Enable/Disable Successful"
    };
    logger.trace(logHandler, { EVENT : "Final response" }, { RESULT : result });
    // agentInfo = utils.getSpecifiedKeyMapFromExistingMap(agentInfo[0], constants.agentFayeKeys);
    // notifierService.sendBusinessLevelNotification(payload.businessInfo.app_secret_key, notificationBuilder.notificationType.AGENT_REFRESH, {agent_id : payload.user_id, agent_info : agentInfo});
    return result;
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.ENTRY_EDIT_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, { EVENT : "AGENT ENABLE DISABLE ERROR " }, { MESSAGE : error.message });
    UniversalFunc.sendError(error, res);
  });
}


function assignAgent(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      // check if already assigned
      if(payload.channelInfo.agent_id == payload.user_id) {
        throw new Error("Current agent is already assigned");
      }

      // get info of assigned agent
      let agentInfo = yield agentService.getInfo(logHandler, { user_id : payload.user_id });
      if(_.isEmpty(agentInfo)) {
        throw new Error("Agent doesn't exist with given credentials");
      }
      if(agentInfo[0].status != constants.userStatus.ENABLE) {
        throw new Error("Agent disabled");
      }
      agentInfo = agentInfo[0];



      let message;
      if(payload.user_id == payload.userInfo.user_id) {
        message = agentInfo.full_name + " assigned to themselves";
      } else {
        message = payload.userInfo.full_name + " assigned the chat to " + agentInfo.full_name;
      }


      // update lm_updated_at
      let updatePayload = {
        update_fields : { lm_updated_at : new Date() },
        where_clause  : {
          channel_id : payload.channel_id
        }
      };

      if(payload.channelInfo.status == constants.channelStatus.CLOSED) {
        updatePayload.update_fields.status = constants.channelStatus.OPEN;
        // insert re-open message
        let opts = {};
        opts.business_id  = payload.businessInfo.business_id;
        opts.user_id      = agentInfo.user_id;
        opts.channel_id   = payload.channel_id;
        opts.channel_name = payload.channel_name;
        opts.full_name    = agentInfo.full_name;
        opts.data         = { message : "The chat was re-opened by " + payload.userInfo.full_name };
        opts.user_type    = agentInfo.user_type;
        opts.label_id     = payload.channelInfo.label_id;
        opts.message_type = 2;
        yield Promise.promisify(dbquery.insertUsersConversation).call(null, logHandler, opts);
      }
      yield channelService.update(logHandler, updatePayload);

      // assigning agent to channel
      yield channelService.assignAgent(logHandler, { user_id : payload.user_id, channel_id : payload.channel_id });


      // insert assignment message
      let opts = {};
      opts.business_id  = payload.businessInfo.business_id;
      opts.user_id      = agentInfo.user_id;
      opts.channel_id   = payload.channel_id;
      opts.channel_name = payload.channel_name;
      opts.full_name    = agentInfo.full_name;
      opts.data         = { message : message };
      opts.user_type    = agentInfo.user_type;
      opts.label_id     = payload.channelInfo.label_id;
      opts.message_type = 2;
      opts.tags         = [];
      yield Promise.promisify(dbquery.insertUsersConversation).call(null, logHandler, opts);

      let tags = yield tagService.getChannelAssociatedTags(logHandler, payload.channel_id);
      if(!_.isEmpty(tags)) {
        _.each(tags, (tagDetails) => {
          opts.tags.push(tagDetails.tag_id);
        });
      }

      // send cc pushes to all agents
      let ownerAndAgentInfo = yield channelService.getOwnerAndAgentOfChannel(logHandler, { channel_id : payload.channel_id });
      let activeAgents = yield agentService.getAllActiveAgents(logHandler, payload.businessInfo);
      const currentDate = utils.getCurrentTime();
      let messageToSend                 = notificationBuilder.getObject(notificationBuilder.notificationType.ASSIGNMENT);
      messageToSend.user_id             = payload.channelInfo.owner_id;
      messageToSend.channel_id          = payload.channelInfo.channel_id;
      messageToSend.bot_channel_name    = payload.channelInfo.label;
      messageToSend.message             = message;
      messageToSend.agent_id            = agentInfo.user_id;
      messageToSend.assigned_to         = agentInfo.user_id;
      messageToSend.label               = payload.channelInfo.custom_label || ownerAndAgentInfo.owner_name || "Chat Assigned"; // owner name
      messageToSend.assigned_by         = payload.userInfo.user_id;
      messageToSend.assigned_to_name    = agentInfo.full_name;
      messageToSend.assigned_by_name    = payload.userInfo.full_name;
      messageToSend.date_time           = currentDate;
      messageToSend.chat_status         = constants.channelStatus.OPEN;
      messageToSend.attributes.label    = opts.tags;
      messageToSend.attributes.channel  = (opts.label_id == -1) ? [] : [opts.label_id];
      messageToSend.attributes.type     = [constants.conversationType.MY_CHAT];

      let pushList = [];
      for (let user of activeAgents) {
        if(user.user_id != payload.userInfo.user_id) {
          pushList.push({
            messageTo : user.user_id,
            message   : messageToSend,
            messageAt : '/' + utils.getSHAOfObject(user.user_id)
          });
        }
      }
      notifierService.sendControlChannelPushes({ ccPushList : pushList });

      // update read unread status
      // let historyPayload = { user_id : payload.user_id, business_id : payload.businessInfo.business_id, channel_id : payload.channel_id };
      // conversationService.syncMessageHistory(logHandler, historyPayload);



      return { user_id : payload.user_id, channel_id : payload.channel_id };
    })().then((data) => {
      logger.trace(logHandler, { EVENT : "ASSIGN AGENT SUCCESS" });
      resolve(data);
    }, (error) => {
      logger.error(logHandler, { EVENT : "AGENT ASSIGN ERROR " }, { MESSAGE : error.message });
      reject(error);
    });
  });
}

function assignAgentV1(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let channelsInfo = payload.channelsInfo;
      for (let i = 0; i < channelsInfo.length; i++) {
        payload.channelInfo = channelsInfo[i];
        payload.channel_id = payload.channelInfo.channel_id;
        payload.channel_name = payload.channelInfo.channel_name;
        try {
          yield exports.assignAgent(logHandler, payload);
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

function resetPasswordRequest(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      payload.email_id      = payload.agent_email;
      let agentInfo         = yield agentService.getInfo(logHandler, payload);

      if(_.isEmpty(agentInfo)) {
        throw new Error("Email Id doesn't exist");
      }
      if(agentInfo[0].status != constants.userStatus.ENABLE) {
        throw new Error("Agent disabled");
      }
      payload.email_token     = utils.getSHAOfObject(payload.agent_email + Math.random());
      payload.business_id     = agentInfo[0].business_id;
      payload.user_sub_type   = agentInfo[0].user_sub_type;

      yield agentService.saveResetPasswordRequest(logHandler, payload);
      sendEmail(constants.emailType.RESET_PASSWORD, {
        reset_password_link : config.get("frontEndUrl") + "#/resetpassword?reset_password_token=" + payload.email_token
      }, payload.agent_email, "Password Reset Mail", "Password Reset Mail");
    })().then(
      (data) => { resolve(data); },
      (error) => { reject(error); }
    );
  });
}


function resetPassword(logHandler, payload, res) {
  Promise.coroutine(function* () {
    payload.is_invitation = 0;
    payload.email         = payload.agent_email;
    let agentInfo     = yield agentService.verifyAgent(logHandler, payload);
    if(_.isEmpty(agentInfo)) {
      throw new Error(RESP.ERROR.eng.UNAUTHORIZED.customMessage);
    }
    payload.agent_email    = agentInfo[0].email;
    payload.new_password   = md5(payload.new_password);


    let businessInfo = yield businessService.getInfo(logHandler, { business_id : agentInfo[0].business_id });
    if(utils.equalsIgnoreCase(businessInfo.email, payload.agent_email)) {
      let authDetails = yield authService.getAuthUserDetails(logHandler, { email : payload.agent_email });
      if(_.isEmpty(authDetails)) {
        throw new Error("Owner not found in auth");
      }
      let updates = { password : payload.new_password };
      yield authService.updateAuthUser(logHandler, { updates : updates, auth_user_id : authDetails.user_id });
    }
    yield agentService.saveNewPassword(logHandler, payload);
    yield agentService.disableResetPasswordToken(logHandler, payload.agent_email);
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.PASSWORD_CHANGED, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}


function changePassword(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let userInfo          = payload.userInfo;
    let savedPassword     = userInfo.password;
    let oldPasswordMd5    = md5(payload.old_password);
    let newPasswordMd5    = md5(payload.new_password);
    let authUserId;


    if(userInfo.businessOwner) {
      let authDetails = yield authService.getAuthUserDetails(logHandler, { email : userInfo.email });
      if(_.isEmpty(authDetails)) {
        throw new Error("Agent not found in auth");
      }
      savedPassword = authDetails.password;
      authUserId    = authDetails.user_id;
    }
    if(!_.isEqual(savedPassword, oldPasswordMd5)) {
      throw new Error("Old password is incorrect");
    }
    if(_.isEqual(payload.old_password, payload.new_password)) {
      throw new Error("Old and new password is same");
    }


    if(userInfo.businessOwner) {
      let updates = {};
      updates.password = newPasswordMd5;
      yield authService.updateAuthUser(logHandler, { updates : updates, auth_user_id : authUserId });
    }
    yield agentService.saveNewPassword(logHandler, { agent_email : userInfo.email, new_password : newPasswordMd5 });
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.PASSWORD_CHANGED, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}

function adminResetPasswordRequest(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      if(payload.userInfo.user_sub_type != constants.userSubType.ADMIN) {
        throw new Error(RESP.ERROR.eng.UNAUTHORIZED.customMessage);
      }

      return yield exports.resetPasswordRequest(logHandler, payload);
    })().then(
      (data) => { resolve(data); },
      (error) => { reject(error); }
    );
  });
}

function getAgentInfo(logHandler, payload, res) {
  Promise.coroutine(function* () {
    if(payload.userInfo.user_sub_type == constants.userSubType.AGENT && payload.userInfo.user_id != payload.user_id) {
      throw new Error(RESP.ERROR.eng.UNAUTHORIZED.customMessage);
    }
    let result = yield agentService.getAgentInfo(logHandler, payload);
    if(_.isEmpty(result)) {
      throw new Error("Invalid User Id");
    }

    return result[0];
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}


function agentLoginViaAuthToken(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let error = {};

      let authUserDetails = yield authService.getAuthUserDetails(logHandler, { access_token : payload.auth_token });

      if(_.isEmpty(authUserDetails)) {
        error.errorResponse = RESP.ERROR.eng.NOT_REGISTERED;
        throw error;
      }

      let agentInfoViaEmail = yield agentService.getInfo(logHandler, { email : authUserDetails.email });

      if(_.isEmpty(agentInfoViaEmail)) {
        error.errorResponse = RESP.ERROR.eng.NOT_REGISTERED;
        throw error;
      }
      yield businessService.syncAndGetBusinessOwner(logHandler, agentInfoViaEmail[0].business_id);

      let result = {
        access_token : payload.auth_token
      };

      return result;
    })().then(
      (data) => { resolve(data); },
      (error) => { reject(error); }
    );
  });
}

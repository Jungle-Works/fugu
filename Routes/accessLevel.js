

const _                               = require('underscore');
const Promise                         = require('bluebird');
const config                          = require('config');
const RESP                            = require('../Config').responseMessages;
const Controller                      = require('../Controller').userController;
const UniversalFunc                   = require('../Utils/universalFunctions');
const logger                          = require('../Routes/logging');
const constants                       = require('../Utils/constants');
const channelService                  = require('../services/channel');
const tagService                      = require('../services/tags');
const agentService                    = require('../services/agent');
const userService                     = require('../services/user');





let entity = Object.freeze({
  EMPTY          : 0,
  USER           : 1,
  AGENT          : 2,
  ADMIN          : 3,
  SUPERADMIN     : 4,
  BUSINESS_OWNER : 5
});

let lvl = Object.freeze({
  EMPTY          : [entity.EMPTY],
  ANYONE         : [entity.USER, entity.AGENT, entity.ADMIN],
  USER           : [entity.USER],
  AGENT_ADMIN    : [entity.AGENT, entity.ADMIN],
  ADMIN          : [entity.ADMIN],
  SUPERADMIN     : [entity.SUPERADMIN],
  BUSINESS_OWNER : [entity.BUSINESS_OWNER]
});

exports.lvl = lvl;



exports.barrier = function (accessLevel) {
  return function (req, res, next) {
    let logHandler = req.logHandler;
    if(_.isEqual(accessLevel, lvl.EMPTY)) {
      return next();
    }

    let isSuperAdminRequest = req.body.isSuperAdminRequest;
    if(isSuperAdminRequest && isSuperAdminRequest == 1) {
      return next();
    }
    // check business access level
    businessAccessLevel(req).then((data) => {
      // check user access level
      userAccessLevel(accessLevel, req, res, next);
    }, (error) => {
      logger.error(logHandler, error, { REQUEST : req.body });
      return UniversalFunc.sendError(RESP.ERROR.eng.ACCESS_DENIED, res);
    });
  };
};


function businessAccessLevel(req) {
  let logHandler = req.logHandler;
  return new Promise((resolve, reject) => {
    let businessInfo = req.body.businessInfo;
    let error;
    if(!businessInfo) {
      error = new Error("Access Barrier :: Invalid businessInfo");
      logger.error(logHandler, error.message, businessInfo);
      return reject(error);
    }

    let payload = req.body;
    Promise.coroutine(function* () {
      if(payload.business_id) {
        if(businessInfo.business_id != payload.business_id) {
          error = new Error("Access Barrier :: business_id don't belong to same business");
          return reject(error);
        }
      }

      if(payload.user_id) {
        let userInfo = yield userService.getInfo(logHandler, payload.user_id);
        if(!userInfo.length) {
          error = new Error("Access Barrier :: user not found");
          return reject(error);
        }
        if(businessInfo.business_id != userInfo[0].business_id) {
          error = new Error("Access Barrier :: user don't belong to same business");
          return reject(error);
        }
      }

      if(payload.channel_id) {
        let channelInfo = yield channelService.getInfo(logHandler, { channel_id : payload.channel_id });
        if(!channelInfo.length) {
          error = new Error("Access Barrier :: channel not found");
          return reject(error);
        }
        if(businessInfo.business_id != channelInfo[0].business_id) {
          error = new Error("Access Barrier :: channel don't belong to same business");
          return reject(error);
        }
        req.body.channelInfo = channelInfo[0];
      }

      if(payload.channel_ids) {
        let channelsInfo = yield channelService.getChannelsInfo(logHandler, { channel_ids : payload.channel_ids, business_id : businessInfo.business_id });
        if(payload.channel_ids.length != channelsInfo.length) {
          error = new Error("Access Barrier :: Invalid channels Ids");
          return reject(error);
        }
        req.body.channelsInfo = channelsInfo;
      }

      if(payload.tag_id) {
        let tagInfo = yield tagService.getTagById(logHandler, payload.tag_id);
        if(!tagInfo.length) {
          error = new Error("Access Barrier :: tag not found");
          return reject(error);
        }
        if(businessInfo.business_id != tagInfo[0].business_id) {
          error = new Error("Access Barrier :: tag don't belong to same business");
          return reject(error);
        }
      }

      if(payload.agent_email) {
        let agentInfo = yield agentService.getInfo(logHandler, { email : payload.agent_email });
        if(!agentInfo.length) {
          error = new Error("Access Barrier :: agent email not found");
          return reject(error);
        }
        if(agentInfo[0].status != constants.userStatus.ENABLE) {
          error = new Error("Access Barrier :: agent disabled");
          return reject(error);
        }
        if(businessInfo.business_id != agentInfo[0].business_id) {
          error = new Error("Access Barrier :: agent email don't belong to same business");
          return reject(error);
        }
      }

      if(payload.invited_agent_email) {
        let agentInfo = yield agentService.getAgentInvitationData(logHandler, payload);
        if(!agentInfo.length) {
          error = new Error("Access Barrier :: invited agent email not found");
          return reject(error);
        }
        if(businessInfo.business_id != agentInfo[0].business_id) {
          error = new Error("Access Barrier :: invited agent email don't belong to same business");
          return reject(error);
        }
      }

      return {};
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}


function userAccessLevel(accessLevel, req, res, next) {
  let logHandler = req.logHandler;

  let userInfo = req.body.userInfo;

  if(!userInfo) {
    logger.error(logHandler, "Access Barrier :: Invalid userInfo", userInfo);
    return UniversalFunc.sendError(RESP.ERROR.eng.ACCESS_DENIED, res);
  }

  if(_.isEqual(accessLevel, lvl.ADMIN)) {
    if(userInfo.user_type != constants.userType.AGENT || userInfo.user_sub_type != constants.userSubType.ADMIN) {
      let error = {};
      error.user_type              = userInfo.user_type;
      error.required_user_type     = constants.userType.AGENT;
      error.user_sub_type          = userInfo.user_sub_type;
      error.required_user_sub_type = constants.userSubType.ADMIN;
      logger.error(logHandler, "Access Barrier :: Access Denied in ADMIN lvl ", error);
      return UniversalFunc.sendError(RESP.ERROR.eng.ACCESS_DENIED, res);
    }
  } else if(_.isEqual(accessLevel, lvl.AGENT_ADMIN)) {
    if(userInfo.user_type != constants.userType.AGENT) {
      let error = {};
      error.user_type              = userInfo.user_type;
      error.required_user_type     = constants.userType.AGENT;
      logger.error(logHandler, "Access Barrier :: Access Denied in AGENT_ADMIN lvl ", error);
      return UniversalFunc.sendError(RESP.ERROR.eng.ACCESS_DENIED, res);
    }
  } else if(_.isEqual(accessLevel, lvl.USER)) {
    if(userInfo.user_type != constants.userType.CUSTOMER) {
      let error = {};
      error.user_type              = userInfo.user_type;
      error.required_user_type     = constants.userType.CUSTOMER;
      logger.error(logHandler, "Access Barrier :: Access Denied in USER lvl ", error);
      return UniversalFunc.sendError(RESP.ERROR.eng.ACCESS_DENIED, res);
    }
  } else if(_.isEqual(accessLevel, lvl.ANYONE)) {
    if(!(userInfo.user_type == constants.userType.CUSTOMER || userInfo.user_type == constants.userType.AGENT)) {
      let error = {};
      error.user_type              = userInfo.user_type;
      logger.error(logHandler, "Access Barrier :: Access Denied in ANYONE lvl ", error);
      return UniversalFunc.sendError(RESP.ERROR.eng.ACCESS_DENIED, res);
    }
  } else if(_.isEqual(accessLevel, lvl.BUSINESS_OWNER)) {
    if(!userInfo.businessOwner) {
      let error = {};
      error.required_user_type              = "BUSINESS_OWNER";
      logger.error(logHandler, "Access Barrier :: Access Denied in BUSINESS_OWNER lvl ", error);
      return UniversalFunc.sendError(RESP.ERROR.eng.ACCESS_DENIED, res);
    }
  } else {
    logger.error(logHandler, "Access Barrier :: No valid access level passed");
    return;
  }
  next();
}

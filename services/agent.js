/**
 * Created by vidit on 7/7/17.
 */
const Promise             = require('bluebird');
const async               = require('async');
const bcrypt              = require('bcryptjs');
const _                   = require('underscore');
const dbHandler           = require('../database').dbHandler;
const constants           = require('../Utils/constants');
const utils               = require('../Controller/utils');

const saltRounds          = 10;


exports.insertNew                         = insertNew;
exports.getInfoUsingEmailOrAccessToken    = getInfoUsingEmailOrAccessToken;
exports.updateInfo                        = updateInfo;
exports.saveInvitedAgents                 = saveInvitedAgents;
exports.getAgentInvitationData            = getAgentInvitationData;
exports.revokeInvitation                  = revokeInvitation;
exports.verifyAgent                       = verifyAgent;
exports.duplicateAgentInvitationCheck     = duplicateAgentInvitationCheck;
exports.markInvitedAgentAsUser            = markInvitedAgentAsUser;
exports.checkDuplicate                    = checkDuplicate;
exports.getInvitedAgents                  = getInvitedAgents;
exports.getRegisteredAgents               = getRegisteredAgents;
exports.getInfo                           = getInfo;
exports.saveResetPasswordRequest          = saveResetPasswordRequest;
exports.saveNewPassword                   = saveNewPassword;
exports.getAllActiveAgents                = getAllActiveAgents;
exports.disableResetPasswordToken         = disableResetPasswordToken;
exports.getAgentInfo                      = getAgentInfo;
exports.insertUserOnlineStatusLogs        = insertUserOnlineStatusLogs;
exports.getLeastLoadAgents                = getLeastLoadAgents;
exports.disableAgents                     = disableAgents;
exports.revokeInvitations                 = revokeInvitations;
exports.getActiveAgentsAndInvitesCount    = getActiveAgentsAndInvitesCount;
exports.getTotalAgentsCount               = getTotalAgentsCount;
exports.getLeastLoadAgentsWithIds         = getLeastLoadAgentsWithIds;


function saveResetPasswordRequest(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `insert into agent_invitations (business_id, email_id, email_token, user_sub_type, is_invitation) values (?, ?, ?, ?, ?)`;

    let queryObj = {
      query : query,
      args  : [payload.business_id, payload.agent_email, payload.email_token, payload.user_sub_type, 0],
      event : "savePasswordResetRequest"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function getInfo(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `select * from users where user_type = 2 `;
    let values = [];
    if(payload.email) {
      query += " and email= ? ";
      values.push(payload.email);
    }
    if(payload.password) {
      query += " and password= ? ";
      values.push(payload.password);
    }
    if(payload.user_id) {
      query += " and user_id= ? ";
      values.push(payload.user_id);
    }
    if(payload.access_token) {
      query += " and access_token= ? ";
      values.push(payload.access_token);
    }
    if(payload.business_id) {
      query += " and business_id = ? ";
      values.push(payload.business_id);
    }
    if(payload.auth_user_id) {
      query += " and auth_user_id = ? ";
      values.push(payload.auth_user_id);
    }

    let queryObj = {
      query : query,
      args  : values,
      event : "getInfo"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getAllActiveAgents(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `Select * from users where user_type = 2 AND status = 1 AND business_id = ?`;

    let queryObj = {
      query : query,
      args  : [payload.business_id],
      event : "getAllActiveAgents"
    };
    let logHandlerLocal = utils.cloneObject(logHandler);
    logHandlerLocal.logResultLength = true;
    dbHandler.executeQuery(logHandlerLocal, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function saveNewPassword(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = "UPDATE users SET password = ? where user_type = 2 and email = ?";

    let queryObj = {
      query : query,
      args  : [payload.new_password, payload.agent_email],
      event : "saveNewPassword"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function insertNew(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = "INSERT INTO  users set ? ";
    let agentInfo = {
      business_id     : payload.business_id,
      email           : payload.email,
      full_name       : (payload.full_name) ? utils.toTitleCase(payload.full_name) : payload.full_name,
      user_name       : "user" + Math.round(parseFloat(Math.random() * 10000)) + "",
      status          : 1,
      user_type       : 2,
      user_sub_type   : payload.user_sub_type || 11,
      phone_number    : payload.contact_number,
      password        : payload.password,
      device_type     : payload.device_type,
      device_id       : payload.device_id || "0",
      user_unique_key : payload.user_unique_key || "0",
      device_token    : payload.device_token,
      access_token    : bcrypt.hashSync(payload.email, saltRounds),
      user_image      : payload.user_image || "",
      auth_user_id    : payload.auth_user_id
    };
    let queryObj = {
      query : query,
      args  : [agentInfo],
      event : "Inserting new agent "
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      agentInfo.user_id = result.insertId;
      resolve(agentInfo);
    }, (error) => {
      reject(error);
    });
  });
}

function getInfoUsingEmailOrAccessToken(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let values = [];
    let emailOrToken = "";
    if(payload.email) {
      emailOrToken = "email = ?";
      values.push(payload.email);
    } else if(payload.access_token) {
      emailOrToken = "access_token = ?";
      values.push(payload.access_token);
    } else {
      throw new Error("No valid identifier passed");
    }
    let query = `
      SELECT *
      FROM
        users
      WHERE 
        ${emailOrToken} AND user_type = 2 
    `;
    let queryObj = {
      query : query,
      args  : values,
      event : "Get Agent Info "
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function updateInfo(logHandler, payload) {
  return new Promise((resolve, reject) => {
    if(!payload.user_id) {
      return reject(new Error("Invalid user_id"));
    }

    let query = ` Update users set ? where user_id = ? AND user_type = 2`;
    let updateObj = {};
    (payload.password)      ? updateObj.password = payload.password : 0;
    (payload.full_name)     ? updateObj.full_name = utils.toTitleCase(payload.full_name) : 0;
    (payload.phone_number)  ? updateObj.phone_number = payload.phone_number : 0;
    (payload.device_type)   ? updateObj.device_type = payload.device_type : 0;
    (payload.device_id)     ? updateObj.device_id = payload.device_id : 0;
    // (payload.device_token === null || payload.device_token)  ? updateObj.device_token = payload.device_token : 0;
    (payload.access_token === null || payload.access_token)  ? updateObj.access_token = payload.access_token : 0;
    // if(payload.web_token  === null || payload.web_token) {
    //  updateObj.web_token = payload.web_token;
    //  updateObj.web_token_updated_at = new Date();
    // }
    (payload.status || payload.status == 0) ? updateObj.status = payload.status : 0;
    (payload.user_image)    ? updateObj.user_image = payload.user_image : "";
    (payload.user_sub_type) ? updateObj.user_sub_type = payload.user_sub_type : 0;
    if(payload.online_status) {
      updateObj.online_status             = payload.online_status;
      updateObj.online_status_updated_at  = new Date();
    }
    updateObj.updated_at = new Date();

    let queryObj = {
      query : query,
      args  : [updateObj, payload.user_id],
      event : "updating agent info"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function saveInvitedAgents(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let values = [];
    let placeHolders = [];
    _.each(payload.emailTokenMap, (value, key) => {
      values = values.concat(key, payload.user_sub_type, value, payload.business_id, 1);
      placeHolders = placeHolders.concat("(?,?,?,?,?)");
    });
    placeHolders = placeHolders.join(" ,");

    let query = `insert into agent_invitations (email_id, user_sub_type, email_token, business_id, is_invitation) values ${placeHolders}`;
    let queryObj = {
      query : query,
      args  : values,
      event : "saveInvitedAgents"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getAgentInvitationData(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `select * from agent_invitations where email_id = ? and is_enabled = 1 and is_invitation = 1 order by agent_id desc`;

    let queryObj = {
      query : query,
      args  : [payload.invited_agent_email],
      event : "getAgentInvitationData"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function revokeInvitation(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `update agent_invitations set is_enabled = 0 where email_id = ? and is_enabled = 1 and is_invitation = 1`;

    let queryObj = {
      query : query,
      args  : [payload.invited_agent_email],
      event : "revokeInvitation"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function duplicateAgentInvitationCheck(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let query = `select email_id from agent_invitations where is_enabled = 1 and is_invitation = 1 and email_id in (?)`;
    let queryObj = {
      query : query,
      args  : [opts.emails],
      event : "duplicateCheck"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      let already_invited_emails = [];
      _.each(result, (value, key) => {
        already_invited_emails.push(value.email_id);
      });
      resolve(already_invited_emails);
    }, (error) => {
      reject(error);
    });
  });
}

function verifyAgent(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `select email_id as email, user_sub_type, business_id from agent_invitations where  is_enabled = 1 and is_invitation = ? `;
    let values = [payload.is_invitation];
    if(payload.email) {
      query += " and email_id = ? ";
      values.push(payload.email);
    }
    if(payload.email_token) {
      query += " and email_token = ? ";
      values.push(payload.email_token);
    }

    let queryObj = {
      query : query,
      args  : values,
      event : "verifyAgent"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function markInvitedAgentAsUser(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let query = `update agent_invitations set is_enabled = 0, is_user_created = 1 where email_id =  ? and email_token = ? and is_enabled = 1 and is_invitation = 1`;

    let queryObj = {
      query : query,
      args  : [opts.invited_agent_email, opts.email_token],
      event : "updateInvitationEntry"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function checkDuplicate(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let query = `select email from users where email in (?) AND user_type = 2 `;

    let queryObj = {
      query : query,
      args  : [opts.emails],
      event : "check duplicate agent"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      let already_registered_emails = [];
      _.each(result, (value, key) => {
        already_registered_emails.push(value.email);
      });
      resolve(already_registered_emails);
    }, (error) => {
      reject(error);
    });
  });
}

function getRegisteredAgents(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let query = `
                SELECT 
                    user_id,
                    full_name,
                    user_name,
                    email,
                    user_sub_type AS agent_type,
                    status,
                    user_image,
                    online_status,
                    online_status_updated_at
                FROM
                    users
                WHERE
                    status IN (1 , 0) AND user_type = 2
                        AND business_id = ? 
                ORDER BY full_name`;
    let queryObj = {
      query : query,
      args  : [opts.business_id],
      event : "getRegisteredAgents"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getInvitedAgents(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let query = `
                  SELECT
                      agent_id as invite_id,
                      email_id AS email,
                      user_sub_type AS agent_type,
                      4 AS 'status'
                  FROM
                      agent_invitations
                  WHERE
                      is_enabled = 1 AND business_id = ?
                          AND is_invitation = 1`;

    let queryObj = {
      query : query,
      args  : [opts.business_id],
      event : "getInvitedAgents"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function disableResetPasswordToken(logHandler, email_id) {
  return new Promise((resolve, reject) => {
    let query = "update agent_invitations set is_enabled = 0 where is_enabled = 1 and is_invitation = 0 and email_id = ?";

    let queryObj = {
      query : query,
      args  : [email_id],
      event : "disableResetPasswordToken"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function getAgentInfo(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `
                  SELECT 
                      full_name,
                      phone_number,
                      email,
                      user_image,
                      user_sub_type,
                      business_id,
                      online_status,
                      online_status_updated_at
                  FROM
                      users
                  WHERE
                      user_id = ? AND user_type = 2
                          AND status = 1`;
    let values = [payload.user_id];
    let queryObj = {
      query : query,
      args  : values,
      event : "getAgentInfo"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function insertUserOnlineStatusLogs(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `insert into logs_user_online_status (user_id, online_status) values (?, ?)`;
    let values = [payload.user_id, payload.online_status];
    let queryObj = {
      query : query,
      args  : values,
      event : "insertAgentOnlineStatusLogs"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function getLeastLoadAgentsWithIds(logHandler, payload) {
  return new Promise((resolve, reject) => {
    if(_.isEmpty(payload.agentIds)) {
      return resolve([]);
    }
    let query =
          `
      SELECT
      COUNT(CASE WHEN c.status = 2 THEN c.channel_id END) AS closed_channel_count,
      COUNT(CASE WHEN c.status = 1 THEN c.channel_id END) AS open_channel_count,
      u.user_id AS agent_id,
      u.full_name,
      u.user_type
      FROM
          users u
      LEFT JOIN channels c ON
          u.user_id = c.agent_id
      WHERE
          user_type = 2 AND u.status = 1 AND u.business_id = ? AND u.online_status = 'AVAILABLE' AND u.user_id in (?)
      GROUP BY
          c.agent_id
      ORDER BY
          open_channel_count ASC,
          closed_channel_count DESC
    `;


    let queryObj = {
      query : query,
      args  : [payload.business_id, payload.agentIds],
      event : "getLeastLoadAgentsWithIds"
    };
    let logHandlerLocal = utils.cloneObject(logHandler);
    logHandlerLocal.logResultLength = true;
    dbHandler.executeQuery(logHandlerLocal, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getLeastLoadAgents(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query =
    `
      SELECT
      COUNT(CASE WHEN c.status = 2 THEN c.channel_id END) AS closed_channel_count,
      COUNT(CASE WHEN c.status = 1 THEN c.channel_id END) AS open_channel_count,
      u.user_id AS agent_id,
      u.full_name,
      u.user_type
      FROM
          users u
      LEFT JOIN channels c ON
          u.user_id = c.agent_id
      WHERE
          user_type = 2 AND u.status = 1 AND u.business_id = ? AND u.online_status = 'AVAILABLE'
      GROUP BY
          c.agent_id
      ORDER BY
          open_channel_count ASC,
          closed_channel_count DESC
    `;


    let queryObj = {
      query : query,
      args  : [payload.business_id],
      event : "getLeastLoadAgents"
    };
    let logHandlerLocal = utils.cloneObject(logHandler);
    logHandlerLocal.logResultLength = true;
    dbHandler.executeQuery(logHandlerLocal, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function disableAgents(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `UPDATE users SET status = 0, access_token = NULL WHERE user_id IN (?) AND business_id = ?`;
    let queryObj = {
      query : query,
      args  : [payload.user_ids, payload.business_id],
      event : "disableAgents"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function revokeInvitations(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `UPDATE agent_invitations SET is_enabled = 0 WHERE agent_id IN (?) AND is_invitation = 1 AND business_id = ? `;
    let queryObj = {
      query : query,
      args  : [payload.invite_ids, payload.business_id],
      event : "revokeInvitations"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getActiveAgentsAndInvitesCount(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `SELECT 
                (SELECT COUNT(*) FROM users WHERE user_type = 2 AND business_id = ? AND status = 1) + 
                (SELECT COUNT(*) FROM agent_invitations WHERE business_id = ? AND is_invitation = 1 AND is_enabled = 1) as total_agent_count;`;

    let queryObj = {
      query : query,
      args  : [payload.business_id, payload.business_id],
      event : "getActiveAgentsAndInvitesCount"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result[0].total_agent_count);
    }, (error) => {
      reject(error);
    });
  });
}

function getTotalAgentsCount(logHandler, businessId) {
  return new Promise((resolve, reject) => {
    let query = `
        SELECT
        COUNT(*) as total_agents
    FROM
        users
    WHERE
        user_type = ? AND business_id = ?
          `;
    let values = [constants.userType.AGENT, businessId];
    let queryObj = {
      query : query,
      args  : values,
      event : "getAgentInfo"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

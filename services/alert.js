/**
 * Created by Puneet on 25/09/17.
 */
const Promise             = require('bluebird');
const dbHandler           = require('../database').dbHandler;
const _                   = require('underscore');
const constants           = require('../Utils/constants');
const async               = require('async');
const logger              = require('../Routes/logging');


exports.createAlert             = createAlert;
exports.getAlert                = getAlert;
exports.closeAlert              = closeAlert;
exports.updateAlert             = updateAlert;
exports.getAllAlerts            = getAllAlerts;
exports.getHighestPriority      = getHighestPriority;
exports.editAlertPriority       = editAlertPriority;
exports.getAlertByIdentifier    = getAlertByIdentifier;
exports.getAlertedAgents        = getAlertedAgents;
exports.getAlertedAdmins        = getAlertedAdmins;
exports.checkIfAlertClosed      = checkIfAlertClosed;

function createAlert(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let fields = ["alert_content", "priority", "type", "is_enabled", "mandatory", "identifier", "alert_color", "description"];
    let query = "INSERT INTO `alerts` (" + fields.join(', ') + " ) VALUES (?,?,?,?,?,?,?,?)";
    let queryObj = {
      query : query,
      args  : [opts.alert_content, opts.priority, opts.type, 1, opts.mandatory, opts.identifier, opts.alert_color, opts.description],
      event : "createAlert"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function updateAlert(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = "update alerts set ? where alert_id = ?";
    let updateObj = {};
    (payload.alert_content) ? updateObj.alert_content = payload.alert_content : 0;
    (payload.type)          ? updateObj.type = payload.type : 0;
    (payload.mandatory || payload.mandatory == 0)     ? updateObj.mandatory = payload.mandatory : 0;
    (payload.is_enabled || payload.is_enabled == 0)   ? updateObj.is_enabled = payload.is_enabled : 0;
    (payload.alert_color)   ? updateObj.alert_color = payload.alert_color : 0;
    (payload.description)   ? updateObj.description = payload.description : 0;
    (payload.priority)      ? updateObj.priority = payload.priority : 0;
    let queryObj = {
      query : query,
      args  : [updateObj, payload.alert_id],
      event : "updateAlert"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getAllAlerts(logHandler) {
  return new Promise((resolve, reject) => {
    let query = "Select * from alerts";

    let queryObj = {
      query : query,
      args  : [],
      event : "getAlert"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getAlert(logHandler, alertId) {
  return new Promise((resolve, reject) => {
    let query = `select alert_id, type, is_enabled from alerts where alert_id = ? and is_enabled = 1`;
    let queryObj = {
      query : query,
      args  : [alertId],
      event : "getAlert"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}
function closeAlert(logHandler, opts) {
  return new Promise((resolve, reject) => {
    let query = '';
    let insertobj = {};
    if(opts.user_sub_type == constants.userSubType.AGENT) {
      query = `Insert into alerted_agents set ? `;
      insertobj.agent_id = opts.agent_id;
      insertobj.alert_id = opts.alert_id;
    } else {
      query = `Insert into alerted_admins  set ?`;
      insertobj.alert_id = opts.alert_id;
      insertobj.business_id = opts.business_id;
    }

    logger.trace(logHandler, query, insertobj);
    let queryObj = {
      query : query,
      args  : [insertobj],
      event : "closeAlert"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function getHighestPriority(logHandler, priority) {
  return new Promise((resolve, reject) => {
    let query = "Select max(priority) as priority from alerts";

    let queryObj = {
      query : query,
      args  : [priority],
      event : "getHighestPriority"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function editAlertPriority(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = "UPDATE alerts SET priority = ? WHERE alert_id = ?";

    let queryObj = {
      query : query,
      args  : [payload.priority, payload.alert_id],
      event : "editAlertPriority"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getAlertByIdentifier(logHandler, identifier) {
  return new Promise((resolve, reject) => {
    let query = "Select alert_id from alerts where identifier = ? and is_enabled = 1";

    let queryObj = {
      query : query,
      args  : [identifier],
      event : "getAlertByIdentifier"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getAlertedAgents(logHandler, agentId) {
  return new Promise((resolve, reject) => {
    let query = `select a.*
                  from 
                  alerts a 
                  left join alerted_agents b 
                  on a.alert_id = b.alert_id and b.agent_id = ?
                  where a.type IN (?,?)
                  and a.is_enabled = 1
                  and b.agent_id is null
                  order by a.priority limit 1`;

    let queryObj = {
      query : query,
      args  : [agentId, constants.alertType.AGENT, constants.alertType.ALL],
      event : "getAlertedAgents"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getAlertedAdmins(logHandler, businessId) {
  return new Promise((resolve, reject) => {
    let query = `select a.*
                  from 
                  alerts a 
                  left join alerted_admins b 
                  on a.alert_id = b.alert_id 
                  and b.business_id = ?
                  where a.type IN (?,?) 
                  and a.is_enabled = 1 
                  and b.business_id is null
                  order by a.priority limit 1`;

    let queryObj = {
      query : query,
      args  : [businessId, constants.alertType.ADMIN, constants.alertType.ALL],
      event : "getAlertedAdmins`"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function checkIfAlertClosed(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query =  ``;
    let values = [payload.alert_id];
    if(payload.userInfo.user_sub_type == constants.userSubType.AGENT) {
      query = `Select agent_id from alerted_agents where alert_id = ? and agent_id = ? `;
      values.push(payload.userInfo.user_id);
    } else {
      query = `Select business_id  from alerted_admins where alert_id = ? and business_id = ? `;
      values.push(payload.business_id);
    }

    let queryObj = {
      query : query,
      args  : values,
      event : "checkIfAlertClosed"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      if(_.isEmpty(result)) {
        return resolve(false);
      }
      return resolve(true);
    }, (error) => {
      reject(error);
    });
  });
}

/**
 * Created by Puneet on 25/09/17.
 */

'user Strict';

const async                         = require('async');
const RESP                          = require('../Config').responseMessages;
const request                       = require('request');
const constants                     = require('../Utils/constants');
const _                             = require('underscore');
const Promise                       = require('bluebird');
const config                        = require('config');
const alertService                  = require('../services/alert');
const UniversalFunc                 = require('../Utils/universalFunctions');
const logger                        = require('../Routes/logging');

exports.createAlert             = createAlert;
exports.updateAlert             = updateAlert;
exports.getAlert                = getAlert;
exports.getAllAlerts            = getAllAlerts;
exports.closeAlert              = closeAlert;
exports.editAlertPriority       = editAlertPriority;
exports.getAlertByIdentifier    = getAlertByIdentifier;

function createAlert(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let priority = yield alertService.getHighestPriority(logHandler, payload.priority);
      payload.priority = priority[0].priority + 1;
      payload.identifier = payload.identifier || UniversalFunc.generateRandomString(6);

      let alert = yield alertService.createAlert(logHandler, payload);
      return { alert_id : alert.insertId };
    })().then(
      (data) => {
        resolve(data);
      },
      (error) => {
        reject(error);
      }
    );
  });
}

function updateAlert(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let alertInfo = yield alertService.getAlert(logHandler, payload.alert_id);
      if(_.isEmpty(alertInfo)) {
        throw new Error(RESP.ERROR.eng.ALERT_NOT_FOUND.customMessage);
      }
      if(alertInfo[0].is_enabled == payload.is_enabled) {
        throw new Error("Alert have already Same Status");
      }
      yield alertService.updateAlert(logHandler, payload);
      return { alert : { alert_id : payload.alert_id } };
    })().then(
      (data) => {
        resolve(data);
      },
      (error) => {
        reject(error);
      }
    );
  });
}

function getAlert(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let alert = 0;
      if(payload.userInfo.user_sub_type == constants.userSubType.AGENT) {
        alert = yield alertService.getAlertedAgents(logHandler, payload.userInfo.user_id);
        logger.trace(logHandler, { EVENT : "getAlertedAgents", RESULT : alert });
        return alert;
      }
      if(payload.userInfo.user_sub_type == constants.userSubType.ADMIN) {
        alert = yield alertService.getAlertedAdmins(logHandler, payload.businessInfo.business_id);
        logger.trace(logHandler, { EVENT : "getAlertedAdmins", RESULT : alert });
        return alert;
      }
      return {};
    })().then(
      (data) => {
        resolve(data);
      },
      (error) => {
        reject(error);
      }
    );
  });
}

function getAllAlerts(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      return yield alertService.getAllAlerts(logHandler);
    })().then(
      (data) => {
        resolve(data);
      },
      (error) => {
        reject(error);
      }
    );
  });
}

function closeAlert(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let userSubType = payload.userInfo.user_sub_type;
      let alert = yield alertService.getAlert(logHandler, payload.alert_id);
      if(_.isEmpty(alert)) {
        throw new Error(RESP.ERROR.eng.ALERT_NOT_FOUND.customMessage);
      }

      let alreadyClosed = yield alertService.checkIfAlertClosed(logHandler, payload);
      if(alreadyClosed) {
        throw new Error(RESP.ERROR.eng.ALERT_ALREADY_CLOSED.customMessage);
      }

      if((alert[0].type == constants.alertType.AGENT && userSubType != constants.userSubType.AGENT) || (alert[0].type == constants.alertType.ADMIN && userSubType != constants.userSubType.ADMIN)) {
        throw new Error(RESP.ERROR.eng.UNAUTHORIZED.customMessage);
      }
      payload.agent_id = payload.userInfo.user_id || 0;
      payload.business_id = payload.businessInfo.business_id;
      payload.user_sub_type = payload.userInfo.user_sub_type || null;
      yield alertService.closeAlert(logHandler, payload);
      return {};
    })().then(
      (data) => {
        resolve(data);
      },
      (error) => {
        reject(error);
      }
    );
  });
}

function editAlertPriority(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let priority_array = payload.priority_array;
      for (let i = 0; i < priority_array.length; i++) {
        yield alertService.updateAlert(logHandler, { alert_id : priority_array[i].alert_id, priority : priority_array[i].priority });
        logger.trace(logHandler, { priority : priority_array[i].priority, alert_id : priority_array[i].alert_id });
      }
      return {};
    })().then(
      (data) => {
        resolve(data);
      },
      (error) => {
        reject(error);
      }
    );
  });
}

function getAlertByIdentifier(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let alertInfo = yield alertService.getAlertByIdentifier(logHandler, payload.identifier);
      return alertInfo;
    })().then(
      (data) => {
        resolve(data);
      },
      (error) => {
        reject(error);
      }
    );
  });
}


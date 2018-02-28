

const alertService    = require('../services/alert');
const utils           = require('../Controller/utils');
const logger          = require('../Routes/logging');
const constants       = require('../Utils/constants');
const _               = require('underscore');
const Promise         = require("bluebird");

exports.initiallizeWidget   = initiallizeWidget;

function initiallizeWidget(req, res, next) {
  let logHandler = {
    apiModule  : "alert",
    apiHandler : "initiallizeWidget"
  };
  Promise.coroutine(function* () {
    next();
    if(req.body.source != constants.source.WIDGET) {
      logger.trace(logHandler, { EVENT : "initializeWidget", RESULT : req.body.source });
      return {};
    }
    let alertInfo = yield alertService.getAlertByIdentifier(logHandler, constants.alertIdentifier.IDENTIFIER);
    if(_.isEmpty(alertInfo)) {
      logger.info(logHandler, { EVENT : "initializeWidget" });
      return {};
    }
    let opts = {};
    opts.userInfo = req.body.userInfo;
    if(req.body.userInfo.user_sub_type == constants.userSubType.AGENT) {
      opts.agent_id = req.body.userInfo.user_id;
      opts.alert_id = alertInfo[0].alert_id;
      opts.user_sub_type = req.body.userInfo.user_sub_type;
    } else {
      opts.agent_id = req.body.userInfo.user_id || undefined;
      opts.alert_id = alertInfo[0].alert_id;
      opts.user_sub_type = req.body.userInfo.user_sub_type || undefined;
      opts.business_id = req.body.businessInfo.business_id;
    }
    let data = yield alertService.checkIfAlertClosed(logHandler, opts);
    if(data) {
      logger.trace(logHandler, { EVENT : "initializeWidget", RESULT : "RESULT ALREADY CLOSED" });
      return {};
    }
    yield alertService.closeAlert(logHandler, opts);

    return {};
  })().then(
    (data) => {
      logger.trace(logHandler, { EVENT : "initiallizeWidget", RESULT : data });
    },
    (error) => {
      logger.error(logHandler, { EVENT : "initiallizeWidget", ERROR : error });
    }
  );
}

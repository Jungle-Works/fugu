const Promise             = require('bluebird');
const dbHandler           = require('../database').dbHandler;
const _                   = require('underscore');
const constants           = require('../Utils/constants');
const utils               = require('../Controller/utils');
const logger              = require('../Routes/logging');
const mqHandler           = require('../rabbitmq/mqHandler');
const utilityService      = require('../services/utility');
const businessService     = require('../services/business');
const rabbitMQBuilder     = require('../Builder/rabbitMQ');



exports.archiveMessage                         = archiveMessage;
exports.dispatchMessage                        = dispatchMessage;




function archiveMessage(logHandler, mqMessageObject) {
  Promise.coroutine(function* () {
  // logger.info(logHandler,{ ARCHIVE_MESSAGE : mqMessageObject});

    let businessConfig = yield businessService.getConfiguration(logHandler, { business_id : mqMessageObject.business_id });

    let publishContent = {};
    publishContent.routingKey = mqHandler.mqConfig.FUGU_CORE_MESSAGES.ROUTING_KEY;
    publishContent.content = mqMessageObject;


    if(mqMessageObject.user_type == constants.userType.CUSTOMER && utils.parseInteger(businessConfig[constants.businessConfig.adroitAssignAutoAssign])) {
      publishContent.delay = utils.getMilliSecs(businessConfig[constants.businessConfig.adroitAssignAgentInactivityDuration]);
      mqHandler.publish(logHandler, publishContent);
    } else if(mqMessageObject.user_type == constants.userType.AGENT && utils.parseInteger(businessConfig[constants.businessConfig.adroitAssignAutoClose])) {
      publishContent.delay = utils.getMilliSecs(businessConfig[constants.businessConfig.adroitAssignCustomerInactivityDuration]);
      mqHandler.publish(logHandler, publishContent);
    }
  })().then((data) => {
  }, (error) => {
    logger.error(logHandler, error);
  });
}



function dispatchMessage(logHandler, payload, cb) {
  Promise.coroutine(function* () {
    let mqMessage = payload.mqMessage;
    if(!utils.validKeyValues(mqMessage)) {
      logger.error(logHandler, { INVALID_MQ_MESSAGE : payload });
      return {};
    }


    if(mqMessage.mq_message_type == rabbitMQBuilder.mqMessageType.MESSAGE) {
      if(mqMessage.core_message) {
        yield utilityService.adroitAssignFlow(logHandler, payload);
      }
    } else {
      logger.error(logHandler, "No routing found for message ", payload);
    }
    return {};
  })().then((data) => {
    cb(null, data);
  }, (error) => {
    cb(error);
  });
}

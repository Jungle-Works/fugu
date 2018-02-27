const amqp                = require('amqplib/callback_api');
const logger              = require('../Routes/logging');
const _                   = require('underscore');
const constants           = require('../Utils/constants');
const utils               = require('../Controller/utils');
const async               = require('async');
const config              = require('config');
const dispatcherService   = require('../services/dispatcher');



exports.intializeMQ                       = intializeMQ;
exports.publish                           = publish;


let amqpConnection = null;
const mqConnectionRetryTimeout = 50000;

const exchange = {
  FUGU_DELAYED : 'fugu_delayed'
};
const exchange_type = "x-delayed-message";
const exchange_options = {
  autoDelete : false, durable    : false, passive    : true,  arguments  : { 'x-delayed-type' : "direct" }
};

const mqConfig = {
  FUGU_CORE_MESSAGES : { QUEUE : 'fugu-core-messages', ROUTING_KEY : 'fugu.core.messages', QUEUE_OPTIONS : { durable : true } },
  FUGU_EVENT_BILLING : { QUEUE : 'fugu-event-billing', ROUTING_KEY : 'fugu.event.billing', QUEUE_OPTIONS : { durable : true } }
};

exports.mqConfig = mqConfig;

let publishQToChannel = {};



function intializeMQ(logHandler) {
  return new Promise((resolve, reject) => {
    amqp.connect(config.get('AMQP.url'), (err, conn) => {
      if(err) {
        logger.info(logHandler, { AMQP_ERROR : err }); // error
        setTimeout(() => {
          intializeMQ(logHandler).then(result => resolve(result), error => reject(error));
        }, mqConnectionRetryTimeout);
        return;
      }

      conn.on("error", (err) => {
        amqpConnection = null;
        publishQToChannel = {};
        // error
        if(err.message !== "Connection closing") {
          logger.info(logHandler, { AMQP_CONNECTION_ERROR : err });
        }
      });

      conn.on("close", () => {
        amqpConnection = null;
        publishQToChannel = {};
        logger.info(logHandler, "[AMQP] reconnecting"); // error
        setTimeout(() => {
          intializeMQ(logHandler).then(result => resolve(result), error => reject(error));
        }, mqConnectionRetryTimeout);
      });

      logger.info(logHandler, "[AMQP] connected ");
      amqpConnection = conn;
      subscribeChannel(logHandler);
      return resolve(conn);
    });
  });
}

function closeOnErr(logHandler, err) {
  if(!err) {
    return false;
  }
  logger.error(logHandler, { AMQP_ERROR : err });
  amqpConnection.close();
  return true;
}





function publish(logHandler, publishContent) {
  logger.info(logHandler, { AMQP_PUBLISH : publishContent });

  try {
    getPublishChannel(logHandler, publishContent.routingKey, (err, channel) => {
      if(err) {
        logger.info(logHandler, "[AMQP] getPublishChannel error ", err);// error
        return;
      }
      try {
        channel.publish(
          exchange.FUGU_DELAYED, publishContent.routingKey, new Buffer(JSON.stringify(publishContent.content)), { headers : { "x-delay" : 10000 } },
          (err, ok) => {
            if(err) {
              logger.error(logHandler, "[AMQP] publish error ", err);
              channel.connection.close();
              publishQToChannel[publishContent.routingKey] = null;
            }
          }
        );
      } catch (err) {
        logger.error(logHandler, "[AMQP] publish failed", { AMQP_PUBLISH_ERROR : err });
      }
    });
  } catch (err) {
    logger.logError(logHandler, "mq publish error", err);
  }
}



function getPublishChannel(logHandler, routingKey, cb) {
  if(publishQToChannel[routingKey]) {
    return cb(null, publishQToChannel[routingKey]);
  }
  if(!amqpConnection) {
    return cb(new Error("[AMQP] not connected"));
  }
  amqpConnection.createConfirmChannel((err, channel) => {
    if(closeOnErr(logHandler, err)) {
      return cb(err);
    }
    channel.on("error", (err) => {
      logger.error(logHandler, "[AMQP] publish channel error", { AMQP_CHANNEL_ERROR : err });
    });
    channel.on("close", () => {
      logger.error(logHandler, "[AMQP] publish channel closed");
    });

    channel.assertExchange(exchange.FUGU_DELAYED, exchange_type, exchange_options);
    channel.assertQueue(mqConfig.FUGU_CORE_MESSAGES.QUEUE, mqConfig.FUGU_CORE_MESSAGES.QUEUE_OPTIONS);
    channel.bindQueue(mqConfig.FUGU_CORE_MESSAGES.QUEUE, exchange.FUGU_DELAYED, mqConfig.FUGU_CORE_MESSAGES.ROUTING_KEY);
    publishQToChannel[routingKey] = channel;
    return cb(null, publishQToChannel[routingKey]);
  });
}






function subscribeChannel(logHandler) {
  amqpConnection.createConfirmChannel((err, channel) => {
    if(closeOnErr(logHandler, err)) {
      return cb(err);
    }
    channel.on("error", (err) => {
      logger.error(logHandler, "[AMQP] subscriber channel error", { AMQP_CHANNEL_ERROR : err });
    });
    channel.on("close", () => {
      logger.error(logHandler, "[AMQP] subscriber channel closed");
    });



    channel.prefetch(1);
    channel.assertQueue(mqConfig.FUGU_CORE_MESSAGES.QUEUE, mqConfig.FUGU_CORE_MESSAGES.QUEUE_OPTIONS, (err, res) => {
      if(closeOnErr(err)) {
        return;
      }
      channel.consume(mqConfig.FUGU_CORE_MESSAGES.QUEUE, processMessage, { noAck : false });
      logger.info(logHandler, "[AMQP] subscriber started");
    });


    function processMessage(msg) {
      handleMqMessage(msg, (err, done) => {
        try {
          if(done) { channel.ack(msg); } else { channel.reject(msg, true); }
        } catch (e) {
          closeOnErr(e);
        }
      });
    }
  });
}


function handleMqMessage(msg, cb) {
  const logHandler = {
    apiModule  : "mqHandler",
    apiHandler : "handleMqMessage"
  };
  let mqMessage = utils.jsonToObject(logHandler, msg.content.toString());
  logger.info(logHandler, { AMQP_SUB_MESSAGE : mqMessage, RECIEVED_AT : new Date() });
  dispatcherService.dispatchMessage(logHandler, { mqMessage : mqMessage }, (err, res) => {
    if(err) {
      logger.error(logHandler, "Error occurred while dispatching mq message", err);
      return cb(null, true);
    }
    return cb(null, true);
  });
}

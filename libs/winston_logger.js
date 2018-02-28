
let url             = require('url');
let useragent       = require('useragent');
let winston         = require('winston');
let WinstonRotate   = require('winston-daily-rotate-file');
let path            = require('path');
let utils           = require('../Controller/utils');
let logger          = require('../Routes/logging');

let Logger          = {};

Logger.options = {
  name          : 'fugu-logs',
  filename      : path.join(__dirname, '..', 'fugu_logs/fugu.log'),
  datePattern   : '.dd-MM-yyyy',
  maxDays       : 2,
  zippedArchive : true
};
Logger.requestFormat = {
  statusCode   : ':statusCode',
  method       : ':method',
  url          : ':url[pathname]',
  responseTime : ':responseTime ms',
  ip           : ':ip',
  userAgent    : ':userAgent',
  data         : ':data',
  response     : ':response'
};
Logger.winstonRotateObj = new WinstonRotate(Logger.options);
Logger.transports       = [Logger.winstonRotateObj];
Logger.winstonLogger    = new winston.Logger({ level : 'debug', transports : Logger.transports });

const enableWinstonLogger = true;

function log(loggingLevel, loggingParameters) {
  if(!enableWinstonLogger) {
    return;
  }
  let winstonLogger = Logger.winstonLogger;

  let handlingInfo = loggingParameters[0];
  let apiModule    = handlingInfo.apiModule;
  let apiHandler   = handlingInfo.apiHandler;


  let requestId = handlingInfo.uuid ? ' - ' + handlingInfo.uuid + ' ' : '';
  let loggingTime = '[ ' + utils.getLoggingTime() + requestId + ' ] ';
  for (let i = 1; i < loggingParameters.length; i++) {
    winstonLogger.log(logger.levelToWinstonLevel[loggingLevel], loggingTime + apiModule + ' ::: ' + apiHandler + ' ::: ' + JSON.stringify(loggingParameters[i]) + '\n');
  }
}

exports.log  = log;

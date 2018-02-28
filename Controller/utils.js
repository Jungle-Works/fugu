

const async         = require('async');
const request       = require('request');
const AWS           = require('aws-sdk');
const fs            = require('fs');
const crypto        = require('crypto');
const _             = require('underscore');
const zlib          = require('zlib');
const multiparty    = require('multiparty');
const constants     = require('../Utils/constants');
const logger        = require('../Routes/logging');
const UniversalFunc = require('../Utils/universalFunctions');

exports.uploadFileToS3Bucket                = uploadFileToS3Bucket;
exports.uploadFileStreamToS3Bucket          = uploadFileStreamToS3Bucket;
exports.parseMultipartStream                = parseMultipartStream;
exports.addAllKeyValues                     = addAllKeyValues;
exports.addAllKeyValuesExcept               = addAllKeyValuesExcept;
exports.validator                           = validator;
exports.isDefined                           = isDefined;
exports.jsonToObject                        = jsonToObject;
exports.jsonParse                           = jsonParse;
exports.objectToJson                        = objectToJson;
exports.parseErrorAndGetMessage             = parseErrorAndGetMessage;
exports.isString                            = isString;
exports.isValidObject                       = isValidObject;
exports.getSHAOfObject                      = getSHAOfObject;
exports.cloneObject                         = cloneObject;
exports.getCurrentTime                      = getCurrentTime;
exports.isEmptyString                       = isEmptyString;
exports.downloadFile                        = downloadFile;
exports.toTitleCase                         = toTitleCase;
exports.isValidArray                        = isValidArray;
exports.objectStringify                     = objectStringify;
exports.validStringifiedJson                = validStringifiedJson;
exports.getLoggingTime                      = getLoggingTime;
exports.getFormattedAddress                 = getFormattedAddress;
exports.isHexaColor                         = isHexaColor;
exports.zlibDeCompress                      = zlibDeCompress;
exports.isHtml                              = isHtml;
exports.HtmlReplacer                        = HtmlReplacer;
exports.validKeyValues                      = validKeyValues;
exports.convertToKeyMap                     = convertToKeyMap;
exports.getMilliSecs                        = getMilliSecs;
exports.parseInteger                        = parseInteger;
exports.compareDate                         = compareDate;
exports.equalsIgnoreCase                    = equalsIgnoreCase;
exports.getAllValuesFromMap                 = getAllValuesFromMap;
exports.getAllKeysFromMap                   = getAllKeysFromMap;
exports.getDaysInMonth                      = getDaysInMonth;
exports.getSpecifiedKeyMapFromExistingMap   = getSpecifiedKeyMapFromExistingMap;
exports.getDate                             = getDate;
exports.getRemainingProratedDaysInMonth     = getRemainingProratedDaysInMonth;
exports.getInvoiceId                        = getInvoiceId;
exports.getLastDateOfMonth                  = getLastDateOfMonth;
exports.getBillingDuration                  = getBillingDuration;
exports.isEnv                               = isEnv;
exports.getEnv                              = getEnv;
exports.getSHA256                           = getSHA256;
exports.addMinutesToDate                    = addMinutesToDate;
exports.encryptText                         = encryptText;
exports.decryptText                         = decryptText;
exports.getDefaultMessage                   = getDefaultMessage;
exports.parseBoolean                        = parseBoolean;
exports.isValidInteger                      = isValidInteger;
exports.getPublicNoteByChatType             = getPublicNoteByChatType;
exports.securedBusiness                     = securedBusiness;
exports.mysqlEscapeString                   = mysqlEscapeString;

/**
 * Uploads a file S3 bucket
 * @param  {string}   filePath path/to/file
 * @param  {Function} callback called with uploaded file's s3 url
 */
function uploadFileToS3Bucket(opts, callback) {
  let s3Folder  = opts.s3Folder;
  let filePath  = opts.filePath;
  let fileName  = opts.fileName;

  let error;
  if(!fileName) {
    error = new Error("Missing file name");
    return callback(error);
  }

  fs.readFile(filePath, (error, data) => {
    if(error) {
      return callback(error);
    }
    // Generate random fileId


    let baseURL   = constants.AWSSettings.baseURL;
    let s3Url     = baseURL + "/" + s3Folder + "/" + fileName;


    AWS.config.update({
      signatureVersion : 'v4',
      accessKeyId      : constants.AWSSettings.awsAccessKey,
      secretAccessKey  : constants.AWSSettings.awsSecretKey
    });
    let s3bucket = new AWS.S3();
    let params = {
      Bucket : constants.AWSSettings.awsBucket,
      Key    : s3Folder + "/" + fileName,
      Body   : data,
      ACL    : constants.AWSSettings.options.acl
    };
    s3bucket.putObject(params, (error, data) => {
      if(error) {
        return callback(error);
      }
      opts.s3Url = s3Url;
      console.log("File uploaded at :", s3Url);
      return callback(null, { url : s3Url });
    });
  });
}

/**
 * Uploads a file S3 bucket
 * @param  {string}   filePath path/to/file
 * @param  {Function} callback called with uploaded file's s3 url
 */
function uploadFileStreamToS3Bucket(opts, callback) {
  let s3Folder  = opts.s3Folder;
  let fileName  = opts.fileName;
  let data      = opts.data;

  let error;
  if(!fileName) {
    error = new Error("Missing file name");
    return callback(error);
  }

  if(!data) {
    error = new Error("Invalid data stream");
    return callback(error);
  }

  let baseURL   = constants.AWSSettings.baseURL;
  let s3Url     = baseURL + "/" + s3Folder + "/" + fileName;


  AWS.config.update({
    signatureVersion : 'v4',
    accessKeyId      : constants.AWSSettings.awsAccessKey,
    secretAccessKey  : constants.AWSSettings.awsSecretKey
  });
  let s3bucket = new AWS.S3();
  let params = {
    Bucket : constants.AWSSettings.awsBucket,
    Key    : s3Folder + "/" + fileName,
    Body   : data,
    ACL    : constants.AWSSettings.options.acl
  };

  s3bucket.putObject(params, (error, data) => {
    if(error) {
      return callback(error);
    }
    opts.s3Url = s3Url;
    logger.info("File uploaded at :", s3Url);
    return callback(null, { url : s3Url });
  });
}

function parseMultipartStream(stream, callback) {
  let form = new multiparty.Form();
  form.parse(stream, (err, fields, files) => {
    if(err) {
      logger.error("Error occurred while parsing stream", err);
      return callback(err);
    }
    let opts = {};
    opts.files = files;
    _.each(fields, (value, key) => {
      opts[key] = value[0];
    });
    return callback(null, opts);
  });
}

function addAllKeyValues(source, dest) {
  _.each(source, (value, key) => {
    dest[key] = value;
  });
}

function addAllKeyValuesExcept(source, dest, except) {
  _.each(source, (value, key) => {
    if(!(key in except)) { dest[key] = value; }
  });
}

function validator(opts, requiredFields) {
  for (let i = 0; i < requiredFields.length; i++) {
    if(!opts[requiredFields[i]]) {
      return false;
    }
  }
  return true;
}
function isDefined(variable) {
  if(typeof variable !== 'undefined') {
    return true;
  }
  return false;
}

function jsonToObject(logHandler, data) {
  try {
    return JSON.parse(data);
  } catch (error) {
    logger.error(logHandler, "Error in jsonToObject conversion", { data : data });
    return {};
  }
}

function jsonParse(data) {
  try {
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

function validStringifiedJson(logHandler, data) {
  try {
    JSON.parse(data);
    return true;
  } catch (error) {
    logger.error(logHandler, "Invalid stringifiedJson", { data : data });
    return false;
  }
}

function objectToJson(logHandler, data) {
  try {
    return JSON.stringify(data);
  } catch (error) {
    logger.error(logHandler, "Error in objectToJson conversion", { data : data });
    return "";
  }
}

function objectStringify(data, replacer, space) {
  try {
    return JSON.stringify(data, replacer, space);
  } catch (error) {
    return "";
  }
}

function cloneObject(data) {
  return Object.assign({}, data);
}

function getCurrentTime() {
  return toISOString(new Date());
}

// "DD-MM HH:mm:ss.SSS"
function getLoggingTime() {
  let date = new Date();
  return  pad(date.getUTCMonth() + 1)
    + '-' + pad(date.getUTCDate())
    + ' ' + pad(date.getUTCHours())
    + ':' + pad(date.getUTCMinutes())
    + ':' + pad(date.getUTCSeconds())
    + '.' + String((date.getUTCMilliseconds() / 1000).toFixed(3)).slice(2, 5);
}

function pad(number) {
  var r = String(number);
  if(r.length === 1) {
    r = '0' + r;
  }
  return r;
}

// yyyy-MM-dd'T'HH:mm:ss.SSS'Z'
function toISOString(date) {
  return date.getUTCFullYear()
    + '-' + pad(date.getUTCMonth() + 1)
    + '-' + pad(date.getUTCDate())
    + 'T' + pad(date.getUTCHours())
    + ':' + pad(date.getUTCMinutes())
    + ':' + pad(date.getUTCSeconds())
    + '.' + String((date.getUTCMilliseconds() / 1000).toFixed(3)).slice(2, 5)
    + 'Z';
}

function getDate(date) {
  return date.getUTCFullYear()
    + '-' + pad(date.getUTCMonth() + 1)
    + '-' + pad(date.getUTCDate());
}

function getSHAOfObject(input) {
  return crypto.createHash('sha1').update(JSON.stringify(input)).digest('hex');
}

function isString(data) {
  return (typeof data == 'string') || (data instanceof String);
}

function isValidObject(data) {
  return !!(data);
}

function isEmptyString(str) {
  return (!str || str.length === 0 || !str.trim());
}

function downloadFile(url, dest, cb) {
  let https = require('https');
  let fs = require('fs');
  let file = fs.createWriteStream(dest);
  let request = https.get(url, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close(cb);
    });
  }).on('error', (err) => {
    fs.unlink(dest);
    if(cb) { return cb(err); }
  });
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function parseErrorAndGetMessage(error) {
  if(!isDefined(error) || !isDefined(error.stack)) {
    return error || "Some Error Occurred";
  }

  let cause = error.stack.split("\n")[0];
  let messageAndCause = {
    DUPLICATE_CANNED_TITLE : {
      keys    : ["ER_DUP_ENTRY", "title_key"],
      message : "Title already exists. Please choose a new title"
    },
    DUPLICATE_CANNED_SKU : {
      keys    : ["ER_DUP_ENTRY", "sku_key"],
      message : "SKU already exists. Please choose a new sku"
    }
  };

  for (let key in messageAndCause) {
    let searchKeys = messageAndCause[key].keys;
    if(keyListInString(searchKeys, cause)) { return messageAndCause[key].message; }
  }
  return "Some Error Occurred";
}

function keyListInString(list, string) {
  for (let i = 0; i < list.length; i++) {
    const index = string.indexOf(list[i]);
    if(index < 0) { return false; }
    string = string.substr(index + list[i].length, string.length);
  }
  return true;
}


function isValidArray(result) {
  if(result && Array.prototype.isPrototypeOf(result) && result.length) return true;
  return false;
}


function zlibDeCompress(chunk, compressed, cb) {
  if(!compressed) {
    return cb(null, chunk);
  }
  zlib.gunzip(chunk, (err, dezipped) => {
    if(err) {
      console.error("Error while decompression ", err);
      return cb(err);
    }
    cb(null, dezipped.toString());
  });
}

function isHexaColor(sNum) {
  let re = /[0-9A-Fa-f]{6}/g;
  return (typeof sNum === "string") && sNum.length === 7 && sNum[0] == '#'
          && re.test(sNum.substr(1, 7));
}

function getFormattedAddress(logHandler, attributes) {
  let full_address = [];
  if(attributes) {
    logger.trace(logHandler, attributes);
    attributes = jsonParse(attributes);
    logger.trace(logHandler, attributes);
    if(attributes.address) {
      for (let key of constants.userAddressKeys) {
        if((key in attributes.address) && attributes.address[key]) {
          full_address.push(attributes.address[key]);
        }
      }
    }
  }
  return full_address.join(", ");
}


function isHtml(data) {
  let exp = constants.regExp.HTML;
  return exp.test(data);
}

function HtmlReplacer(data) {
  return data.replace(constants.regExp.REPLACE_HTML_TAG, constants.replaceHtmlTagWith);
}

function validKeyValues(object) {
  _.each(object, (value, key) => {
    if(!isDefined(value)) {
      return false;
    }
  });
  return true;
}

function convertToKeyMap(data, key) {
  let map = {};
  if(_.isEmpty(data)) {
    throw new Error("nothing to convert");
  }
  if(!key) {
    throw new Error("Invalid key in convertToKeyMap");
  }
  _.each(data, (row) => {
    if(!_.has(row, key) || !row[key]) {
      throw new Error("Invalid key or not found in convertToKeyMap for row " + JSON.stringify(row));
    }
    if(map[row[key]]) {
      throw new Error("Duplicate key found " + JSON.stringify(row));
    }

    map[row[key]] = row;
  });
  return map;
}


function getMilliSecs(minutes) {
  return minutes * 60 * 1000;
}


function parseInteger(string, radix) {
  return parseInt(string, radix);
}

function parseBoolean(string) {
  if(string === 'true') {
    return true;
  }
  if(string === 'false') {
    return false;
  }
  return undefined;
}

function compareDate(date1, date2) {
  // console.log(date1,date2);
  let d1 = new Date(date1).getTime();
  let d2 = new Date(date2).getTime();
  if(d1 == d2) {
    return 0;
  }
  if(d1 > d2) {
    return 1;
  }
  return -1;
}

function equalsIgnoreCase(string1, string2) {
  if(!string1 || !string2) { return false; }
  return string1.toUpperCase() === string2.toUpperCase();
}

function getAllValuesFromMap(map) {
  let values = [];
  _.each(map, (value, key) => {
    values.push(value);
  });
  return values;
}

function getAllKeysFromMap(map) {
  let keys = [];
  _.each(map, (value, key) => {
    keys.push(key);
  });
  return keys;
}

// Month is 1 based
function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

function getSpecifiedKeyMapFromExistingMap(map, specifiedKeys) {
  let data = {};
  specifiedKeys.forEach((key) => {
    if(map[key]) {
      data[key] = map[key];
    }
  });
  return data;
}

function getRemainingProratedDaysInMonth(date) {
  let currentDate = date.getDate();
  let daysInMonth = getDaysInMonth(date.getMonth() + 1, date.getFullYear());
  return  (daysInMonth - currentDate + 1) / daysInMonth;
}

function getInvoiceId(business_id) {
  return  "INV-" + getDate(new Date()) + "-" + business_id + "-" + UniversalFunc.generateRandomString(5);
}

function getLastDateOfMonth(date) {
  let clonedDate = new Date(date);
  let lastDate   = getDaysInMonth(clonedDate.getMonth() + 1, clonedDate.getFullYear());
  clonedDate.setDate(lastDate);
  return clonedDate;
}

function getBillingDuration(bill_start_date) {
  let month = constants.monthName[bill_start_date.getMonth() + 1].substring(0, 3);
  let start = pad(bill_start_date.getDate());
  let end   = getDaysInMonth(bill_start_date.getMonth() + 1, bill_start_date.getFullYear());
  return month + " " + start + " - " + month + " " + end;
}

function isEnv(env) {
  return process.env.NODE_ENV == env;
}

function getEnv() {
  return process.env.NODE_ENV;
}

function getSHA256(input) {
  return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

function addMinutesToDate(date, min) {
  date.setMinutes(date.getMinutes() + min);
  return date;
}


function encryptText(text) {
  let cipher = crypto.createCipher('cipher', 'key');
  let encrypted = cipher.update(text.toString(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptText(text) {
  try {
    let decipher = crypto.createDecipher('cipher', 'key');
    let decrypted = decipher.update(text.toString(), 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error("Error while decryption " + text);
    return undefined;
  }
}

// TODO : refactor
function getDefaultMessage(handlerInfo, messageType, opts) {
  if(messageType != constants.messageType.CALL_TO_ACTION) {
    return constants.defaultMessageBasedOntype[messageType];
  }
  if(!opts.agent_name || opts.agent_name == "") {
    opts.agent_name = "Agent";
  }
  return constants.defaultMessageBasedOntype[messageType].replace('{{{agent_name}}}', opts.agent_name);
}

function isValidInteger(number) {
  let reg = new RegExp('^[0-9]+$');
  return reg.test(number);
}


function getPublicNoteByChatType(logHandler, fullName, chatType, message) {
  logger.trace(logHandler, fullName, chatType, message);
  switch (chatType) {
    case constants.chatType.P2P:
    case constants.chatType.O20_CHAT:
    case constants.chatType.PRIVATE_GROUP:
      message = fullName += ' marked group Private';
      return  message;
    case constants.chatType.PUBLIC_GROUP:
      message = fullName += ' marked group Public';
      return  message;
    default:
      return message += " public note";
  }
}


function securedBusiness(businessInfo) {
  if(!businessInfo) {
    return false;
  }
  if(businessInfo.reseller_id == 3 || businessInfo.reseller_id == 14) {
    return true;
  }
  return false;
}

function mysqlEscapeString(str) {
  if(!str) {
    return "";
  }
  return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%?]/g, (char) => {
    switch (char) {
      case "\0":
        return "\\0";
      case "\x08":
        return "\\b";
      case "\x09":
        return "\\t";
      case "\x1a":
        return "\\z";
      case "\n":
        return "\\n";
      case "\r":
        return "\\r";
      case "\"":
      case "'":
      case "\\":
      case "%":
        return "\\" + char;
      default:
        return "";
    }
  });
}

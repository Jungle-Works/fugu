

const Promise                 = require('bluebird');
const fs                      = require('fs');
const Handlebars              = require('handlebars');
const NodeGeocoder            = require('node-geocoder');
const iplocation              = require('geoip2');
const request                 = require('request');
const requireg                = require('requireg');
const _                       = require('underscore');
const utils                   = require('../Controller/utils');
const constants               = require('../Utils/constants');
const logger                  = require('../Routes/logging');
const UniversalFunc           = require('../Utils/universalFunctions');
const dbHandler               = require('../database').dbHandler;

const geocoder                = NodeGeocoder(constants.geocoderOptions.OPTIONS);
const pdfTemplates            = require('../Config/pdfTemplates');
const userService             = require('../services/user');
const conversationService     = require('../services/conversation');
const channelService          = require('../services/channel');
const businessService         = require('../services/business');

iplocation.init();


exports.uploadFile                  = uploadFile;
exports.initiateAutoPilotCampaign   = initiateAutoPilotCampaign;
exports.getAddressFromGeoCoder      = getAddressFromGeoCoder;
exports.getAddressFromIP            = getAddressFromIP;
exports.insertIntoLogException      = insertIntoLogException;
exports.sendHttpRequest             = sendHttpRequest;
exports.getAppVersion               = getAppVersion;
exports.adroitAssignFlow            = adroitAssignFlow;
exports.createPdf                   = createPdf;
exports.createTicketAtBulbul        = createTicketAtBulbul;

function uploadFile(logHandler, payload) {
  return new Promise((resolve, reject) => {
    if(!payload.file) {
      logger.error(logHandler, "Invalid file content", payload.file);
      return resolve();
    }

    let options = {};
    options.files = [];
    options.files.push(payload.file);
    if(!payload.keepOriginalFileName) {
      options.replacefileName =  UniversalFunc.generateRandomString(10) + "_" + (new Date()).getTime();
    }

    Promise.promisify(prepareFileAndUpload).call(null, logHandler, options).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function prepareFileAndUpload(logHandler, req, callback) {
  let error;
  if(!(req.files && req.files.length)) {
    error = new Error("No file found");
    return callback(error);
  }


  let parentFolder = !utils.isEnv('production') ? 'test/' : "";
  let file = req.files[0];
  let s3Folder = parentFolder + constants.getAWSFolder(file.mimeType);
  const opts = {
    filePath : file.path,
    fileName : file.originalname,
    s3Folder : s3Folder.split(' ').join('_')
  };
  opts.fileName = (req.replacefileName) ? req.replacefileName + '.' + opts.fileName.split('.').pop() : opts.fileName;

  utils.uploadFileToS3Bucket(opts, (error, urlObj) => {
    if(error) {
      logger.error(logHandler,  { Error : error.message });
      return callback(error);
    }
    let response = {
      url : urlObj.url
    };
    callback(null, response);
  });
}

function initiateAutoPilotCampaign(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      yield autoPilotCampaign(logHandler, payload);
      yield tirggerSignUpCampaign(logHandler, constants.autoPilotSignUpTriggerId.ID, payload.email);
      return true;
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject();
    });
  });
}


function autoPilotCampaign(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let name = payload.full_name.split(' ');
    let body = {
      contact : {
        FirstName    : name[0],
        LastName     : name[name.length - 1],
        Email        : payload.email,
        BusinessName : payload.business_name,
        Phone        : payload.contact_number,
        CustomFields : {
          access_token : "not found"
        }
      }
    };
    logger.trace(logHandler, { EVENT : "BODY OF REQUEST autoPilotCampaign", BODY : body });

    request({
      method  : 'POST',
      url     : constants.addContacts.URL,
      headers : {
        autopilotapikey : constants.autoPilotApiKey.KEY,
        'Content-Type'  : 'application/json'
      },
      body : JSON.stringify(body)
    }, (error, response, body) => {
      logger.trace(logHandler, {
        EVENT      : "AUTOPILOT RESPOSE", statusCode : response, Response   : body, ERROR      : error
      });
      return resolve();
    });
  });
}

function tirggerSignUpCampaign(logHandler, triggerId, contactId) {
  return new Promise((resolve, reject) => {
    request({
      method  : 'POST',
      url     : constants.triggerCampaign.URL.replace('ID', triggerId) + '/' + contactId,
      headers : {
        autopilotapikey : constants.autoPilotApiKey.KEY
      }
    }, (error, response, body) => {
      logger.trace(logHandler, { EVENT : "tirggerSignUpCampaign", statusCode : response, CONTACTID : contactId });
    });
    return resolve();
  });
}


function getAddressFromGeoCoder(logHandler, latLong) {
  return new Promise((resolve, reject) => {
    latLong = latLong.split(',');
    geocoder.reverse({ lat : latLong[0], lon : latLong[1] }).then((data) => {
      let address = data;
      resolve({
        city         : address[0].city,
        zip_code     : address[0].zipcode,
        latitude     : address[0].latitude,
        country      : address[0].country,
        country_code : address[0].countryCode,
        longitude    : address[0].longitude,
        region_name  : address[0].administrativeLevels.level2long,
        state        : address[0].administrativeLevels.level1long
      });
    }, (error) => {
      logger.error(logHandler, "Error while fetching geo location", error);
      resolve({});
    });
  });
}

function getAddressFromIP(logHandler, ip, payload) {
  return new Promise((resolve, reject) => {
    ip = ip || "115.248.185.70";
    iplocation.lookupSimple(ip, (error, result) => {
      if(error) {
        logger.error(logHandler, "ERROR WHILE GETTING LOCATION FROM IP", error);
      }
      logger.trace(logHandler, "fetching location using ip", ip, result);
      result = result || [];
      resolve(result);
      if(!_.isEmpty(payload)) {
        payload.address = result;
        createTicketAtBulbul(logHandler, payload);
      }
    });
  });
}


function insertIntoLogException(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `INSERT INTO log_exception set  ? `;
    let insertObj = {
      device_details : utils.objectStringify(payload.device_details),
      device_type    : payload.device_type,
      error          : utils.objectStringify(payload.error)
    };
    let queryObj = {
      query : query,
      args  : [insertObj],
      event : "Inserting new log exception "
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function sendHttpRequest(logHandler, options) {
  return new Promise((resolve, reject) => {
    options.gzip =  true;
    logger.trace(logHandler, { HTTP_REQUEST : options });
    request(options, (error, response, body) => {
      if(error) {
        logger.error(
          logHandler, { EVENT : 'Error from external server' },
          { OPTIONS : options }, { ERROR : error }, { RESPONSE : response }, { BODY : body }
        );
        return reject(error);
      }

      if(response == undefined) {
        error = new Error('No response from external server');
        return reject(error);
      }
      if(response.statusCode < '200' || response.statusCode > '299') {
        error = new Error('Couldn\'t request with external server ');
        error.code = response.statusCode;
        logger.error(
          logHandler, { EVENT : 'Error from external server', OPTIONS : options, ERROR : error },
          { RESPONSE : response }, { BODY : body }
        );
        return reject(error);
      }

      logger.trace(
        logHandler, { EVENT : 'Response from external server', OPTIONS : options, ERROR : error },
        { RESPONSE : response }, { BODY : body }
      );
      resolve(body);
    });
  });
}


function getAppVersion(logHandler, deviceType) {
  return new Promise((resolve, reject) => {
    let query = `SELECT * from app_version where device_type = ?`;
    let values = [deviceType];
    let queryObj = {
      query : query,
      args  : values,
      event : "getAppVersion"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result[0]);
    }, (error) => {
      reject(error);
    });
  });
}


function createPdf(logHandler, template, params) {
  const pdf = Promise.promisifyAll(requireg('html-pdf'));
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      logger.trace(logHandler, "Creating pdf", { TEMPLATE : template, PARAMS : params });
      let fileName = UniversalFunc.generateRandomString(10) + '.pdf';
      let localPath = '/tmp/' + fileName;
      let renderedHtml;

      switch (template) {
        case 'INVOICE':
          renderedHtml = Handlebars.compile(pdfTemplates.invoice)(params);
          break;
        default:
          let error = new Error("No case matched while creating pdf " + template);
          logger.error(logHandler, error);
          throw error;
      }

      let pdfResponse = yield pdf.createAsync(renderedHtml, { format : 'A4', filename : localPath });
      let upload = {};
      upload.file = {
        path         : pdfResponse.filename,
        originalname : fileName
      };
      logger.error(logHandler, "uploading file", upload);
      return yield uploadFile(logHandler, upload);
    })().then(
      (data) => { resolve(data); },
      (error) => { reject(error); }
    );
  });
}

function adroitAssignFlow(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let mqMessage = payload.mqMessage;
      let channelInfo;
      let businessInfo;
      let userInfo;

      // check message content valid
      try {
        businessInfo = yield businessService.getInfo(logHandler, { business_id : mqMessage.business_id });
      } catch (error) {
        logger.error(logHandler, "Invalid business id : " + mqMessage.business_id, error);
        return {};
      }
      channelInfo = yield channelService.getInfo(logHandler, { channel_id : mqMessage.channel_id });
      if(_.isEmpty(channelInfo)) {
        logger.error("No channel found with given channel id " + mqMessage.channel_id);
        return {};
      }
      channelInfo = channelInfo[0];
      if(channelInfo.chat_type != constants.chatType.DEFAULT || channelInfo.status != constants.channelStatus.OPEN) {
        return {};
      }
      userInfo = yield userService.getInfo(logHandler, mqMessage.user_id);
      if(_.isEmpty(userInfo)) {
        logger.error("No user found with given user id " + mqMessage.user_id);
        return {};
      }
      userInfo = userInfo[0];



      let participationDetails = yield channelService.getUserToChannelDetails(logHandler, { channel_id : mqMessage.channel_id });
      let userToParticipationDetails = utils.convertToKeyMap(participationDetails, 'user_id');
      logger.trace(logHandler, "userToParticipationDetails", userToParticipationDetails);



      // flow based on customer or agent message
      if(mqMessage.user_type == constants.userType.CUSTOMER) {
        if(!channelInfo.agent_id) {
          logger.error(logHandler, "[auto] assigning chat");
        }
        if(!userToParticipationDetails[channelInfo.agent_id].last_activity ||
          utils.compareDate(mqMessage.date_time, userToParticipationDetails[channelInfo.agent_id].last_activity) > 0) {
          logger.error(logHandler, "[auto] reassigning chat and mark agent inactive(if no reply on any channel)");
        }
      } else if(mqMessage.user_type == constants.userType.AGENT) {
        if(!userToParticipationDetails[channelInfo.owner_id].last_activity ||
            utils.compareDate(mqMessage.date_time, userToParticipationDetails[channelInfo.owner_id].last_activity) > 0) {
          logger.error(logHandler, "[auto] closing chat");
          let opts = {};
          opts.status = constants.channelStatus.CLOSED;
          opts.userInfo = userInfo;
          opts.businessInfo = businessInfo;
          opts.channelInfo = channelInfo;
          opts.serverTriggered = true;
          yield conversationService.markConversation(logHandler, opts);
        }
      } else {
        logger.error(logHandler, "Invalid user type");
      }
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

function createTicketAtBulbul(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let options = {
      url    : config.get("bulbulBaseUrl") + constants.API_END_POINT.BULBUL_CREATE_TICKET,
      method : 'POST',
      json   : {
        user_id        : config.get("bulbulUserId"),
        workflow       : config.get("bulbulWorkFlowId"),
        deal_stage     : 1,
        role           : 1,
        created_from   : 1,
        name           : payload.business_name,
        contact_person : {
          name  : payload.full_name,
          email : [{
            email : payload.email
          }],
          phone : [{
            phone : payload.contact_number
          }]
        },
        organization : {
          name    : payload.business_name,
          address : ""
        },
        extra_fields : {
          source  : payload.reseller_info ? payload.reseller_info.name : "fugu",
          medium  : "fugu",
          country : payload.address ? payload.address.country : "IN"
        }
      }
    };

    if((payload.address && payload.address.country == "IN") || (payload.contact_number && payload.contact_number.indexOf('+91') > -1)) {
      options.json.assign_to = 242;
      options.json.user_id = 242;
    }
    logger.info(logHandler, {
      EVENT   : "DATA BEFORE SEND", DATA    : payload, IP      : payload.ip, ADDRESS : payload.region 
    });
    sendHttpRequest(logHandler, options).then((data) => {
      logger.trace(logHandler, { EVENT : "CREATE_TICKET_AT_BULBUL", data });
      resolve();
    }, (error) => {
      logger.error(logHandler, { EVENT : "CREATE_TICKET_AT_BULBUL", error });
      reject();
    });
  });
}

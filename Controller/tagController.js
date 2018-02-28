/**
 * Created by ashishprasher on 14/09/17.
 */



const async                         = require('async');
const RESP                          = require('../Config').responseMessages;
const request                       = require('request');
const constants                     = require('../Utils/constants');
const utils                         = require('./utils');
const logger                        = require('../Routes/logging');
const cache                         = require('memory-cache');
const config                        = require('config');
const _                             = require("underscore");
const tagService                    = require('../services/tags');
const Promise                       = require("bluebird");
const notifierService               = require('../services/notifier');
const notificationBuilder           = require('../Builder/notification');

exports.createTags                  = createTags;
exports.getTags                     = getTags;
exports.editTags                    = editTags;
exports.getChannelTags              = getChannelTags;
exports.assignTagsToChannel         = assignTagsToChannel;
exports.enableDisableTag            = enableDisableTag;

function createTags(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let tagName = payload.tag_name.trim();
      let colorCode = payload.color_code;
      let businessId = payload.businessInfo.business_id;
      let tagInfo = yield tagService.checkDuplicateTag(logHandler, businessId, tagName);
      if(!_.isEmpty(tagInfo)) {
        throw new Error(RESP.ERROR.eng.TAG_ALREADY_EXISTS.customMessage);
      }
      payload.business_id = businessId;
      let res = yield tagService.insertTags(logHandler, payload, [tagName]);
      notifierService.sendBusinessLevelNotification(payload.businessInfo.app_secret_key, notificationBuilder.notificationType.TAGS_REFRESH);
      return {
        tag : {
          tag_name   : tagName, tag_id     : res.insertId, color_code : colorCode, status     : 1
        }
      };
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}

function getTags(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let businessId = payload.businessInfo.business_id;
      let tagInfo = yield tagService.getTags(logHandler, businessId);
      return { tags : tagInfo };
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}


function editTags(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let tagId = payload.tag_id;
      let colorCode = payload.color_code;
      let tagName = payload.tag_name.trim();
      let businessId = payload.businessInfo.business_id;
      let tagInfo = yield tagService.getTagById(logHandler, tagId);
      if(_.isEmpty(tagInfo)) {
        throw new Error("Tag Doesn't Exist");
      }
      let response = yield tagService.checkDuplicateTag(logHandler, businessId, tagName);
      if(!_.isEmpty(response) && response[0].tag_id != tagId) {
        throw new Error("Tag Already Exists");
      }
      payload.business_id = businessId;
      yield tagService.updateTags(logHandler, payload);
      notifierService.sendBusinessLevelNotification(payload.businessInfo.app_secret_key, notificationBuilder.notificationType.TAGS_REFRESH);
      return {
        tag : {
          tag_id     : tagId, color_code : colorCode, tag_name   : tagName, status     : payload.status
        }
      };
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}

function getChannelTags(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let tagInfo = yield tagService.getChannelAssociatedTags(logHandler, payload.channel_id);
      return { tags : tagInfo };
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}

function assignTagsToChannel(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let channelId = payload.channel_id;
      let tagId     = payload.tag_id;
      payload.business_id = payload.businessInfo.business_id;
      let status     = payload.status;
      if(status == 1) {
        let tagInfo = yield tagService.checkTagAlreadyAssigned(logHandler, channelId, tagId);
        if(!_.isEmpty(tagInfo)) {
          if(tagInfo[0].status == 1) {
            logger.error(logHandler, { ERROR : "Tag Already Assigned" });
            return { tag : { tag_id : tagId, channel_id : channelId, status : status } };
          }
          yield tagService.updateStatusTagToChannel(logHandler, status, tagId, channelId);
        } else {
          yield tagService.assignTagToChannel(logHandler, payload, [tagId]);
        }
      } else if(status == 0) {
        yield tagService.updateStatusTagToChannel(logHandler, status, tagId, channelId);
      }
      return { tag : { tag_id : tagId, channel_id : channelId, status : status } };
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}

function enableDisableTag(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      payload.business_id = payload.businessInfo.business_id;
      let tagInfo = yield tagService.getTagById(logHandler, payload.tag_id);
      if(_.isEmpty(tagInfo)) {
        throw new Error("Invalid Tag Id");
      }
      if(tagInfo[0].is_enabled == payload.is_enabled) {
        logger.error(logHandler, "status is same for tag id" + payload.tag_id);
        return {};
      }
      yield tagService.updateTags(logHandler, payload);
      notifierService.sendBusinessLevelNotification(payload.businessInfo.app_secret_key, notificationBuilder.notificationType.TAGS_REFRESH);
      return {};
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}

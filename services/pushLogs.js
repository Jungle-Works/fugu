/**
 * Created by ashishprasher on 24/01/18.
 */

const Promise                             = require('bluebird');
const dbHandler                           = require('../database').dbHandler;


exports.insertLog                         = insertLog;
exports.updateLog                         = updateLog;



function insertLog(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `INSERT INTO push_logs (channel_id, message_id, skipped, ios_failed, ios_success, android_failed, android_success) VALUES (?,?,?,?,?,?,?)`;

    let queryObj = {
      query : query,
      args  : [payload.channel_id, payload.message_id, ' ', ' ', ' ', ' ', ' '],
      event : "insertLog"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function updateLog(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let values = [];
    let query = `UPDATE push_logs SET `;

    if(!payload.setObject) {
      resolve();
    }
    if(payload.setObject.ios_failed) {
      query += ` ios_failed = concat(COALESCE(ios_failed,' | ', ""), ?), `;
      values.push(payload.setObject.ios_failed);
    }
    if(payload.setObject.ios_success) {
      query += ` ios_success = concat(COALESCE(ios_success,' | ',  ""), ?) `;
      values.push(payload.setObject.ios_success);
    }
    if(payload.setObject.android_failed) {
      query += ` android_failed = concat(COALESCE(android_failed,' | ',  ""), ?), `;
      values.push(payload.setObject.android_failed);
    }
    if(payload.setObject.android_success) {
      query += ` android_success = concat(COALESCE(android_success,' | ',  ""), ?) `;
      values.push(payload.setObject.android_success);
    }
    if(payload.setObject.skipped) {
      query += ` skipped = concat(COALESCE(skipped,' | ',  ""), ?) `;
      values.push(payload.setObject.skipped);
    }

    query += ` WHERE channel_id = ? AND message_id = ? LIMIT 1`;

    values.push(payload.channel_id, payload.message_id);
    let queryObj = {
      query : query,
      args  : values,
      event : "updateLog"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

/**
 * Created by vidit on 28/7/17.
 */
const Promise   = require('bluebird');
const dbHandler = require('../database').dbHandler;
const md5       = require('MD5');
const logger    = require('../Routes/logging');
const _         = require('underscore');

exports.insert  = insert;
exports.update  = update;
exports.getInfo = getInfo;

function insert(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let insertObj = {
      name           : payload.name,
      email          : payload.email,
      phone_no       : payload.phone_no || '',
      reseller_token : md5(payload.email + Math.random()),
      api_key        : payload.api_key,
      certificate    : payload.certificate,
      topic          : payload.topic
    };

    let query = "INSERT INTO reseller_info SET ? ;";
    let queryObj = {
      query : query,
      args  : [insertObj],
      event : "Creating new reseller"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      insertObj.reseller_id = result.insertId;
      resolve(insertObj);
    }, (error) => {
      reject(error);
    });
  });
}

function update(logHandler, payload) {
  return new Promise((resolve, reject) => {
    logger.trace(logHandler, { EVENT : "Updating reseller info " }, { PAYLOAD : payload });
    if(_.isEmpty(payload.update_fields)) {
      return reject(new Error("Update Fields Missing"));
    }
    if(_.isEmpty(payload.where_clause)) {
      return reject(new Error("Where condition Empty"));
    }


    let updateObj = {};
    updateObj.updated_at = new Date();
    let validUpdateColumns = new Set(["name", "email", "phone_no", "reseller_token", "api_key", "certificate", "topic", "status"]);
    _.each(payload.update_fields, (value, key) => {
      if(validUpdateColumns.has(key) && (value === null || value == 0 || value)) {
        updateObj[key] = value;
      }
    });


    let values = [];
    let whereCondition = "";
    _.each(payload.where_clause, (value, key) => {
      whereCondition += " AND " + key + " = ? ";
      values.push(value);
    });


    let query = `UPDATE reseller_info set  ?  where 1=1 ${whereCondition}`;
    let queryObj = {
      query : query,
      args  : [updateObj, values],
      event : "Updating reseller info"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getInfo(logHandler, payload) {
  return new Promise((resolve, reject) => {
    logger.trace(logHandler, { EVENT : "GETTING RESELLER INFO " }, { PAYLOAD : payload });
    if(_.isEmpty(payload.where_clause)) {
      return reject(new Error("Where condition Empty"));
    }

    // where
    let whereCondition = "";
    let values = [];
    _.each(payload.where_clause, (value, key) => {
      whereCondition += " AND " + key + " = ? ";
      values.push(value);
    });

    // select
    let select = "*";
    if(!_.isEmpty(payload.select_columns)) {
      select = payload.select_columns.join(",");
    }

    let query = `Select ${select}  from reseller_info where 1=1 ${whereCondition}`;
    let queryObj = {
      query : query,
      args  : values,
      event : "GET RESELLER INFO "
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

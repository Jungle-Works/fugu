const Promise             = require('bluebird');
const _                   = require('underscore');
const dbHandler           = require('../database').dbHandler;
const constants           = require('../Utils/constants');
const utils               = require('../Controller/utils');


exports.getInfo             = getInfo;
exports.updateInfo          = updateInfo;
exports.getInfoUsingEmailOrAccessToken = getInfoUsingEmailOrAccessToken;
function getInfo(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `select * from super_admin where 1=1 `;
    let values = [];
    if(payload.email_id) {
      query += " and email= ? ";
      values.push(payload.email_id);
    }
    if(payload.password) {
      query += " and password= ? ";
      values.push(payload.password);
    }
    if(payload.user_id) {
      query += " and user_id= ? ";
      values.push(payload.user_id);
    }
    if(payload.access_token) {
      query += " and access_token= ? ";
      values.push(payload.access_token);
    }

    let queryObj = {
      query : query,
      args  : values,
      event : "getInfo"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result[0]);
    }, (error) => {
      reject(error);
    });
  });
}

function updateInfo(logHandler, payload) {
  return new Promise((resolve, reject) => {
    if(!payload.user_id) {
      return reject(new Error("Invalid user_id"));
    }

    let query = ` Update super_admin set ? where user_id = ? `;
    let updateObj = {};
    (payload.password)      ? updateObj.password = payload.password : 0;
    (payload.access_token === null || payload.access_token)  ? updateObj.access_token = payload.access_token : 0;
    payload.access_token_expiry_datetime  ? updateObj.access_token_expiry_datetime = payload.access_token_expiry_datetime : 0;

    let queryObj = {
      query : query,
      args  : [updateObj, payload.user_id],
      event : "updating super admin info"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getInfoUsingEmailOrAccessToken(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let values = [];
    let emailOrToken = "";
    if(payload.email) {
      emailOrToken = "email = ?";
      values.push(payload.email);
    } else if(payload.access_token) {
      emailOrToken = "access_token = ?";
      values.push(payload.access_token);
    } else {
      throw new Error("No valid identifier passed");
    }
    let query = `
      SELECT *
      FROM
        super_admin
      WHERE 
        ${emailOrToken}  
    `;
    let queryObj = {
      query : query,
      args  : values,
      event : "Get Admin Info "
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

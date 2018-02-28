/**
 * Created by vidit on 14/7/17.
 */
const Promise   = require('bluebird');
const dbHandler = require('../database').dbHandler;

exports.saveToken   = saveToken;
exports.deleteToken = deleteToken;
exports.getToken    = getToken;

function saveToken(logHandler, userInfo) {
  return new Promise((resolve, reject) => {
    let saveToken = "update users set web_token = ?, web_token_updated_at = now() where user_id = ?";

    let values = [userInfo.web_token, userInfo.user_id];

    let queryObj = {
      query : saveToken,
      args  : values,
      event : 'Save user web token'
    };
    dbHandler.executeQuery(logHandler, queryObj)
      .then((result) => {
        resolve(result);
      }, (error) => {
        reject(error);
      });
  });
}

function deleteToken(logHandler, userId) {
  return new Promise((resolve, reject) => {
    let disableToken = "update users set web_token = null where user_id = ?";

    let queryObj = {
      query : disableToken,
      args  : [userId],
      event : 'Disable web token of a user'
    };
    dbHandler.executeQuery(logHandler, queryObj)
      .then((result) => {
        resolve(result);
      }, (error) => {
        reject(error);
      });
  });
}

function getToken(logHandler, userList) {
  return new Promise((resolve, reject) => {
    let tokenList = "select user_id, web_token from users where  web_token_updated_at >= NOW() -" +
            " interval 1 day and user_id in (?) and token is not null";
    let queryObj = {
      query : tokenList,
      args  : [userList],
      event : 'Get All the list of token'
    };
    dbHandler.executeQuery(logHandler, queryObj)
      .then((result) => {
        resolve(result);
      }, (error) => {
        reject(error);
      });
  });
}

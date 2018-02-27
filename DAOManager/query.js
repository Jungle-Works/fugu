

const dbHandler                     = require('../database').dbHandler;
const async                         = require('async');
const constants                     = require('../Utils/constants');
const utils                         = require('../Controller/utils');
const logger                        = require('../Routes/logging');
const _                             = require('underscore');


exports.insertUsersConversation  = function (logHandler, opts, callback) {
  let sql = "INSERT INTO `users_conversation`(`business_id`,`user_id`,`channel_id`,`channel_name`,`user_name`, " +
            "`message`,`user_type`,`label_id`, `message_type`) " +
            " VALUES( ?, ?, ?, ?, ?, ?, ?, ?, ?)";

  let expectedFields = opts.message_type in constants.fieldsBasedOnMessageType ?
    constants.fieldsBasedOnMessageType[opts.message_type] : constants.fieldsBasedOnMessageType.default;

  let message = {};
  for (let i = 0; i < expectedFields.length; i++) {
    if(expectedFields[i] in opts.data) {
      message[expectedFields[i]] = opts.data[expectedFields[i]];
    }
  }
  let messageString = utils.objectToJson(logHandler, message);

  const values = [opts.business_id, opts.user_id, opts.channel_id, opts.channel_name, opts.full_name,
    messageString, opts.user_type, opts.label_id, opts.message_type];



  dbHandler.query(logHandler, "insertUsersConversation",  sql, values, (err, response) => {
    if(err) {
      return callback(err);
    }
    opts.inserted_message_id = response.insertId;
    callback(null, { insertId : response.insertId });
    exports.postConversationInsertionTask(logHandler, opts, () => {});
  });
};


exports.postConversationInsertionTask  = function (logHandler, opts, callback) {
  logger.trace(logHandler, "running postConversationInsertionTask", opts);
  let asyncTasks = [];
  asyncTasks.push(updateLastMessageForUserAndLastMessageForAgent.bind(null, opts));
  async.series(asyncTasks, (error) => {
    if(error) {
      logger.logError(logHandler, "Error occurred in postConversationTask ", error);
      return callback();
    }
    return callback();
  });
  function updateLastMessageForUserAndLastMessageForAgent() {
    const message_id = opts.inserted_message_id;
    const channel_id = opts.channel_id;
    let sql = "UPDATE `channels` SET ";
    let values = [];
    if(!constants.skipUserMessageTypesForLMUIds.has(String(opts.message_type))) {
      sql += " lmu_id = ? , ";
      values.push(message_id);
    }
    if(!constants.skipAgentMessageTypesForLMAIds.has(String(opts.message_type))) {
      sql += " lma_id = ? , ";
      values.push(message_id);
    }
    sql += " lm_updated_at = NOW() ";
    sql += " WHERE channel_id = ? ";
    values.push(opts.channel_id);
    dbHandler.query(logHandler, "updateLastMessageForUserAndLastMessageForAgent ",  sql, values, (err, response) => {
      if(err) {
        return callback(err);
      }
      return callback();
    });
  }
};
exports.insertIntoChannels  = function (logHandler, opts, callback) {
  let allowedFields = [`business_id`, `channel_name`, `status`, `channel_type`, `default_message`,
    `label`, `channel_image`, `owner_id`, `chat_type`, `transaction_id`, `agent_id`,
    `source`, `source_type`, `custom_attributes`, `channel_priority`, 'initiated_by_agent', 'custom_label'];
  let fields = [];
  let values = [];
  for (let field of allowedFields) {
    if(field in opts) {
      fields.push(field);
      values.push(opts[field]);
    }
  }
  let sql = "INSERT INTO `channels`(" + fields.join(', ') + " ) " +
            " VALUES( " + new Array(fields.length).fill("?").join(', ')  + " )";

  dbHandler.query(logHandler, "query :: insertIntoChannels ", sql, values, (err, response) => {
    if(err) {
      return callback(err);
    }

    logger.trace(logHandler, "Channel inserted into db ");
    return callback(null, response);
  });
};

exports.updateAssignedAgentInChannels  = function (logHandler, opts, callback) {
  const channel_id = opts.channel_id;
  const agent_id = opts.user_id;

  let sql = "UPDATE `channels` SET agent_id = ? WHERE channel_id = ? ";
  dbHandler.query(logHandler, " query :: updateAssignedAgentInChannels ", sql, [agent_id, channel_id], (err, response) => {
    if(err) {
      return callback(err);
    }
    return callback(null, response);
  });
};

exports.getAllUsersConversationExcludingUserId  = function (logHandler, opts, callback) {
  let values = [opts.channel_id, opts.user_id];
  let sql = "SELECT * FROM `users_conversation` WHERE `channel_id` = ? AND `user_id` != ?";
  if(utils.isDefined(opts.limit)) {
    sql += " LIMIT ?";
    values.push(opts.limit);
  }
  dbHandler.query(logHandler, "getAllUsersConversationExcludingUserId", sql, values, (err, response) => {
    if(err) {
      return callback(err);
    }
    let res = [];
    for (let i = 0; i < response.length; i++) {
      let localResponse = response[i];
      let parsedFields = utils.jsonToObject(logHandler, localResponse.message);
      utils.addAllKeyValues(parsedFields, localResponse);
      res.push(localResponse);
    }
    return callback(null, res);
  });
};


exports.getBusinessConfiguration  = function (logHandler, opts, callback) {
  let business_id = opts.business_id;

  let sql = "SELECT *  FROM `business_property` WHERE  `business_id` = ?";
  dbHandler.query(logHandler, "get business_property", sql, [business_id], (err, response) => {
    if(err) {
      callback(err);
    } else {
      let res = {};
      for (let i = 0; i < response.length; i++) {
        let property = response[i].property;
        res[property] = response[i].value;
      }
      callback(null, res);
    }
  });
};

exports.insertBusinessConfiguration  = function (logHandler, opts, callback) {
  let business_id = opts.business_id;
  let fieldsLength = Object.keys(opts.businessConfig).length;

  let values = [];
  for (const key of Object.keys(opts.businessConfig)) {
    values.push(business_id);
    values.push(key);
    values.push(opts.businessConfig[key]);
  }
  let sql = "INSERT INTO `business_property`(`business_id`, `property`, `value`) VALUES " +
              new Array(fieldsLength).fill("( ?,?,? )").join(', ') + " ;";
  dbHandler.query(logHandler, "insert business_property", sql, values, (err, response) => {
    if(err) {
      callback(err);
    } else {
      callback(null, response.affectedRows);
    }
  });
};

exports.getAgentConversation  = function (logHandler, opts, callback) {
  let values = [];
  values.push(opts.business_id);
  let condition = "";
  if(opts.search_user_id) {
    condition = " and channels.owner_id = ? ";
    values.push(opts.search_user_id);
  }
  let sql = `
            SELECT 
                channels.channel_id,
                channels.channel_name,
                channels.status,
                channels.label AS bot_channel_name,
                channels.lm_updated_at AS last_updated_at,
                uc.id AS message_id,
                uc.message,
                uc.message_type,
                uc.created_at,
                owners.user_id AS user_id,
                channels.custom_label,
                channels.default_message as default_message,
                channels.lma_id as last_agent_message_id,
                owners.full_name AS owner_full_name,
                COALESCE(agents.user_id, - 1) AS agent_id,
                COALESCE(agents.full_name, '') AS agent_name,
                COALESCE(agents.user_image, '') AS agent_image,
                COALESCE(last_message_user.user_id, -1) AS last_sent_by_id,
                COALESCE(last_message_user.full_name, "") AS last_sent_by_full_name,
                COALESCE(last_message_user.user_type, -1) AS last_sent_by_user_type
            FROM
                channels
                    LEFT JOIN
                users_conversation uc ON channels.lma_id = uc.id
                    LEFT JOIN
                users owners ON channels.owner_id = owners.user_id
                    LEFT JOIN
                users agents ON channels.agent_id = agents.user_id
                    LEFT JOIN
                users as last_message_user ON last_message_user.user_id = uc.user_id
            WHERE
                channels.channel_type = 4
                    AND channels.business_id = ?
                    AND channels.chat_type = 0
                    AND uc.user_id != 0
                    AND uc.message IS NOT NULL
                    ${condition}`;  // auto replies and null messages


  if(opts.statusList.length) {
    sql += 'AND channels.status in ( ' + new Array(opts.statusList.length).fill("?").join(', ') + ' ) ';
    values = values.concat(opts.statusList);
  }


  if(opts.applyTypeFilter) {
    let orCondition = [];

    // no agent is assigned
    if(opts.showUnassignedChats) {
      orCondition.push('channels.agent_id is NULL ');
      orCondition.push('channels.agent_id = 0'); // assigned agent removed
    }
    // assigned or tagged
    if(opts.validChannelIds.length) {
      orCondition.push(` channels.channel_id in (` + new Array(opts.validChannelIds.length).fill("?").join(', ') + ` ) `);
      values = values.concat(opts.validChannelIds);
    }

    if(orCondition.length) {
      sql += ' AND ( ' + orCondition.join(' OR ') + ' ) ';
    }
  }

  if(opts.applyAdditionalFilter) {
    sql += " AND channels.channel_id in ( " + new Array(opts.filterChannelIds.length).fill("?").join(', ') + " ) ";
    values = values.concat(opts.filterChannelIds);
  }

  if(opts.channelFilter && opts.channelFilter.length) {
    sql += " And channels.label_id in (" + opts.channelFilter.join(",") + ") ";
  }

  sql += `ORDER BY channels.lm_updated_at desc, channels.channel_id `;
  sql += " LIMIT " + opts.limit_start + ", " + opts.limit_end;


  dbHandler.query(logHandler, "query :: getAgentConversation ", sql, values, (err, response) => {
    if(err) {
      return callback(err);
    }
    // convert json to fields
    for (let j = 0; j < response.length; j++) {
      utils.addAllKeyValues(utils.jsonToObject(logHandler, response[j].message), response[j]);
    }

    return callback(null, response);
  });
};


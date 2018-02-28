exports.getObject                  = getObject;

const notificationType = {
  MESSAGE           : 1,
  ASSIGNMENT        : 3,
  TAGGED            : 4,
  READ_UNREAD       : 5,
  READ_ALL          : 6,
  USER_MIGRATION    : 7,
  USER_LOGOUT       : 8,
  TAGS_REFRESH      : 9,
  AGENTS_REFRESH    : 10,
  AGENT_REFRESH     : 11,
  MARK_CONVERSATION : 12
};

exports.notificationType = notificationType;

function getObject(type) {
  let object;
  switch (type) {
    case notificationType.MESSAGE:
      object = getMessageObject(type);
      break;
    case notificationType.ASSIGNMENT:
      object = getAssignmentObject(type);
      break;
    case notificationType.TAGGED:
      object = null;
      break;
    case notificationType.READ_UNREAD:
      object = null;
      break;
    case notificationType.READ_ALL:
      object = getReadAllObject(type);
      break;
    case notificationType.USER_MIGRATION:
      object = getMigrateUserObject(type);
      break;
    case notificationType.USER_LOGOUT:
      object = getUserLogoutObject(type);
      break;
    case notificationType.TAGS_REFRESH:
      object = getTagsRefreshObject(type);
      break;
    case notificationType.AGENTS_REFRESH:
      object = getAgentsRefreshObject(type);
      break;
    case notificationType.AGENT_REFRESH:
      object = getAgentRefreshObject(type);
      break;
    case notificationType.MARK_CONVERSATION:
      object = getMarkConversationObject(type);
      break;
    default:
      object = {};
  }
  return Object.seal(object);
}

function getMessageObject(type) {
  return {
    notification_type      : type,
    server_push            : true,
    channel_id             : undefined,
    message                : undefined,
    full_name              : undefined,
    user_id                : undefined,
    user_type              : undefined,
    agent_id               : undefined,
    agent_name             : undefined,
    last_sent_by_id        : undefined,
    last_sent_by_full_name : undefined,
    last_sent_by_user_type : undefined,
    label                  : undefined,
    channel_image          : undefined,
    chat_status            : undefined,
    bot_channel_name       : undefined,
    date_time              : undefined,
    message_type           : 1,
    chat_type              : 1,
    isTyping               : 0,
    type                   : 100,
    attributes             : { // filters for front end
      label   : undefined,
      type    : undefined,
      channel : undefined
    },
    count_my_chats         : 0,
    count_all_chats        : 0,
    count_unassigned_chats : 0
  };
}

function getAssignmentObject(type) {
  return {
    notification_type : type,
    server_push       : true,
    user_id           : undefined,
    bot_channel_name  : undefined,
    channel_id        : undefined,
    message           : undefined,
    agent_id          : undefined,
    assigned_to       : undefined,
    assigned_by       : undefined,
    label             : undefined,
    assigned_to_name  : undefined,
    assigned_by_name  : undefined,
    chat_status       : undefined,
    date_time         : undefined,
    assignment_type   : 2,
    message_type      : 2,
    chat_type         : 1,
    isTyping          : 0,
    type              : 100,
    attributes        : { // filters for front end
      label   : undefined,
      type    : undefined,
      channel : undefined
    },
    count_my_chats         : 0,
    count_all_chats        : 0,
    count_unassigned_chats : 0,
    status                 : 0
  };
}

function getReadAllObject(type) {
  return {
    notification_type : type,
    server_push       : true,
    user_id           : undefined,
    user_type         : undefined,
    channel_id        : undefined
  };
}

function getMigrateUserObject(type) {
  return {
    notification_type : type,
    server_push       : true,
    user_id           : undefined,
    user_name         : undefined,
    email             : undefined,
    migrated_to       : undefined
  };
}

function getUserLogoutObject(type) {
  return {
    notification_type : type,
    server_push       : true,
    user_id           : undefined
  };
}

function getTagsRefreshObject(type) {
  return {
    notification_type : type,
    server_push       : true
  };
}

function getAgentsRefreshObject(type) {
  return {
    notification_type : type,
    server_push       : true
  };
}

function getAgentRefreshObject(type) {
  return {
    notification_type : type,
    server_push       : true,
    agent_id          : undefined,
    agent_info        : undefined
  };
}

function getMarkConversationObject(type) {
  return {
    notification_type : type,
    server_push       : true,
    message           : undefined,
    channel_id        : undefined,
    status            : undefined
  };
}

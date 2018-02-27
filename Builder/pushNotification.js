
exports.getObject                  = getObject;

const notificationType = {
  NOTIFICATION        : 0,  // default object used as wrapper for push notification
  MESSAGE             : 1,
  TAGGED              : 3,
  FIRE_BASE           : 4,
  SILENT_NOTIFICATION : 5
};
exports.notificationType = notificationType;

function getObject(type) {
  let object;
  switch (type) {
    case notificationType.NOTIFICATION:
      object = getNotificationObject(type);
      break;
    case notificationType.MESSAGE:
      object = getMessageObject(type);
      break;
    case notificationType.TAGGED:
      object = getTaggedObject(type);
      break;
    case notificationType.FIRE_BASE:
      object = getFireBaseObject(type);
      break;
    case notificationType.SILENT_NOTIFICATION:
      object = getSilentNotificationObject(type);
      break;
    default:
      object = {};
  }
  return Object.seal(object);
}

function getNotificationObject(type) {
  return {
    notification_type : type,
    business_id       : undefined,
    push_to           : undefined,
    device_token      : undefined,
    device_type       : undefined,
    app_type          : undefined,
    device_info       : undefined,
    payload           : undefined,
    silent_push       : false
  };
}

function getMessageObject(type) {
  return {
    notification_type      : type,
    server_push            : true,
    message                : undefined,
    message_type           : undefined,
    push_message           : undefined,
    email                  : undefined,
    muid                   : '',
    title                  : undefined,
    user_id                : undefined,
    channel_id             : undefined,
    label                  : undefined,
    date_time              : undefined,
    chat_type              : undefined,
    flag                   : 21,
    showpush               : 1,   // ios
    deepindex              : -1,
    image                  : "",
    // backward compatibility
    label_id               : undefined,
    new_message            : undefined,
    unread_count           : 0,
    last_sent_by_full_name : undefined,
    last_sent_by_id        : undefined,
    last_sent_by_user_type : undefined,
    tagged_users           : []
  };
}


function getTaggedObject(type) {
  return {
    notification_type      : type,
    server_push            : true,
    user_id                : undefined,
    bot_channel_name       : undefined,
    channel_id             : undefined,
    message                : undefined,
    agent_id               : undefined,
    assigned_to            : undefined,
    assigned_by            : undefined,
    label                  : undefined,
    assigned_to_name       : undefined,
    assigned_by_name       : undefined,
    chat_status            : undefined,
    date_time              : undefined,
    assignment_type        : 2,
    message_type           : 2,
    chat_type              : 1,
    isTyping               : 0,
    type                   : 100,
    count_my_chats         : 0,
    count_all_chats        : 0,
    count_unassigned_chats : 0
  };
}


function getFireBaseObject(type) {
  return {
    notification_type : type,
    server_push       : true,
    title             : undefined,
    body              : undefined,
    channel_id        : undefined,
    icon              : "image-url"
  };
}

function getSilentNotificationObject(type) {
  return {
    notification_type : type,
    business_id       : undefined,
    push_to           : undefined,
    device_token      : undefined,
    device_type       : undefined,
    app_type          : undefined,
    device_info       : undefined,
    payload           : undefined,
    message           : "",
    sound             : ""
  };
}

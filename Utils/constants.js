

const utils                         = require('../Controller/utils');


function freeze(object) {
  return Object.freeze(object);
}

exports.serverInitMessage = `
              _,     _   _     ,_
          .-'' /     \\'-'/     \\ ''-.
         /    |      |   |      |    \\
        ;      \\_  _/     \\_  _/      ;
       |         ''         ''         |
       |         Up And Running        |
        ;    .-.   .-.   .-.   .-.    ;
         \\  (   '.'   \\ /   '.'   )  /
          '-.;         V         ;.-'
`;

exports.GCM = freeze({
  MAX_RETRY : 4
});

exports.deviceType = {
  ANDROID : 1,
  IOS     : 2,
  WEB     : 3
};

exports.enumDeviceType = {
  0 : "DEFAULT",
  1 : "ANDROID",
  2 : "IOS",
  3 : "WEB",
  4 : "WEB_WIDGET",
  5 : "ANDROID_AGENT",
  6 : "IOS_AGENT"
};

exports.validDeviceTypes = freeze([0, 1, 2, 3, 4, 5, 6]);


exports.notificationFlags = {
  DISPLAY_MESSAGE : 21
};

exports.EMAIL_MAX_SIZE = 60;

exports.MIN_DOTAT = 2;

exports.MAX_INTEGER = Number.MAX_SAFE_INTEGER;


exports.pushSource = {
  FUGU : "FUGU"
};

// aws s3 settings
exports.AWSSettings = {
  url          : "url",
  awsBucket    : "awsBucket",
  pdfFolder    : "pdf",
  imagesFolder : "images",
  awsSecretKey : "awsSecretKey",
  awsAccessKey : "awsAccessKey",
  options      : {
    storageType : "STANDARD",
    acl         : "public-read",
    checkMD5    : true
  },
  baseURL : "baseURL"
};

exports.cache = {
  BUSINESS_DETAILS         : 'business_details',
  BUSINESS_PROPERTY        : 'business_property',
  BUSINESS_DEVICE_MAPPINGS : "business_device_mappings",
  SERVER_LOGGING           : "server_logging"
};


exports.ccPushEvents = {
  USER_LOGOUT       : 'userLogout',
  AGENT_LOGOUT      : 'agentLogout',
  USER_MIGRATION    : 'userMigration',
  READ_UNREAD       : 'readUnread',
  TAGS_REFRESH      : 'tagsRefresh',
  AGENTS_REFRESH    : 'agentsRefresh',
  MARK_CONVERSATION : 'markConversation'
};

exports.getMessagesPageSize = 100;
exports.getConversationsPageSize = 100;
exports.getUsersPageSize = 100;

exports.MYSQL_INT_MAX = 2147483647;

exports.fileTypes = {
  image : ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/x-ms-bmp', 'image/vnd.wap.wbmp', 'image/webp'],
  file  : ['application/pdf', 'audio/3gpp', 'video/3gpp']
};

exports.getAWSFolder = function (mimeType) {
  let imageTypes = new Set(exports.fileTypes.image);
  let fileTypes = new Set(exports.fileTypes.file);
  if(imageTypes.has(mimeType)) {
    return 'image';
  }
  if(fileTypes.has(mimeType)) {
    return 'file';
  }
  return 'default';
};

exports.FILE_TYPE = {
  IMAGE : "image",
  FILE  : "file"
};

exports.userVisibleMessageTypes = [1, 4, 5, 10, 11, 12];
exports.skipUserMessageTypesForLMUIds = new Set(['2', '3', '5']);
exports.skipAgentMessageTypesForLMAIds = new Set(['3', '5']);

exports.userReadUnreadMessageTypes = [1, 4, 10, 11, 12];
exports.agentReadUnreadMessageTypes = [1, 3, 4, 10, 11, 12];

exports.fieldsBasedOnMessageType = {
  default : ["message", "muid"],
  1       : ["message", "muid"],
  2       : ["message", "muid"],

  // private messages agent to agent
  3 : ["message", "muid"],

  // custom message type for business, business_flag is business defined property
  4 : ["message", "muid", "business_flag"],

  // public note
  5 : ["message", "muid"],

  // image related types 1X
  10 : ["message", "muid", "image_url", "thumbnail_url"],
  11 : ["message", "muid", "url", "thumbnail_url", "file_size", "file_name"],
  12 : ["message", "muid", "custom_action", "extras"]
};

exports.defaultMessageBasedOntype = {
  1  : "message",
  2  : "note",
  3  : "private message",
  4  : "message",
  5  : "public note",
  10 : "image",
  11 : "file attachment",
  12 : "{{{agent_name}}} sent a message"
};

exports.messageType = {
  MESSAGE                   : 1,
  NOTE                      : 2,
  PRIVATE_MESSAGE           : 3,
  BUSINESS_SPECIFIC_MESSAGE : 4,
  PUBLIC_NOTE               : 5,
  IMAGE                     : 10,
  FILE_ATTACHMENT           : 11,
  CALL_TO_ACTION            : 12
};

exports.FIREBASE = {
  KEY : "key=forebasekey",
  API : "https://fcm.googleapis.com/fcm/send"
};

exports.defaultColor = {
  COLORCODE : '#00C2E0'
};

exports.FUGU_EMAIL = "email@email.com";

exports.mailSubject = freeze({
  WELCOME_MAIL : "We're delighted to have you! Welcome to Fugu."
});


exports.userSubType = {
  AGENT : 11,
  ADMIN : 13
};

exports.validUserSubTypes = freeze(utils.getAllValuesFromMap(exports.userSubType));

exports.validUserProperties = new Set(["enable_vibration", "push_notification_sound"]);

exports.GEOLOCATORKEY = {
  KEY : 'GEOLOCATORKEY'
};

exports.autoPilotApiKey = {
  KEY : 'autoPilotApiKey'
};

exports.addContacts = {
  URL : 'https://api2.autopilothq.com/v1/contact'
};

exports.triggerCampaign = {
  URL : `https://api2.autopilothq.com/v1/trigger/ID/contact`
};

exports.autoPilotSignUpTriggerId = {
  ID : '0061'
};

exports.userAddressKeys = ["city", "region_name", "zip_code", "country_name"];

exports.geocoderOptions = {
  OPTIONS : {
    provider    : 'google',
    // Optional depending on the providers
    httpAdapter : 'https', // Default
    apiKey      : exports.GEOLOCATORKEY.KEY, // for Mapquest, OpenCage, Google Premier
    formatter   : null         // 'gpx', 'string', ...
  }
};

exports.userType = freeze({
  BOT      : 0,
  CUSTOMER : 1,
  AGENT    : 2
});

exports.messageStatus = freeze({
  SENT      : 1,
  DELIVERED : 2,
  READ      : 3
});

exports.channelStatus = freeze({
  DISABLED : 0,
  OPEN     : 1,
  CLOSED   : 2
});

exports.chatType = freeze({
  DEFAULT       : 0,
  P2P           : 1,
  O20_CHAT      : 2,
  PRIVATE_GROUP : 3,
  PUBLIC_GROUP  : 4,
  GENERAL_CHAT  : 5
});

exports.channelType = freeze({
  DEFAULT_CHANNEL : 2,
  DEFAULT         : 4
});

exports.pushNotification = freeze({
  DEFAULT_TITLE : "Support",
  MUTED         : "MUTED",
  UNMUTED       : "UNMUTED",
  TEST_TITLE    : "Notifications are good to go 👍",
  TEST_MESSAGE  : "This is how our notifications would look like"
});

exports.pushNotificationLevels = {
  ALL_CHATS       : 'ALL_CHATS',
  DIRECT_MESSAGES : 'DIRECT_MESSAGES',
  NONE            : 'NONE'
};

exports.validPushNotificationLevels = freeze(utils.getAllValuesFromMap(exports.pushNotificationLevels));

exports.enableZlibCompression = true;

exports.conversationType = freeze({
  DEFAULT    : 0,
  MY_CHAT    : 1,
  UNASSIGNED : 2,
  TAGGED     : 3,
  ALL        : 10
});

exports.dayInMillisecs = 24 * 60 * 60 * 1000;

exports.FUGU_COMPONENT_KEY = "fugukey";

exports.keyToComponent = freeze({
  fugukey        : "fugu",
  integrationkey : "integration",
  outreachkey    : "outreach",
  jugnookey      : "jugnoo",
  fuguChatKey    : "fuguChat"
});

exports.API_END_POINT = freeze({
  HANDLE_MESSAGE           : "/api/server/handleMessage",
  HANDLE_PUSH              : "/api/server/handlePush",
  CACHE_RELOAD             : "/api/server/cacheReload",
  MESSAGE_WEB_HOOK         : "/api/integration/sendMessage",
  AUTHENTICATE_USER        : "authenticate_user",
  GET_USER_DETAIL          : "get_user_detail",
  REGISTER_USER            : "register_user",
  UPDATE_USER              : "update_user_detail",
  ADD_CARD                 : "add_user_card",
  GET_CARD                 : "get_user_card",
  DEDUCT_PAYMENT           : "make_user_payment",
  HANDLE_MESSAGE_WITH_FAYE : "/api/server/handleMessageWithFaye",
  BULBUL_CREATE_TICKET     : "add_deal"
});

exports.alertType = {
  AGENT : 1,
  ADMIN : 2,
  ALL   : 3
};

exports.alertMendatory = {
  YES : 1,
  NO  : 0
};

exports.alertIdentifier = {
  IDENTIFIER : "WIDGET"
};

exports.source = freeze({
  DEFAULT     : 0,
  SDK         : 1,
  AGENT_APP   : 2,
  WEB         : 3,
  WIDGET      : 4,
  INTEGRATION : 5,
  OUTREACH    : 6
});

exports.validSources = freeze(utils.getAllValuesFromMap(exports.source));


exports.sourceEnum = freeze({
  0 : "DEFAULT",
  1 : "SDK",
  2 : "AGENT_APP",
  3 : "WEB",
  4 : "WIDGET",
  5 : "INTEGRATION",
  6 : "OUTREACH"
});

exports.defaultAppType = 1;


exports.onlineStatus = freeze({
  AVAILABLE : "AVAILABLE",
  AWAY      : "AWAY",
  OFFLINE   : "OFFLINE"
});

exports.validOnlineStatuses = freeze(utils.getAllValuesFromMap(exports.onlineStatus));

exports.anonymousUserName = 'Visitor';

exports.status = freeze({
  ENABLE  : 1,
  DISABLE : 0
});

exports.userStatus = freeze({
  ENABLE  : 1,
  DISABLE : 0
});

exports.regExp = freeze({
  HTML             : /<[a-z/][\s\S]*>/i,
  REPLACE_HTML_TAG : /(<([^>]+)>)|&nbsp;/ig
});

exports.replaceHtmlTagWith = '';


exports.businessConfig = freeze({
  adroitAssignAutoClose                  : "adroit_assign-auto_close",
  adroitAssignCustomerInactivityDuration : "adroit_assign-customer_inactivity_duration",
  adroitAssignAutoAssign                 : "adroit_assign-auto_assign",
  adroitAssignAgentInactivityDuration    : "adroit_assign-agent_inactivity_duration",
  adroitAssignAgentMaxChats              : "adroit_assign-agent_max_chats",
  enableGeneralChat                      : "chat-enable_general_chat"
});


// TODO : remove redundancy

exports.jugnooDelivery = freeze({
  SECRETKEY : "SECRETKEY"
});

exports.initiated_by_agent = freeze({
  YES : 1,
  NO  : 0
});

exports.restrictSearchBusinessId = 1;

exports.SERVER_AUTH_CONSTANTS = freeze({
  OFFERING_ID         : '6',
  LONGITUDE           : "30.7333",
  LATITUDE            : "76.7794",
  INTERNAL_USER       : 0,
  SETUP_WIZARD_STEP   : 1,
  LAYOUT_TYPE         : 1,
  COMPANY_ADDRESS     : "CDCL Building",
  DASHBOARD_VERSION   : 1,
  VERIFICATION_STATUS : 1
});

exports.billingTransactionType = freeze({
  BASEPLAN              : "BASEPLAN",
  P2P                   : "P2P",
  MANUAL                : "MANUAL",
  AGENT_COUNT_INCREASED : "AGENT_COUNT_INCREASED"
});

exports.validBillingTransactionTypes = freeze(utils.getAllValuesFromMap(exports.billingTransactionType));

exports.monthName = freeze({
  1  : "January",
  2  : "February",
  3  : "March",
  4  : "April",
  5  : "May",
  6  : "June",
  7  : "July",
  8  : "August",
  9  : "September",
  10 : "October",
  11 : "November",
  12 : "December"
});

exports.fuguLogoBase64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyODUiIGhlaWdodD0iNjgiIHZpZXdCb3g9IjAgMCAyODUgNjgiPiAgICA8ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPiAgICAgICAgPGcgZmlsbD0iIzYyN0RFMyI+ICAgICAgICAgICAgPHBhdGggZD0iTTEwNy4wMTcgMjEuNTc4bC4yMTcgNi4zNjEgMTcuMDk5LS4yMTcgMS4xNTQgMTQuNDU3LTE3LjgyLjIxNy41NzYgMTkuMTU1aC0xNC40M1Y3LjE5NGwzNi4yMi0uNjVWMjF6TTE0NC4xNjcgNTcuNTQ4Yy0zLjQ5NS0yLjY2OC02LjE3NS02LjUxNC04LjA0Mi0xMS41MzYtMS44NjctNS4wMjMtMi44LTEwLjk1NC0yLjgtMTcuNzk2IDAtOC4wMDYuOTU3LTE1LjU3NiAyLjg3Mi0yMi43MDlsMTUuNDM3IDMuNzg1Yy0uNDc5IDIuMjgxLS44NjIgNC43NjgtMS4xNDkgNy40NmE0MTguNzcgNDE4Ljc3IDAgMCAwLS45MzMgMTAuMjI3bC0uMjE2IDIuMTFjMCAxMS45MzcgMi40MTcgMTcuOTA1IDcuMjUyIDE3LjkwNSA0Ljc0IDAgNy4xMDktNS44NDYgNy4xMDktMTcuNTQgMC0xLjk5LS4zMTItNS4wMjMtLjkzNC05LjA5OWExMTYuMzkgMTE2LjM5IDAgMCAwLTIuMzctMTEuNjQ1bDE1LjIyMy00LjM2N2MyLjUzNiA3LjE4MSAzLjgwNSAxNS41NTIgMy44MDUgMjUuMTEgMCA2LjUwMy0uOTMzIDEyLjE2OC0yLjggMTYuOTk1LTEuODY3IDQuODI5LTQuNTEzIDguNTUyLTcuOTM0IDExLjE3My0zLjQyMyAyLjYyLTcuNDU2IDMuOTMtMTIuMDk5IDMuOTMtNC43ODcgMC04LjkyOC0xLjMzNC0xMi40MjEtNC4wMDNNMjM1LjM5NSAzNy45NzVjMCAzLjU3NS0uODM1IDcuMDc2LTIuNTA0IDEwLjUwMmEyNS45MDUgMjUuOTA1IDAgMCAxLTYuOTMgOC43NzZjLTIuOTUgMi40MjQtNi4yNjUgNC4wMjgtOS45NCA0LjgxLTEuODQuMzkzLTMuNjA1LjU4OC01LjI5OC41ODgtNC4yMDkgMC04LjI0OC0uOTU1LTEyLjExOC0yLjg2NC0zLjg3LTEuOTEtNy4xNzItNC41NzctOS45MDUtOC4wMDUtMi43MzQtMy40MjYtNC41Ni03LjI5NS01LjQ3OS0xMS42MDQtLjMzOS0xLjY2My0uNTA3LTMuNDUxLS41MDctNS4zNiAwLTQuMjEuOTA3LTguMjc0IDIuNzItMTIuMTkyIDEuODE1LTMuOTE2IDQuMzY2LTcuMjQ1IDcuNjU2LTkuOTg4IDMuMjktMi43NDEgNy4wMzktNC41NzcgMTEuMjQ4LTUuNTA3YTMxLjc5OCAzMS43OTggMCAwIDEgNi4wMjItLjU4OGMzLjMzOCAwIDYuNTY4LjQ3NyA5LjY4OCAxLjQzMiAzLjEyLjk1NSA1LjY3MSAyLjMzOSA3LjY1NSA0LjE1bC03LjY5MiAxMi4wNDRjLTEuMDY0LTEuMDI5LTIuNDU2LTEuODI0LTQuMTcyLTIuMzg3YTE2LjgxIDE2LjgxIDAgMCAwLTUuMjYtLjg0NWMtMS4wNjYgMC0yLjE1NC4xMjMtMy4yNjYuMzY4LTIuNjYyLjYzNi00Ljg1IDIuMTQyLTYuNTY3IDQuNTE2LTEuNzE4IDIuMzc2LTIuNTc2IDUuMDA2LTIuNTc2IDcuODk1IDAgLjc4My4wNzIgMS41OTEuMjE3IDIuNDIzLjY3NyAzLjAzNiAyLjEyOSA1LjU0NSA0LjM1NCA3LjUyOCAyLjIyNSAxLjk4MyA0Ljc0IDIuOTc0IDcuNTQ3IDIuOTc0LjY3NyAwIDEuMzc5LS4wNzMgMi4xMDUtLjIyIDEuNTk2LS4zNDIgMy4xNTYtMS4wMDMgNC42OC0xLjk4MyAxLjUyMy0uOTc5IDIuNDU0LTIuMDggMi43OTMtMy4zMDVsLTEyLjkxNi0yLjQ5NyAyLjk3NS0xMy4xNDYgMjQuMDE5IDQuODQ4Yy45NjcgMi4zMDIgMS40NSA0Ljg0NyAxLjQ1IDcuNjM3TTI0OS41MyA1Ny41NDhjLTMuNDk1LTIuNjY4LTYuMTc2LTYuNTE0LTguMDQyLTExLjUzNi0xLjg2Ny01LjAyMy0yLjgtMTAuOTU0LTIuOC0xNy43OTYgMC04LjAwNi45NTctMTUuNTc2IDIuODcyLTIyLjcwOWwxNS40MzcgMy43ODVjLS40OCAyLjI4MS0uODYyIDQuNzY4LTEuMTUgNy40Ni0uMjg2IDIuNjkzLS41OTggNi4xMDMtLjkzMyAxMC4yMjdsLS4yMTUgMi4xMWMwIDExLjkzNyAyLjQxNyAxNy45MDUgNy4yNTIgMTcuOTA1IDQuNzM5IDAgNy4xMDgtNS44NDYgNy4xMDgtMTcuNTQgMC0xLjk5LS4zMTItNS4wMjMtLjkzMy05LjA5OWExMTYuMzkgMTE2LjM5IDAgMCAwLTIuMzctMTEuNjQ1bDE1LjIyMi00LjM2N2MyLjUzNyA3LjE4MSAzLjgwNiAxNS41NTIgMy44MDYgMjUuMTEgMCA2LjUwMy0uOTM0IDEyLjE2OC0yLjggMTYuOTk1LTEuODY3IDQuODI5LTQuNTEzIDguNTUyLTcuOTM1IDExLjE3My0zLjQyMyAyLjYyLTcuNDU2IDMuOTMtMTIuMDk4IDMuOTMtNC43ODcgMC04LjkyOC0xLjMzNC0xMi40MjItNC4wMDMiLz4gICAgICAgIDwvZz4gICAgICAgIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKC4wMSkiPiAgICAgICAgICAgIDxwYXRoIGZpbGw9IiM2MjdERTMiIGQ9Ik0zNi41NTMgNjcuNDc0QzE2LjM2NiA2Ny40NzQgMCA1Mi4zNyAwIDMzLjczOCAwIDE1LjEwNSAxNi4zNjYgMCAzNi41NTMgMCA1Ni43NCAwIDczLjEwNSAxNS4xMDUgNzMuMTA3IDMzLjczOGMwIDguMTIyLTMuMTEyIDE1LjU3NC04LjI5NSAyMS4zOTYtLjA5NCAzLjE5LjYyIDcuNzc4IDQuNTQgMTEuNzE0LTYuNDg0IDIuMzc5LTEzLjAxOS0yLjcwNC0xNC40NjItMy45My01LjM5MSAyLjg5LTExLjY1MSA0LjU1Ni0xOC4zMzcgNC41NTYiLz4gICAgICAgICAgICA8ZWxsaXBzZSBjeD0iMTguNzYyIiBjeT0iMjUuMjQ3IiBmaWxsPSIjRkZGIiByeD0iMTAuMjgyIiByeT0iOS45MjQiLz4gICAgICAgIDwvZz4gICAgPC9nPjwvc3ZnPg==";

exports.agentFayeKeys = ["online_status", "online_status_updated_at"];

exports.billing = freeze({
  resellerTrialDays : 90,
  trialDays         : 14
});

exports.techSupportMail = "tech@fuguchat.com";

exports.emailType = {
  REQUEST_MAIL     : "REQUEST_MAIL",
  AGENT_INVITATION : "AGENT_INVITATION",
  RESELLER_SIGNUP  : "RESELLER_SIGNUP",
  RESET_PASSWORD   : "RESET_PASSWORD",
  WELCOME_MAIL     : "WELCOME_MAIL",
  SIMPLE_TEXT_MAIL : "SIMPLE_TEXT_MAIL"
};
exports.agentFayeKeys = ["online_status", "online_status_updated_at"];

exports.superAdminTokenExpiryTimeInMin = 30;

exports.groupChatImageURL = 'https://fuguchat.s3.ap-south-1.amazonaws.com/default/WwX5qYGSEb_1518441286074.png';

exports.generalChatName = '# General Chat';

exports.generalChatIntroMessage = 'Welcome to FuguChat !!';

exports.androidBatchPushLimit = 1000;

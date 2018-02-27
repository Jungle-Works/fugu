const constants           = require('../Utils/constants');
const handleChat          = require('../Controller/handleChat');
const logger              = require('../Routes/logging');
const dbquery             = require('../DAOManager/query');
const _                   = require('underscore');
const conversationService = require('../services/conversation');
const businessService     = require('../services/business');
const userService         = require('../services/user');
const channelService      = require('../services/channel');
const dispatcherService   = require('../services/dispatcher');
const Promise             = require('bluebird');
const notificationBuilder = require('../Builder/notification');
const UniversalFunc       = require('../Utils/universalFunctions');
const rabbitMQBuilder     = require('../Builder/rabbitMQ');
const utils               = require('../Controller/utils');

let  numUsers = 0;

exports.handleSocket    = function (socket) {
  const logHandler = {
    uuid       : UniversalFunc.generateRandomString(10),
    apiModule  : "chathandler",
    apiHandler : "handleSocket"
  };

  logger.info(logHandler, 'connected socket id : ' + socket.id);


  socket.on('*', (packet) => {
    logger.info(logHandler, packet, socket.id);
  });


  // channel room in which chat occurs ( and channel level notification) /channel/id
  // business room for business level notification   /business_key
  // user room for user level notification
  // two events   'message' and 'event'


  socket.on('subscribe', (data) => {
    if(data.room) {
      logger.info(logHandler, { socketid : socket.id, joining_room : data });
      socket.join(data.room);
    }
  });

  socket.on('unsubscribe', (data) => {
    if(data.room) {
      logger.info(logHandler, { socketid : socket.id, leaving_room : data });
      socket.leave(data.room);
    }
  });

  socket.on('message', (data) => {
    if(data.room && data.messageContent) {
      logger.info(logHandler, { socketid : socket.id, sending_message : data });
      global.io.sockets.in(data.room).emit('message', data);
    }
  });





  var addedUser = false;

  socket.on('new message', (data) => {
  // when the client emits 'new message', this listens and executes
    // we tell the client to execute 'new message'
    global.io.sockets.in(data.room).emit('message', { username : '123', message : 'ho' });
    socket.broadcast.emit('new message', {
      username : socket.username,
      message  : data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', (username) => {
    if(addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers : numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username : socket.username,
      numUsers : numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', () => {
    socket.broadcast.emit('typing', {
      username : socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing', {
      username : socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    if(addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username : socket.username,
        numUsers : numUsers
      });
    }
  });
};

exports.handlePublish    = function (opts) {
  const logHandler = {
    uuid       : UniversalFunc.generateRandomString(10),
    apiModule  : "chathandler",
    apiHandler : "handlePublish"
  };

  let clientId = opts.clientId;
  let channel = opts.channel;
  let data    = opts.data;


  logger.trace(logHandler, "Data in handlePublish", { client_id : clientId }, { channel : channel }, { data : data });
  if(data.server_push) {
    logger.trace(logHandler, "Server push");
    return;
  }

  if(!channel) {
    logger.trace(logHandler, "Invalid data in faye publish ", { channel : channel });
    return;
  }

  if(data.type == 100) {
    logger.error(logHandler, "should not listen");
    return;
  }

  Promise.coroutine(function* () {
    // validate channel
    let channel_var = channel.split("/");
    let channel_id = parseInt(channel_var[1]);
    let message_type = data.message_type || 1;
    if(!channel_id || channel_id < 0) {
      logger.trace(logHandler, "invalid channel_id : " + channel_id);
      return;
    }
    let channelInfo  = yield channelService.getInfo(logHandler, { channel_id : channel_id });
    if(_.isEmpty(channelInfo)) {
      logger.error(logHandler, "No channel found with given channel id : " + channel_id);
      return;
    }
    channelInfo   = channelInfo[0];
    if(channelInfo.channel_type != constants.channelType.DEFAULT) {
      logger.error(logHandler, "Won't listen on this");
      return;
    }

    let labelInfo;
    if(channelInfo.label_id) {
      labelInfo = yield channelService.getLabelById(logHandler, channelInfo.label_id);
      if(!_.isEmpty(labelInfo)) {
        labelInfo = labelInfo[0];
      }
    }

    // validate user
    let userInfo     = yield userService.getInfo(logHandler, data.user_id);
    if(_.isEmpty(userInfo)) {
      logger.error(logHandler, "No user found with user_id : " + data.user_id);
      return;
    }
    userInfo      = userInfo[0];

    if(userInfo.status == constants.userStatus.DISABLE) {
      logger.error(logHandler, "User has been deactivated!", userInfo);
      return;
    }

    if(userInfo.business_id != channelInfo.business_id) {
      let error = {
        user_id             : userInfo.user_id,
        user_business_id    : userInfo.business_id,
        channel_id          : channelInfo.channel_id,
        channel_business_id : channelInfo.business_id
      };
      logger.error(logHandler, "user and channel don't belong to same business ", error);
      return;
    }
    if(userInfo.user_type == constants.userType.CUSTOMER) {
      let userExistsInChannel = yield channelService.getUserFromUserToChannel(logHandler, userInfo.user_id, channelInfo.channel_id);
      if(_.isEmpty(userExistsInChannel)) {
        logger.error(logHandler, "user does not belong to this channel : ", userInfo, channelInfo);
        return;
      }
    }



    // mark messages read for user
    if(data.notification_type == notificationBuilder.notificationType.READ_ALL) {
      logger.trace(logHandler, "read all event ", { user_id : userInfo.user_id, channel_id : channelInfo.channel_id });
      let payload = {
        user_id       : userInfo.user_id, business_id   : channelInfo.business_id, channel_id    : channelInfo.channel_id, mark_all_read : true
      };
      return conversationService.syncMessageHistory(logHandler, payload);
    }



    // process message
    if(isValidMessage(data)) {
      logger.trace(logHandler, { valid_message : data });
      let opts            = {};
      opts.business_id    = userInfo.business_id;
      opts.user_id        = data.user_id;
      opts.channel_id     = channel_id;
      opts.channel_name   = channelInfo.channel_name;
      opts.full_name      = userInfo.full_name;
      opts.data           = data;
      opts.user_type      = userInfo.user_type;
      opts.label_id       = channelInfo.label_id;
      opts.agent_id       = channelInfo.agent_id;
      opts.message_type   = message_type;

      let insertMessage = yield Promise.promisify(dbquery.insertUsersConversation).call(null, logHandler, opts);

      // update user message history
      channelService.insertOrUpdateChannelHistory(logHandler, { channel_id : channelInfo.channel_id, user_id : userInfo.user_id, message_id : insertMessage.insertId });


      let businessInfo         = yield businessService.getInfo(logHandler, { business_id : channelInfo.business_id });
      let messageInfo          = {};
      messageInfo.message_id   = insertMessage.insertId;
      messageInfo.message_type = message_type;
      messageInfo.message      = data.message;
      messageInfo.muid         = data.muid;
      messageInfo.tagged_users = data.tagged_users;



      let mqMessageObject = rabbitMQBuilder.getObject(rabbitMQBuilder.mqMessageType.MESSAGE);
      mqMessageObject.business_id = businessInfo.business_id;
      mqMessageObject.channel_id = channelInfo.channel_id;
      mqMessageObject.message = messageInfo.message;
      mqMessageObject.user_id = userInfo.user_id;
      mqMessageObject.user_type = userInfo.user_type;
      mqMessageObject.date_time = new Date();
      // dispatcherService.archiveMessage(logHandler, mqMessageObject);

      if(userInfo.user_type == constants.userType.AGENT && channelInfo.initiated_by_agent) {
        let checkChatIsCreatedByAgent = yield conversationService.checkChatIsCreatedByAgent(logHandler, channelInfo.channel_id, userInfo.user_id);
        if(!_.isEmpty(checkChatIsCreatedByAgent) && checkChatIsCreatedByAgent.length == 1) {
          return handleChat.handleChatAgentFirstMessage(logHandler, userInfo, channelInfo, businessInfo, messageInfo);
        }
        logger.info(logHandler, "AGENT MESSAGE LENGTH IS NOT EQUAL TO 1");
      }
      handleChat.handleChat(userInfo, channelInfo, businessInfo, messageInfo, labelInfo);
    }
  })().then((data) => {
    logger.trace(logHandler, { CHAT_HANDLER : data });
  }, (error) => {
    logger.logError(logHandler, "Error in Chat Handler", error);
    logger.error(logHandler, error);
  });
};


function isValidMessage(data) {
  if(data.is_typing != 0) { return false; }
  if(data.message == "" && (data.message_type == 1 || data.message_type == 3)) { return false; }
  if(utils.isString(data.message) && data.message.trim() == "" && (data.message_type == 1 || data.message_type == 3)) { return false; }
  return true;
}

'use_strict';

// starting configuration
let allowedConfigs = new Set(['dev','development','test','production','betaproduction']);
if(!allowedConfigs.has(process.env.NODE_ENV)){
  console.log("please specify valid NODE_ENV to run server");
  return;
}

process.env.NODE_CONFIG_DIR = __dirname + '/configuration/';
config = require('config');

let newrelic;
if(config.get('newRelicEnabled')){
  newrelic = require('newrelic');
}
process.configuration = config;

/** @namespace */
/** @namespace process*/
/** @namespace process.env.NODE_ENV*/
/** @namespace console*/

//Importing and declaring Libraries
const express                                = require('express');
const fs                                     = require('fs');
const faye                                   = require('faye');
const fayeRedis                              = require('faye-redis');
const https                                  = require('https');
const http                                   = require('http');
const favicon                                = require('serve-favicon');
const bodyParser                             = require('body-parser');
const cluster                                = require('cluster');
const os                                     = require('os');
const path                                   = require('path');
const morgan                                 = require('morgan');
const requireg                               = require('requireg');
const util                                   = require('util');
const Config                                 = require('./Config/index');
const dbHandler                              = require('./database').dbHandler;
const logger                                 = require('./Routes/logging');
const constants                              = require('./Utils/constants');
const utils                                  = require('./Controller/utils');
const chathandler                            = require('./Routes/chathandler');
const apihandler                             = require('./router');
const cachebuilder                           = require('./cachebuilder');
const customRequestLogger                    = require('./libs/request_logger.js');
const rabbitMQ                               = require('./rabbitmq/mqHandler');
const UniversalFunc                          = require('./Utils/universalFunctions');
const cron                                   = require('./services/cron');
const _                                      = require('underscore');
let app                                      = express();



global.base_dir                = __dirname;
const logHandler = {
  apiModule : "server",
  apiHandler : "logger"
};
const enableHTTPServer = false;
const enableFayeRedis = false;
const enableRabbitMq = true;

//add uuid to each request
app.use(function(req, res, next) {
  req.uuid = UniversalFunc.generateRandomString(10);
  next();
});

//Api details listing
app.use(morgan(function (tokens, req, res) {
  return [
    '[', utils.getLoggingTime(),'-',req.uuid,']',
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens['response-time'](req, res), 'ms','-',
    tokens.res(req, res, 'content-length')
  ].join(' ')
}));



// middlewares
app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(customRequestLogger.create());
app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  //res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, app_version, device_type, access_token");

  next();
});



// all api's
app.use('/api',     apihandler);



//Added docs to test
app.get('/docs', function (req, res) {
  let allowedConfigs = new Set(['dev','development','test']);
  if (!allowedConfigs.has(process.env.NODE_ENV)) {
    return res.send('Chalo Jugnoo Se!');
  }
  const aglio = requireg('aglio');
  let options = {
    themeVariables: 'default'
  };
  aglio.renderFile(__dirname + '/docs.apib', __dirname + '/docs.html', options, function (err, warnings) {
    if (err) {
      return res.send("Error : " + JSON.stringify(err));
    }
    if (warnings && warnings.length) {
      return res.send("Warning : " + JSON.stringify(warnings));
    }
    res.sendFile(path.join(__dirname + '/docs.html'));
  });

});



// server and db up and running
app.get('/ping', function (req, res) {
  res.send(200, {}, { pong: true });
});
app.get('/heartbeat',  function(req, res, next) {
  dbHandler.query(logHandler, "heartbeat", 'SELECT 1 from DUAL WHERE 1 =1 ',[] , function(err, result){
      if(err) {
        return res.status(500).send('Internal server Error!');
      }
      res.send('Chalo Jugnoo Se!');
    });
});





//     server setup
let numCPUs = os.cpus().length; // get num of cpus visilbe to OS,  cluster fork

app.set('port', process.env.PORT || config.get('PORT'));
let options = {};
if(enableHTTPServer) {
  options.key = fs.readFileSync('certs/<key>.key');
  options.cert = fs.readFileSync('certs/<cert>.crt');
  options.ca = fs.readFileSync('certs/<ca>.crt');
}

const httpsServer = (enableHTTPServer) ? https.createServer(options, app) : http.createServer(app);
const io = require('socket.io')(httpsServer);
io.use(require('socketio-wildcard')());
httpsServer.listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
  cachebuilder.buildcache(function () {
    logger.info(logHandler, "Cache initilization done");
    if(enableRabbitMq) {
      rabbitMQ.intializeMQ(logHandler)
        .then(
          (data)=> {
            console.log(constants.serverInitMessage);
          },(error)=> {
            logger.error(logHandler,error);
          });
    }
    else {
      console.log(constants.serverInitMessage);
    }
  });
});



io.on('connection', chathandler.handleSocket);
global.io = io;

process.on("message", function(message){
  console.log("Received signal : " + message);
  if (message === 'shutdown') {
    console.log("Shutting down server");
    httpsServer.close();
    setTimeout(function(){
      process.exit(0);
    }, 15000);
  }
});




// Faye Setup

let connectedUsers = new Set();
let subscribedUsers = new Set();
function connectUser(user) {
  connectedUsers.add(user);
  //logger.trace(logHandler,{USER_CON : user,_SIZE : connectedUsers.size});
}
function disconnectUser(user) {
  connectedUsers.delete(user);
  //logger.trace(logHandler,{USER_DISC : user,_SIZE :connectedUsers.size});
}
function subscribeUser(user,channel) {
  subscribedUsers.add(channel+"*"+user);
  //logger.trace(logHandler,{SUB : user,CHANNEL : channel, _SIZE:subscribedUsers.size});
}
function unsubscribeUser(user,channel) {
  subscribedUsers.delete(channel+"*"+user);
  //logger.trace(logHandler,{UNSUB : user,CHANNEL : channel, _SIZE:subscribedUsers.size});
}
app.get('/serverLog', function (req, res) {
  logger.info(logHandler,{CON_SIZE : connectedUsers.size, SUB_SIZE:subscribedUsers.size});
  res.send(200, {}, { pong: true });
});


const fayeConfig = {
  mount: '/faye',
  timeout : 30
};
if(enableFayeRedis) {
  fayeConfig.engine = {
    type:   fayeRedis,
    host:   'localhost',
    port:   6379
  }
}
const bayeux = new faye.NodeAdapter(fayeConfig);
bayeux.attach(httpsServer);

// let messageLog = Object.assign({},message);
// delete messageLog.supportedConnectionTypes;
// let ext = messageLog.ext;
// let newRelicTransactions = {};
let newRelicExtension =  {
  incoming: function(message, request, callback) {
    if(!(newrelic && message && message.channel)) {
      return callback(message);
    }
    let channel = "bayeux/default";
    if(message.channel && message.channel.indexOf("/meta/") == 0) {
      let channelSplit = message.channel.split('/');
      channel = "bayeux/" + (channelSplit[2] || "invalid");
    }
    newrelic.startWebTransaction(channel, function() {
      let newRelicTransaction = newrelic.getTransaction();
      setTimeout(function() {
        newRelicTransaction.end();
      }, 10);

      /*if(!message.id) {
        console.error("message id not found "+message.channel+" closing transaction");
        newRelicTransaction.end();
      }
      else {
        newRelicTransactions[message.id] = newrelic.getTransaction();
      }*/
      return callback(message);
    })
  },
  outgoing: function(message, callback) {
    /*if(newrelic && message && message.channel ) {
      if(message.id) {
        if(newRelicTransactions[message.id]) {
          newRelicTransactions[message.id].end();
        }
        else {
          console.error("oops transaction on found id : "+message.id+", channel : "+message.channel);
        }
      }
    }*/
    callback(message);
  }
};
bayeux.addExtension(newRelicExtension);


bayeux.on('handshake', function (clientId) {
  connectUser(clientId);
  logger.trace(logHandler, "Data on handshake: Client id : "+clientId);
});

bayeux.on('subscribe', function (clientId, channel) {
  subscribeUser(clientId,channel);
  logger.trace(logHandler, "Data on subscribe: Client id : "+clientId+" Channel :"+channel);
});

bayeux.on('publish', function (clientId, channel, data) {
  let opts = {
    clientId : clientId,
    channel  : channel,
    data     : data
  };
  chathandler.handlePublish(opts);
});

bayeux.on('unsubscribe', function (clientId, channel) {
  unsubscribeUser(clientId,channel);
  logger.trace(logHandler, "Data on unsubscribe: Client id : "+clientId+" Channel : "+channel);
});

bayeux.on('disconnect', function (clientId) {
  disconnectUser(clientId);
  logger.trace(logHandler, "Data on disconnect: Client id : "+clientId);
});

global.bayeux = bayeux; //WARNING : can cause issues in cluster mode





//custom handlers
process.on("uncaughtException", function(err) {
    console.error(utils.getCurrentTime() + " uncaughtException: " + err.message);
    console.error(err.stack);
});

if (!('toJSON' in Error.prototype))
  Object.defineProperty(Error.prototype, 'toJSON', {
    value: function () {
      let error = "{}";
      if(this.stack){
        let errStack = this.stack.split('\n');
        error = errStack[0] + errStack[1];
      }
      else if (this.message){
        error = this.message;
      }
      return error;
    },
    configurable: true,
    writable: true
  });


_.mixin({
  isJSON: function(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }
});

Set.prototype.isSuperset = function(subset) {
  for (const elem of subset) {
    if (!this.has(elem)) {
      return false;
    }
  }
  return true;
};

Set.prototype.union = function(setB) {
  const union = new Set(this);
  for (const elem of setB) {
    union.add(elem);
  }
  return union;
};

Set.prototype.intersection = function(setB) {
  const intersection = new Set();
  for (const elem of setB) {
    if (this.has(elem)) {
      intersection.add(elem);
    }
  }
  return intersection;
};

Set.prototype.difference = function(setB) {
  const difference = new Set(this);
  for (const elem of setB) {
    difference.delete(elem);
  }
  return difference;
};

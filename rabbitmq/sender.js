var amqp = require('amqplib/callback_api');

var amqpConn = null;



function closeOnErr(err) {
  if(!err) return false;
  console.error("[AMQP] error", err);
  amqpConn.close();
  return true;
}

function current_time() {
  now = new Date();
  hour = "" + now.getHours(); if(hour.length == 1) { hour = "0" + hour; }
  minute = "" + now.getMinutes(); if(minute.length == 1) { minute = "0" + minute; }
  second = "" + now.getSeconds(); if(second.length == 1) { second = "0" + second; }
  return hour + ":" + minute + ":" + second;
}

function start() {
  amqp.connect('amqp://localhost' + "?heartbeat=60", (err, conn) => {
    if(err) {
      console.error("[AMQP]", err.message);
      return setTimeout(start, 1000);
    }

    conn.on("error", (err) => {
      if(err.message !== "Connection closing") {
        console.error("[AMQP] conn error", err.message);
      }
    });

    conn.on("close", () => {
      console.error("[AMQP] reconnecting");
      return setTimeout(start, 1000);
    });

    console.log("[AMQP] connected");
    amqpConn = conn;
    whenConnected();
  });
}

function whenConnected() {
  startPublisher();
  // startWorker();
}

var pubChannel = null;
var offlinePubQueue = [];
var exchange = 'my-delay-exchange';





function startPublisher() {
  amqpConn.createConfirmChannel((err, ch) => {
    if(closeOnErr(err)) return;
    ch.on("error", (err) => {
      console.error("[AMQP] channel error", err.message);
    });
    ch.on("close", () => {
      console.log("[AMQP] channel closed");
    });
    pubChannel = ch;

    // assert the exchange: 'my-delay-exchange' to be a x-delayed-message,
    pubChannel.assertExchange(exchange, "x-delayed-message", {
      autoDelete : false, durable    : false, passive    : true,  arguments  : { 'x-delayed-type' : "direct" }
    });

    // Bind the queue: "jobs" to the exchnage: "my-delay-exchange" with the binding key "jobs"
    pubChannel.bindQueue('jobs', exchange, 'jobs');


    /*  while (true) {
      var m = offlinePubQueue.shift();
      if (!m) {
        console.error("[AMQP] out of loop");
        break;
      }
      publish(m[0], m[1], m[2]);
    } */
  });
}

function publish(routingKey, content, delay) {
  try {
    pubChannel.publish(
      exchange, routingKey, content, { headers : { "x-delay" : delay } },
      (err, ok) => {
        if(err) {
          console.error("[AMQP] publish", err);
          offlinePubQueue.push([exchange, routingKey, content]);
          pubChannel.connection.close();
        }
      }
    );
  } catch (e) {
    console.error("[AMQP] failed", e.message);
    offlinePubQueue.push([routingKey, content, delay]);
  }
}

// Publish a message every 10 second. The message will be delayed 10seconds.
setInterval(() => {
  var date = new Date();
  publish("jobs", new Buffer("work sent: " + current_time()), 5000);
}, 5000);

start();



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
  // startPublisher();
  startWorker();
}



// A worker that acks messages only if processed succesfully
function startWorker() {
  amqpConn.createChannel((err, ch) => {
    if(closeOnErr(err)) return;
    ch.on("error", (err) => {
      console.error("[AMQP] channel error", err.message);
    });
    ch.on("close", () => {
      console.log("[AMQP] channel closed");
    });

    ch.prefetch(10);
    ch.assertQueue("jobs", { durable : true }, (err, _ok) => {
      if(closeOnErr(err)) return;
      ch.consume("jobs", processMsg, { noAck : false });
      console.log("Worker is started");
    });

    function processMsg(msg) {
      work(msg, (ok) => {
        try {
          if(ok) { ch.ack(msg); } else { ch.reject(msg, true); }
        } catch (e) {
          closeOnErr(e);
        }
      });
    }

    function work(msg, cb) {
      console.log(msg.content.toString() + " --- received: " + current_time());
      cb(true);
    }
  });
}

start();


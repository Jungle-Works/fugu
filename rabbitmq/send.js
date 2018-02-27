#!/usr/bin/env node

var amqp = require('amqplib/callback_api');

amqp.connect('amqp://localhost', (err, conn) => {
  conn.createChannel((err, ch) => {
    var q = 'task_queu';
    var msg = 'new message';

    console.log("sending messages");
    sendMessage(ch, q);
  });
  // setTimeout(function() { conn.close(); process.exit(0) }, 500);
});


var i = 1;

function sendMessage(ch, q) {
  setTimeout(() => {
    var msg = JSON.stringify(i + ' : ' + Math.random());
    ch.assertQueue(q, { durable : true });
    ch.sendToQueue(q, new Buffer(msg));
    // console.log(" [x] Sent %s", msg);
    i++;
    if(i < 10000000) {
      sendMessage(ch, q);
    }
  }, 1000);
}

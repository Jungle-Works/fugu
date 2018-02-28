#!/bin/bash
NODE_ENV=<ENV> pm2 start /<PATH>/server.js --name fugu-chat -i 2 --max-memory-restart 2G;
sleep 2s;

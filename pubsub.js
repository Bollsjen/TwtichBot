const WebSocket = require('ws');
const dotenv = require('dotenv');
dotenv.config();

let ws;
let heartbeatHandle;

function nonce(length) {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function heartbeat() {
  const message = {
    type: 'PING'
  };
  ws.send(JSON.stringify(message));
}

function listen(topic) {
  const message = {
    type: 'LISTEN',
    nonce: nonce(15),
    data: {
      topics: [topic],
      auth_token: process.env.ACCESS_TOKEN
    }
  };
  ws.send(JSON.stringify(message));
}

function connect() {
  const heartbeatInterval = 1000 * 60; //ms between PINGs
  const reconnectInterval = 1000 * 3; //ms to wait before reconnect

  ws = new WebSocket('wss://pubsub-edge.twitch.tv');

  ws.on('open', () => {
    console.log('INFO: Socket Opened');
    heartbeat();
    heartbeatHandle = setInterval(heartbeat, heartbeatInterval);
  });

  ws.on('error', (error) => {
    console.error('ERR:', error);
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('RECV:', message);

    if (message.type === 'RECONNECT') {
      console.log('INFO: Reconnecting...');
      setTimeout(connect, reconnectInterval);
    } else if (message.type === 'MESSAGE') {
      const messageData = JSON.parse(message.data.message);
      console.log(`Channel Point Redemption: ${messageData.data.redemption.reward.title} by ${messageData.data.redemption.user.display_name}`);
      // Handle the redemption here
    }
  });

  ws.on('close', () => {
    console.log('INFO: Socket Closed');
    clearInterval(heartbeatHandle);
    console.log('INFO: Reconnecting...');
    setTimeout(connect, reconnectInterval);
  });
}

function startListening() {
  const userId = process.env.USERID; // You need to set this in your .env file or fetch dynamically
  listen(`channel-points-channel-v1.${userId}`);
}

module.exports = { connect, startListening };

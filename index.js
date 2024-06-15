const tmi = require('tmi.js');
require('dotenv').config()
const { commandHandler } = require('./commandHandler.js')
const { rewardHandler } = require('./rewardHandler.js')
const express = require('express');
const http = require('http')
const bodyParser = require('body-parser');
const fs = require('fs');
const socketIo  = require('socket.io')

const myUrl = 'https://bollsjen.loca.lt' // 'https://www.twbot.bollsjen.dk'

const app = express();
const server = http.createServer(app)
const port = 3000;
const clientPort = 5000
const io = socketIo(server)

let tokens = {}

function readTokens(){
  const jsonData = fs.readFileSync('./tokens.json')
  tokens = JSON.parse(jsonData)
}

function writeTokens(key, value){
  tokens[key] = value
  const json = JSON.stringify(tokens)
  fs.writeFileSync('./tokens.js', json)
}

readTokens()

// Define configuration options
const opts = {
    options: { debug: true },
    connection: {
      reconnect: true,
      secure: true
    },
  identity: {
    username: process.env.BOT,
    password: process.env.OAUTH
  },
  channels: [
    process.env.CHANNEL
  ]
};

// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot

  // Remove whitespace from chat message
  const commandName = msg.trim();

  // If the command is known, let's execute it
  if (commandName.startsWith('!')) {
    const parts = commandName.substring(1).split(' ')
    const command = parts[0]
    const args = parts.slice(1)

    commandHandler(client, target, command, args)
  }
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}



// Middleware to parse JSON bodies
app.use(bodyParser.json());
app.use(express.static('public'))

//app.use((req, res, next) => {
//  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
//  console.log(req.body)
//  next(); // Pass control to the next middleware function
//});
app.get('/test', (req, res) => {
  res.status(200).send('Hello World!')
})

io.on('connection', (socket) => {
  console.log('New client connected')
})

app.post('/', (req, res) => {
  const message = req.body;
  console.log('what')

  // Check if this is a verification request from Twitch
  if (message.challenge) {
      console.log('Received verification challenge from Twitch:', message.challenge);
      writeTokens(message.challenge)
      // Respond with the challenge token to verify this endpoint
      res.status(200).send(message.challenge);
  } else {
      console.log('Received webhook notification:', message.event);
      rewardHandler(message.event, client, io)

      // Handle other types of EventSub notifications here
      res.status(200).json({ received: true });
  }
});

// Handle challenge requests from Twitch
app.post('/webhooks/callback', (req, res) => {
  console.log('hello')
  const { challenge } = req.query;
  if (req.body.subscription.type === 'channel.channel_points_custom_reward_redemption.add') {
    // Respond to Twitch's challenge request
    res.status(200).send(challenge);
  } else {
    res.status(200).send();
  }
});

// Handle notification from Twitch
app.post('/webhooks/callback', (req, res) => {
  console.log('huh')
  const data = req.body;
  console.log('Received event:', data);

  // Respond to Twitch to acknowledge receipt of the notification
  res.status(200).send();
  
  // Additional handling logic can go here
});

app.post('/eventsub', (req, res) => {
  console.log('huh')
  const message = req.body;
  
  // Verify the subscription challenge
  if (message.challenge) {
      res.status(200).send(message.challenge);
  } else {
      // Handle other types of messages here
      console.log('Received notification:', message);
      res.status(200).json({ received: true });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

server.listen(clientPort, () => {
  console.log(`Listening on port ${clientPort}`)
})





async function subscribe(){
  const clientId = process.env.CLIENTID
  const broadcasterId = process.env.USERID
  const secret = process.env.SECRET

  const token = await getAppAccessToken(clientId,  secret, process.env.OAUTH)

  if(tokens && tokens.twitchChallenge && tokens.twitchChallenge !== ''){
    await fetchSubscriptions(token, clientId)
  }
  const url = 'https://api.twitch.tv/helix/eventsub/subscriptions';
    const body = {
        type: "channel.channel_points_custom_reward_redemption.add",
        version: "1",
        condition: {
            broadcaster_user_id: broadcasterId
        },
        transport: {
            method: "webhook",
            callback: myUrl,
            secret: secret
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Client-ID': clientId,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const message = `An error has occurred: ${response.status}`;
        console.log('ERROR', message)
    }

    const responseData = await response.json();
    console.log('Subscription created successfully:', responseData);
}

subscribe()


async function getAppAccessToken(clientId, clientSecret, oauth) {
  const url = 'https://id.twitch.tv/oauth2/token';
  const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
  });

  try {
      const response = await fetch(`${url}?${params}`, { method: 'POST' });
      const data = await response.json();
      return data.access_token; // This token should be used for creating subscriptions
  } catch (error) {
      console.error('Failed to obtain app access token:', error);
  }
  return undefined
}

async function cancelSubscription(token, clientId, subscriptionId) {
  const url = `https://api.twitch.tv/helix/eventsub/subscriptions?id=${subscriptionId}`;

  try {
      const response = await fetch(url, {
          method: 'DELETE',
          headers: {
              'Authorization': `Bearer ${token}`,
              'Client-ID': clientId
          }
      });

      if (response.ok) {
          console.log('Subscription cancelled successfully');
          // Optionally, clear the subscription ID in tokens.json after successful cancellation
          writeTokens('twitchChallenge', '');
      } else {
          const data = await response.json();
          console.error('Failed to cancel subscription:', data);
      }
  } catch (error) {
      console.error('Error cancelling subscription:', error);
  }
}

async function fetchSubscriptions(token, clientId) {
  const url = 'https://api.twitch.tv/helix/eventsub/subscriptions';

  try {
      const response = await fetch(url, {
          method: 'GET',
          headers: {
              'Authorization': `Bearer ${token}`,
              'Client-ID': clientId
          }
      });
      const data = await response.json();
      for(let i = 0; i < data.total; i++){
        cancelSubscription(token, clientId, data.data[i].id)
      }
      return data;
  } catch (error) {
      console.error('Error fetching subscriptions:', error);
  }
}

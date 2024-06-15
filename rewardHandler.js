const fs = require('fs');
const path = require('path');

function rewardHandler(event, client, io){
    console.log('rewardHandler')
    const rewardPath = path.join(__dirname, 'rewards', `${event.reward.title.toLowerCase()}.js`);

      // Check if the command file exists
  if (fs.existsSync(rewardPath)) {
    // Require and execute the command
    const rewardFunction = require(rewardPath);
    rewardFunction(event, client, '#'+event.broadcaster_user_name, io);
    console.log(`* Redeemed ${event.reward.title}`);
  } else {
    
  }
}

module.exports = { rewardHandler };
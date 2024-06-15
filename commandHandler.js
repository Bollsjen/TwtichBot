// commandHandler.js
const fs = require('fs');
const path = require('path');

function commandHandler(client, target, command, args) {
  // Define the path to the command file
  const commandPath = path.join(__dirname, 'commands', `${command}.js`);

  // Check if the command file exists
  if (fs.existsSync(commandPath)) {
    // Require and execute the command
    const commandFunction = require(commandPath);
    commandFunction(client, target, args);
    console.log(`* Executed !${command} command with arguments: ${args.join(' ')}`);
  } else {
    console.log(`* Unknown command !${command}`);
  }
}

module.exports = { commandHandler };

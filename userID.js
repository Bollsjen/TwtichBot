const fetch = require('node-fetch');

async function fetchTwitchUserID() {
  const response = await fetch('https://api.twitch.tv/helix/users?login=bollsjen', {
    headers: {
      'Client-ID': 'sk1n4encfkzmusyha74f83hub2212q',
      'Authorization': 'Bearer aq5622yfyv3qe5ge6xuu60cuztif58',
      'Accept': 'application/vnd.twitchtv.v5+json'
    }
  });

  const data = await response.json();
  console.log(data);
}

fetchTwitchUserID();

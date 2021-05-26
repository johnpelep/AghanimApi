const axios = require('axios');
const {
  key,
  getPlayerSummaryUrl,
  getMatchesUrl,
  resolveVanityUrl,
  playerDataUrl,
} = require('../config');

module.exports = {
  async getPlayerSummary(accounts) {
    const res = await axios
      .get(buildUrl(accounts))
      .then((response) => response)
      .catch((err) => {
        throw err;
      });
    return res.data.response.players;
  },
  async getMatches(steamId32, limit) {
    const LOBBY_TYPE = 7; // ranked
    const SORT_BY = 'match_id';
    const res = await axios
      .get(
        `${getMatchesUrl.replace(
          '{account_id}',
          steamId32
        )}?limit=${limit}&lobby_type=${LOBBY_TYPE}&sort=${SORT_BY}`
      )
      .then((response) => response)
      .catch((err) => {
        throw err;
      });
    return res.data;
  },
  async resolveVanityUrl(vanityUrl) {
    const res = await axios
      .get(`${resolveVanityUrl}?key=${key}&vanityurl=${vanityUrl}`)
      .then((response) => response)
      .catch((err) => {
        throw err;
      });
    return res.data;
  },
  async getPlayerData(steamId32) {
    const res = await axios
      .get(`${playerDataUrl.replace('{account_id}', steamId32)}`)
      .then((response) => response.data)
      .catch((err) => {
        throw err;
      });
    return res;
  },
};

function buildUrl(accounts) {
  const steamIds = [];

  for (let i = 0; i < accounts.length; i++) {
    steamIds.push(accounts[i].steamId64);
  }

  return `${getPlayerSummaryUrl}?key=${key}&steamids=${steamIds.join(',')}`;
}

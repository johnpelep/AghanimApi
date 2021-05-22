module.exports = {
  port: process.env.PORT,
  key: process.env.STEAM_API_KEY,
  getPlayerSummaryUrl: process.env.STEAM_API_URL,
  getMatchesUrl: process.env.RECENT_MATCHES_URL,
  resolveVanityUrl: process.env.RESOLVE_VANITY_URL,
  connectionString: process.env.CONNECTION_STRING,
};

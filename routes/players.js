var express = require('express');
var router = express.Router();
const accountService = require('../services/accountService');
const accountHelper = require('../helpers/accountHelper');
const dotaApiService = require('../services/dotaApiService');

// hindaw
router.get('/', async (req, res) => {
  const personaName = req.query.personaName;

  // get account from db
  let account = await accountService.getAccount({ personaName: personaName });

  if (!account) return res.sendStatus(404);

  // sync account
  account = await accountHelper.syncAccount(account);

  res.send(account);
});

// invite
router.post('/', async (req, res) => {
  let profileUrl = req.body.profileUrl;

  if (profileUrl.indexOf('steamcommunity.com/') == -1)
    return res.status(400).send({ message: 'Invalid steam profile url' });

  // remove last slash
  if (profileUrl.endsWith('/')) profileUrl = profileUrl.slice(0, -1);

  // split url and get last item
  const steamUrlSplit = profileUrl.split('/');
  let steamId64 = steamUrlSplit[steamUrlSplit.length - 1];

  //check if link is custom url
  if (profileUrl.indexOf('steamcommunity.com/id/') > -1) {
    // get steamId64
    const res = await dotaApiService.resolveVanityUrl(steamId64);

    if (res.response.success == 1) {
      steamId64 = res.response.steamid;
    }
  }

  // check if steam id is valid
  const players = await dotaApiService.getPlayerSummary([
    { steamId64: steamId64 },
  ]);

  if (!players.length)
    return res.status(400).send({ message: 'Steam user not found' });

  // check if account is already in collection
  const player = players[0];
  const updateDoc = {
    $set: {
      personaName: player.personaname,
      avatar: player.avatarfull,
    },
  };
  let account = await accountService.getAccountAndUpdate(
    { steamId64: steamId64 },
    updateDoc
  );

  if (account.value) {
    await accountHelper.syncAccount(account.value);
    return res.status(400).send({
      message: 'Account already exists',
      personaName: player.personaname,
    });
  }

  // calc steamId32 from steamId64
  const steamId32 = accountHelper.steamID64toSteamID32(steamId64);

  // create account document
  account = {
    personaName: player.personaname,
    steamId64: steamId64,
    steamId32: steamId32,
    avatar: player.avatarfull,
  };

  await accountService.addAcount(account);

  await accountHelper.syncAccount(account);

  return res.status(201).send({ personaName: player.personaname });
});

module.exports = router;

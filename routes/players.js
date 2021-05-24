var express = require('express');
var router = express.Router();
const accountService = require('../services/accountService');
const accountHelper = require('../helpers/accountHelper');
const dotaApiService = require('../services/dotaApiService');

// get account list
router.get('/', async (req, res) => {
  // get accounts from db
  const accounts = await accountService.getAccounts(req.query);

  if (!accounts.length) return res.sendStatus(404);

  res.send(accounts);
});

// get account
router.get('/:steamId64', async (req, res) => {
  // get account from db
  let account = await accountService.getAccount(req.params);

  if (!account) return res.sendStatus(404);

  // sync account
  account = await accountHelper.syncAccount(account);

  res.send(account);
});

// add account
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

  // add account to db
  const steamId32 = accountHelper.steamID64toSteamID32(steamId64);
  account = {
    personaName: player.personaname,
    steamId64: steamId64,
    steamId32: steamId32,
    avatar: player.avatarfull,
  };
  await accountService.addAcount(account);

  // sync account
  await accountHelper.syncAccount(account);

  return res.status(201).send({ personaName: player.personaname });
});

// delete account
router.delete('/:steamId64', async (req, res) => {
  const filter = req.params;

  // check if account exist
  const account = await accountService.getAccount(filter);
  if (!account) return res.sendStatus(404);

  // delete account from db
  const result = await accountService.deleteAccount(filter);

  if (result.deletedCount) return res.sendStatus(204);
});

module.exports = router;

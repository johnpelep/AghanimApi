const express = require('express');
const app = express();
const { port } = require('./config');
const accountService = require('./services/accountService');
const accountHelper = require('./helpers/accountHelper');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Hello worlds!');
});

// hindaw
app.get('/player', async (req, res) => {
  const personaName = req.query.personaName;

  // get account from db
  let account = await accountService.getAccount({ personaName: personaName });

  // check if account exist
  if (!account)
    return res.send(
      `account **${personaName}** is wara sa listahan. Paki-add anay gamit an **Invite!** command`
    );

  // sync account
  account = await accountHelper.syncAccount(account);

  // check if account has record
  if (!account.record || !account.record.streakCount)
    return res.send(
      `account **${personaName}** has no match recorded for this month`
    );

  res.send(account);
});

app.post('/', (req, res) => {
  res.send('Hello worlds!');
});

app.listen(port, () => {
  console.log(`AghanimApi listening at http://localhost:${port}`);
});

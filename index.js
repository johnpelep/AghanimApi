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

  // sync account
  if (account) account = await accountHelper.syncAccount(account);

  res.send(account);
});

// invite
app.post('/player', (req, res) => {
  res.send('Hello worlds!');
});

app.listen(port, () => {
  console.log(`AghanimApi listening at port:${port}`);
});

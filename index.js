const express = require('express');
const app = express();
const { port } = require('./config');
const players = require('./routes/players');
const constants = require('./routes/constants');
const interactions = require('./routes/interactions');

app.use(maybe(express.json()));
app.use(maybe(express.urlencoded({ extended: true })));

app.get('/', (req, res) => {
  res.send('Hello world!');
});

app.use('/players', players);
app.use('/constants', constants);
app.use('/interactions', interactions);

app.listen(port, () => {
  console.log(`AghanimApi listening at port:${port}`);
});

// https://stackoverflow.com/a/19337607
function maybe(fn) {
  return function (req, res, next) {
    if (req.path == '/interactions') {
      next();
    } else {
      fn(req, res, next);
    }
  };
}

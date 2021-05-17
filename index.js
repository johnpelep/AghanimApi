const express = require('express');
const app = express();
const { port } = require('./config');

app.get('/', (req, res) => {
  res.send('Hello worlds!');
});

app.listen(port, () => {
  console.log(`AghanimApi listening at http://localhost:${port}`);
});

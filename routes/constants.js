const express = require('express');
const router = express.Router();

router.get('/:name', (req, res) => {
  try {
    const constant = require(`../constants/${req.params.name}.json`);
    res.send(constant);
  } catch (error) {
    if (error.code == 'MODULE_NOT_FOUND') return res.sendStatus(404);
    throw error;
  }
});

module.exports = router;

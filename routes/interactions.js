const express = require('express');
const router = express.Router();
const { discordPublicKey } = require('../config');
const {
  verifyKeyMiddleware,
  InteractionType,
  InteractionResponseType,
} = require('discord-interactions');

router.post('/', verifyKeyMiddleware(discordPublicKey), (req, res) => {
  if (req.body.type == InteractionType.PING)
    return res.send({ type: InteractionResponseType.PONG });

  const message = req.body;
  if (message.type === InteractionType.APPLICATION_COMMAND) {
    res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Hello world',
      },
    });
  }
});

module.exports = router;

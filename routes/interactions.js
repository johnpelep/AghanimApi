const express = require('express');
const router = express.Router();
const nacl = require('tweetnacl');
const { discordPublicKey } = require('../config');

router.post('/', (req, res) => {
  // validate headers
  const signature = req.get('X-Signature-Ed25519');
  const timestamp = req.get('X-Signature-Timestamp');
  const body = req.rawBody; // rawBody is expected to be a string, not raw bytes

  const isVerified = nacl.sign.detached.verify(
    Buffer.from(timestamp + body),
    Buffer.from(signature, 'hex'),
    Buffer.from(discordPublicKey, 'hex')
  );

  if (!isVerified) {
    return res.status(401).end('invalid request signature');
  }

  if (req.body.type == 1) return res.status(200).send({ type: 1 });

  return res
    .status(200)
    .send({ type: 4, data: { content: 'congrats sa slash command' } });
});

module.exports = router;

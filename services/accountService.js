const { connectionString } = require('../config');
const MongoClient = require('mongodb').MongoClient;

module.exports = {
  async addAcount(account) {
    const client = new MongoClient(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    try {
      await client.connect();

      const database = client.db('aghanimDB');
      const collection = database.collection('accounts');

      await collection.insertOne(account);
    } finally {
      await client.close();
    }
  },
  async getAccountAndUpdate(filter, updateDoc) {
    const client = new MongoClient(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    let account = null;

    try {
      await client.connect();

      const database = client.db('aghanimDB');
      const collection = database.collection('accounts');

      account = await collection.findOneAndUpdate(filter, updateDoc, {
        returnOriginal: false,
      });
    } finally {
      await client.close();
    }

    return account;
  },
  async getAccounts() {
    const client = new MongoClient(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    let accounts = [];

    try {
      await client.connect();

      const database = client.db('aghanimDB');
      const collection = database.collection('accounts');
      const accountsCursor = await collection.find();

      await accountsCursor.forEach((a) => accounts.push(a));
    } finally {
      await client.close();
    }

    return accounts;
  },
  async getAccount(filter) {
    console.log(process.env.CONNECTION_STRING);
    const client = new MongoClient(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    let account = null;

    try {
      await client.connect();

      const database = client.db('aghanimDB');
      const collection = database.collection('accounts');

      account = await collection.findOne(filter);
    } finally {
      await client.close();
    }

    return account;
  },
  async deleteAccount(filter) {
    const client = new MongoClient(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    let result = {};

    try {
      await client.connect();

      const database = client.db('aghanimDB');
      const collection = database.collection('accounts');

      result = await collection.deleteOne(filter);
    } finally {
      await client.close();
    }

    return result;
  },
};

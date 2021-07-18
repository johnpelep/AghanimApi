const accountService = require('../services/accountService');
const dotaApiService = require('../services/dotaApiService');
const medals = require('../constants/medals.json');
const personaStates = require('../constants/personaStates.json');
const dateToday = getTimeInPH();
const lastDayOfPreviousMonth =
  new Date(dateToday.getFullYear(), dateToday.getMonth(), 1).getTime() - 1;

module.exports = {
  /**
   * @name syncAccount
   * @description Sync account info and/or record.
   * @param {object} account Account to update.
   * @param {number} [syncType=1] 1 for Both, 2 for Info, 3 for Record.
   *
   * @returns {object} Updated account.
   */
  async syncAccount(account, syncType) {
    if (!syncType) syncType = 1;

    let updateDoc = {
      $set: {},
    };

    if (syncType == 1 || syncType == 2)
      updateDoc = await this.getAccountInfoUpdate(account);

    if (syncType == 1 || syncType == 3)
      updateDoc = await this.getAccountRecordUpdate(account, updateDoc);

    // if update found, sync db
    if (Object.keys(updateDoc.$set).length) {
      account = await accountService.getAccountAndUpdate(
        { steamId64: account.steamId64 },
        updateDoc
      );
    }

    // set medal image
    if (account.rank) {
      if (!account.rank.rankTier) account.rank.rankTier = 0;
      account.rank.medalImageUrl = getMedalImage(account.rank.rankTier);
    }

    return account;
  },
  async getAccountInfoUpdate(account, updateDoc) {
    if (!updateDoc) {
      updateDoc = {
        $set: {},
      };
    }

    // get player data
    const player = await dotaApiService.getPlayerData(account.steamId32);

    // check rank update
    if (
      player.rank_tier &&
      (!account.rank ||
        (account.rank && account.rank.rankTier != player.rank_tier))
    ) {
      updateDoc.$set.rank = {
        rankTier: player.rank_tier,
        medal: getMedal(player.rank_tier),
      };
    }

    if (player.profile) {
      // check personaname update
      if (account.personaName != player.profile.personaname) {
        updateDoc.$set.personaName = player.profile.personaname;
      }

      // check avatar update
      if (account.avatar != player.profile.avatarfull) {
        updateDoc.$set.avatar = player.profile.avatarfull;
      }
    }

    return updateDoc;
  },
  async getAccountRecordUpdate(account, updateDoc) {
    if (!updateDoc) {
      updateDoc = {
        $set: {},
      };
    }

    // remove last month record
    if (
      account.record &&
      account.record.lastMatchTime <= lastDayOfPreviousMonth
    ) {
      account = await removeLastMonthRecord(account.steamId64);
    }

    // initialize record obj
    if (!account.record) {
      account.record = {
        lastMatchTime: null,
      };
    }

    // initialize lastMatchTime property
    account.record.lastMatchTime = setLastMatchTime(
      account.record.lastMatchTime
    );

    // get matches
    const limit = calcLimit(account.record.lastMatchTime);
    const matches = await dotaApiService.getMatches(account.steamId32, limit);
    const record = calcRecord(matches, account);
    if (record.recordChanged) {
      delete record.recordChanged;
      updateDoc.$set.record = record;
    }

    return updateDoc;
  },
  async getAccountStatus(accounts) {
    const players = await dotaApiService.getPlayerSummary(accounts);

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      const player = players.find((p) => p.steamid == account.steamId64);

      if (!player) return;

      // get user status
      account.status = {
        personaState: player.personastate,
        userStatus: personaStates.find(
          (p) => p.personaState == player.personastate
        ).userStatus,
      };

      // get game user currently playing
      if (player.gameextrainfo) account.status.game = player.gameextrainfo;

      // get last log off
      if (player.lastlogoff) account.status.lastLogOff = player.lastlogoff;
    }

    return accounts;
  },
  steamID64toSteamID32(steamID64) {
    // Source: https://stackoverflow.com/questions/23259260/convert-64-bit-steam-id-to-32-bit-account-id#:~:text=To%20convert%20a%2064%20bit,from%20the%2064%20bit%20id.
    return (Number(steamID64.substr(-16, 16)) - 6561197960265728).toString();
  },
};

function setLastMatchTime(lastMatchTime) {
  if (!lastMatchTime || lastMatchTime < lastDayOfPreviousMonth)
    return lastDayOfPreviousMonth;

  return lastMatchTime;
}

async function removeLastMonthRecord(steamId64) {
  const updateDoc = {
    $unset: {
      record: '',
    },
  };
  const account = await accountService.getAccountAndUpdate(
    { steamId64: steamId64 },
    updateDoc
  );
  return account;
}

function calcLimit(lastMatchTime) {
  const ABOVE_AVG_GAMES_PER_DAY = 10;
  const dateToday = new Date();
  const lastMatchDate = new Date(lastMatchTime);

  // check if lastMatchDate is not in current month
  if (lastMatchDate.getMonth() != dateToday.getMonth())
    return dateToday.getDate() * ABOVE_AVG_GAMES_PER_DAY;

  return (
    (new Date().getDate() - lastMatchDate.getDate() + 1) *
    ABOVE_AVG_GAMES_PER_DAY
  );
}

function calcRecord(matches, account) {
  let winCount = account.record.winCount ? account.record.winCount : 0;
  let lossCount = account.record.lossCount ? account.record.lossCount : 0;
  let streakCount = 0;
  let isWinStreak = false;
  let isStreakEnd = false;
  let recordChanged = false;

  if (matches.length) {
    for (let j = 0; j < matches.length; j++) {
      let match = matches[j];

      if (match.start_time * 1000 <= account.record.lastMatchTime) break;

      if (match.lobby_type == 7) {
        let isWinner =
          (match.player_slot < 128 && match.radiant_win) ||
          (match.player_slot > 127 && !match.radiant_win);

        if (j == 0 && isWinner) isWinStreak = true;

        if (isWinner == isWinStreak && !isStreakEnd) streakCount++;
        else isStreakEnd = true;

        if (isWinner) winCount++;
        else lossCount++;

        recordChanged = true;
      }
    }

    account.record.lastMatchTime = matches[0].start_time * 1000;
  }

  //check if streak continued
  if (
    isWinStreak == account.record.isWinStreak &&
    recordChanged &&
    !isStreakEnd
  )
    streakCount += account.record.streakCount;

  return {
    winCount: winCount,
    lossCount: lossCount,
    streakCount: streakCount,
    isWinStreak: isWinStreak,
    lastMatchTime: account.record.lastMatchTime,
    recordChanged: recordChanged,
  };
}

function getMedal(rankTier) {
  if (!rankTier) rankTier = 0;
  const medal = medals.find((m) => m.rankTier == rankTier);
  return medal.name;
}

function getMedalImage(rankTier) {
  const medal = medals.find((m) => m.rankTier == rankTier);
  return medal.imageUrl;
}

//https://stackoverflow.com/a/8207708
function getTimeInPH() {
  const OFFSET = 8; //UTC+8

  // create Date object for current location
  var d = new Date();

  // convert to msec
  // subtract local time zone offset
  // get UTC time in msec
  var utc = d.getTime() + d.getTimezoneOffset() * 60000;

  // create new Date object for different city
  // using supplied offset
  return new Date(utc + 3600000 * OFFSET);
}

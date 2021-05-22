const accountService = require('../services/accountService');
const dotaApiService = require('../services/dotaApiService');
const dateToday = new Date();
const lastDayOfPreviousMonth = new Date(dateToday.getFullYear(), dateToday.getMonth(), 1).getTime() - 1;

module.exports = {
    async syncAccount(account) {
        // remove last month record
        if (account.record && account.record.lastMatchTime <= lastDayOfPreviousMonth) {
            account = await removeLastMonthRecord(account.steamId64);
        }

        if (!account.record) { 
            account.record = {
                lastMatchTime: null
            };
        }

        account.record.lastMatchTime = setLastMatchTime(account.record.lastMatchTime);

        const limit = calcLimit(account.record.lastMatchTime);
        const matches = await dotaApiService.getMatches(account.steamId32, limit);
        const record = calcRecord(matches, account);

        if (record.recordChanged) {
            delete record.recordChanged;
            const updateDoc = {
                $set: {
                    personaName: account.personaName,
                    avatar: account.avatar,
                    record: record
                }
            };
            account = await accountService.getAccountAndUpdate({ steamId64: account.steamId64 }, updateDoc);
            return account.value;
        }

        return account;
    }
}

function setLastMatchTime(lastMatchTime) {

    if (!lastMatchTime || lastMatchTime < lastDayOfPreviousMonth)
        return lastDayOfPreviousMonth;

    return lastMatchTime; 
}

async function removeLastMonthRecord(steamId64) {
    const updateDoc = {
        $unset: {
            record: ''
        }
    };
    const account = await accountService.getAccountAndUpdate({ steamId64: steamId64 }, updateDoc);
    return account.value;
}

function calcLimit(lastMatchTime) {
    const ABOVE_AVG_GAMES_PER_DAY = 15;
    const dateToday = new Date();
    const lastMatchDate = new Date(lastMatchTime);

    // check if lastMatchDate is not in current month 
    if (lastMatchDate.getMonth() != dateToday.getMonth())
        return dateToday.getDate() * ABOVE_AVG_GAMES_PER_DAY;

    return (new Date().getDate() - lastMatchDate.getDate() + 1) * ABOVE_AVG_GAMES_PER_DAY;
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
				let isWinner = (match.player_slot < 128 && match.radiant_win) || (match.player_slot > 127 && !match.radiant_win);

				if (j == 0 && isWinner)
                    isWinStreak = true;
	
				if (isWinner == isWinStreak && !isStreakEnd)
                    streakCount++;
				else
					isStreakEnd = true;
	
				if (isWinner)
                    winCount++;
				else
                    lossCount++;
                
                recordChanged = true;
			}
        }
        
        account.record.lastMatchTime = matches[0].start_time * 1000;
    }
    
    //check if streak continued
    if (isWinStreak == account.record.isWinStreak && recordChanged && !isStreakEnd) 
        streakCount += account.record.streakCount;

	return {
        winCount: winCount,
        lossCount: lossCount,
        streakCount: streakCount,
        isWinStreak: isWinStreak,
        lastMatchTime: account.record.lastMatchTime,
        recordChanged: recordChanged
    };
}

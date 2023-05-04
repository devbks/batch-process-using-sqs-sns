// import dotenv from 'dotenv';
import moment from 'moment';

import publishToSnS, { transformToSnsParams } from './publishToSnS.js';
import { closeConnection, executeQuery } from '../data/index.js';
import { ConsolidatedList } from '../types/player-interface.js';
import { Match } from '../types/match-interface.js';
// dotenv.config();

/**
 * Standalone function to fetch unprocessed matches and send to SNS topic.
 * this function loop through each match at a time therforefore expect the n number of bulk messages to SNS
 * Possible bottlenecks: longer execution time beased on the number of matches and performance of the query
 * Future enhancement: Optimise the relational query to fetch players along organiser and clubs, fan-out the payment processing
 * @returns void
*/

// prepare previous dat range
const previousDayTimestamps: string = [
    `"${moment().subtract(4, 'day').startOf('day').format('YYYY-MM-DD HH:mm:ss')}"`,
    `"${moment().subtract(4, 'day').endOf('day').format('YYYY-MM-DD HH:mm:ss')}"`
].join(' and ');

export const handler = async (): Promise<void> => {
    /**
     * Fetch matches held on previous day only assuming, this way top level set of records is seperated
     */
    const [matchesHeld, matchError] = await executeQuery(`
        SELECT id, competition_id
        FROM matches
        WHERE date BETWEEN ${previousDayTimestamps}
    `) as [Match[], Error | null];

    if (matchError !== null) {
        console.error(matchError);
        return closeConnection();
    }

    try {
        await Promise.allSettled(matchesHeld.map((match: Match) => new Promise(async (resolve, reject) => {
            // Get consolidated list of players, clubs and organisers, 
            // @TODO find god level ORM and use it
            const [consolidatedList, consolidatedListError] = await executeQuery(`
                SELECT m.id, mp.player_id, p.club_id, c.organiser_id, p.stripe_customer_id as player_stripe_id, cl.stripe_customer_id club_stripe_id, o.stripe_customer_id as organiser_stripe_id
                FROM matches m
                INNER JOIN match_players mp ON m.id = mp.match_id
                INNER JOIN players p on mp.player_id = p.id
                INNER JOIN clubs cl on cl.id = p.club_id
                INNER JOIN competitions c on m.competition_id = c.id
                INNER JOIN organisers o on o.id = c.organiser_id
                where m.id = ${match.id};
            `) as [ConsolidatedList[], Error | null];

            if (consolidatedListError) {
                // short circuit the loop
                return true;
            }

            // Transforming each record into expected format, alternatively should be processed in standalone function
            const [success, error] = await publishToSnS(transformToSnsParams(consolidatedList))

            if (!error) {
                console.log(success);
                resolve(success);
            }
            reject();
        })));

        return closeConnection()
    } catch (err) {
        console.error(err);
        return closeConnection();
    }
};

if (process.env.Local === 'true') {
    handler();
}

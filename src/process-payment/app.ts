import { Stripe } from 'stripe';
import { SQSEvent } from 'aws-lambda';

import { executeQuery } from '../data/index.js';
import { FeeStructure } from '../types/FeeStructure.js';

// Records interface, @todo put it in types and export so it can be used by other lambda function
interface Record {
  matchId: number;
  playerId: number;
  clubId: number;
  organiserId: number;
  playerStripeId: string;
  clubStripeId: string;
  organiserStripeId: string;
}

const stripeKey: string = process.env.STRIPE_SECRET_KEY || '';
const stripeConfig: Stripe.StripeConfig  = {
    apiVersion: '2022-11-15'
}
// Initialize Stripe
const stripe = new Stripe(stripeKey, stripeConfig);

/**
 * ProcessPayment is a standalone function triggered by JobQueue SQS as defined in SQS template
 * when a scheduled function fetchUnprocessed fetches unprocesssed matches, users and push through SNS as bulk message, SQS subscribes to the SNS topic and triggers lambda
 * therfore the input events in this lambda function is a bulk records for each match
 * Possible bottlenecks: using only one function for all fee payment will be difficult to manage
 * Future enhancement: design functions segregating command query responsibilities (CQRS), fan-out lambda functions using SNS filters to manage own SQS for each type of payment
 * @returns void
*/

const processRecord = async (record: Record): Promise<void> => {
    // Fetch fee and commission from the fee_structure table
    const [feeStructure, feeStructureError] = await executeQuery(`
        SELECT fee, commission
        FROM fee_structure
        WHERE competitionId is {useCompetitionid from record}
    `) as [FeeStructure[], Error | null];

    if (feeStructureError !== null) {
        console.error(feeStructureError);
        return;
    }

    // Process payments using Stripe
    try {
        // Charge player
        // ...strip implementation to charge player
        // ...consider the case when a player might be playing more than one match
        // ...optimise the stripe payment processing by grouping records by players to make one request to strip

        // Pay club
        // ...strip implementation to pay club
        // ...consider the case when there might be repeating club
        // ...optimise the stripe payment processing by grouping records by club to make one request to strip

        // Pay organiser
        // ...strip implementation to pay organiser
        // ...consider the case when there might be repeating organiser
        // ...optimise the stripe payment processing by grouping records by organiser to make one request to strip

        // Insert payment information into the fee_component table
        await executeQuery(`
        INSERT INTO fee_component (id, match_id, match_player_id, billing_type, fee, payment_status, billing_subject, subject_id)
        VALUES (...) // Add appropriate values
        `);

    } catch (error) {
        console.error(`Payment processing failed for matchId: ${record.matchId}, playerId: ${record.playerId}, error: ${(error as Error).message}`);

        // Insert failed payment information into the fee_component table
        await executeQuery(`
            INSERT INTO fee_component (id, match_id, match_player_id, billing_type, fee, payment_status, billing_subject, subject_id)
            VALUES (...) // Add appropriate values with payment_status = FAILED
        `);
    }
};


export const processPayment = async (event: SQSEvent): Promise<void> => {
  const records: Record[] = event.Records.map((record) => JSON.parse(record.body));
  // Process all records
  await Promise.all(records.map((record) => processRecord(record)));
};
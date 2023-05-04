import mysql from 'mysql2';
import { ExecuteQueryType } from '../types/Query-result-interface';

const connectionUri: string = process.env.MYSQL_DSN || '';
const connection = mysql.createConnection(connectionUri);

export const executeQuery = (query: string): ExecuteQueryType => new Promise((resolve) => {
    connection.execute(query, (err, results) => {
        if (!err) {
            return resolve([results, null]);
        }
        // or call any logging platform
        console.error(err);
        return resolve([null, err])
    })
})


export const closeConnection = () => connection.end();

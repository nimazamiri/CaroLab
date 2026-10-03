'use strict';
/**
 * insertPV.js
 * Inserts process-value records into MySQL.
 *
 * Database: dbhmi1
 * Table:    processvalues1 (tagID, pvID, pvValue, pvTime)
 *   - pvTime is TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 *     so it can be left out of the INSERT and MySQL will stamp it.
 *
 * npm install mysql2
 */

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',        // set your MySQL/phpMyAdmin root password here
  database: 'dbhmi1',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

/**
 * Insert a single tag's value as its own record.
 * @param {number} tagID
 * @param {number} pvID
 * @param {number} pvValue
 * @param {number|string|Date} [pvTime] - optional; omit to let MySQL use CURRENT_TIMESTAMP
 */
async function insertPV(tagID, pvID, pvValue, pvTime) {
  if (pvTime !== undefined && pvTime !== null) {
    await pool.execute(
      'INSERT INTO processvalues1 (tagID, pvID, pvValue, pvTime) VALUES (?, ?, ?, ?)',
      [tagID, pvID, pvValue, pvTime]
    );
  } else {
    await pool.execute(
      'INSERT INTO processvalues1 (tagID, pvID, pvValue) VALUES (?, ?, ?)',
      [tagID, pvID, pvValue]
    );
  }
}

/**
 * Insert every tag/value pair of one received packet, record by record.
 * @param {{ pvID: number, tags: Array<{tagID:number, value:number}>, timestamp?: number|string }} packet
 */
async function insertPacket(packet) {
  const { pvID, tags, timestamp } = packet;
  for (const t of tags) {
    await insertPV(t.tagID, pvID, t.value, timestamp);
  }
}

module.exports = { insertPV, insertPacket, pool };

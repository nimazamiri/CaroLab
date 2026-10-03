'use strict';
/**
 * rx3.js
 * Reads packets from the serial port and, for each packet:
 *   1. parses it into { pvID, tags: [{tagID, value}, ...], timestamp? }
 *   2. inserts every tag's value into MySQL (processvalues1), one record per tag
 *
 * The HMI screen (caro_hmi_DialGauge2.html) does NOT get pushed to directly —
 * it polls getPV.php, which reads the latest values back out of MySQL.
 * (A WebSocket push version can replace this polling later.)
 *
 * Packet format (comma-separated):
 *   pvID, tagID1, value1, tagID2, value2, tagID3, value3, tagID4, value4 [, timestamp]
 * Example:
 *   1, 1, 25, 2, 45, 3, 65, 4, 85
 *
 * npm install serialport
 */

const SerialPort = require('serialport');
const { insertPacket } = require('./insertPV');

// ---------------------------------------------------------
// Packet parsing
// ---------------------------------------------------------
/**
 * @param {string} line - raw comma-separated line, e.g. "1, 1, 25, 2, 45, 3, 65, 4, 85"
 * @returns {{pvID:number, tags:Array<{tagID:number,value:number}>, timestamp:(number|undefined)}}
 */
function parsePacket(line) {
  const parts = line.split(',').map((s) => Number(s.trim()));
  if (parts.length < 9 || parts.some(Number.isNaN)) {
    throw new Error('malformed packet: ' + line);
  }

  const pvID = parts[0];
  const tags = [];
  for (let i = 1; i + 1 < parts.length && tags.length < 4; i += 2) {
    tags.push({ tagID: parts[i], value: parts[i + 1] });
  }
  // an optional 10th field is the timestamp; if absent, MySQL's
  // DEFAULT CURRENT_TIMESTAMP on pvTime takes care of it
  const timestamp = parts.length >= 10 ? parts[9] : undefined;

  return { pvID, tags, timestamp };
}

// ---------------------------------------------------------
// Serial port (same COM port / baud rate as rx2.js)
// ---------------------------------------------------------
try {
  const port = new SerialPort('COM7', { baudRate: 9600 });

  port.on('open', () => console.log('COM7 opened successfully. isOpen:', port.isOpen));
  port.on('error', (err) => console.error('Serial port error:', err.message));
  port.on('close', () => console.log('COM7 closed'));

  let buffer = ''; // persists across all 'data' events

  port.on('data', (chunk) => {
    buffer += chunk.toString();

    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete trailing part for next time

    lines.forEach(async (rawLine) => {
      const line = rawLine.trim();
      if (!line) return;

      try {
        const packet = parsePacket(line);
        console.log('packet:', packet);

        // insert each tag's value as its own record
        await insertPacket(packet);
      } catch (err) {
        console.error('Parse/insert error on line:', line, err.message);
      }
    });
  });
} catch (initErr) {
  console.error('Failed to initialize serial port:', initErr.message);
}

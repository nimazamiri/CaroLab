<?php
/**
 * getPV.php
 * Returns the latest pvValue for tags 1..4 from processvalues1, as JSON:
 *   {"1":{"pvValue":45,"pvTime":"2026-09-25 05:12:03"}, "2":{...}, ...}
 *
 * Polled from caro_hmi_DialGauge2.html every ~1s to drive the dial gauges.
 *
 * Note: processvalues1 has no primary key / auto-increment column, so
 * "latest" is determined by MAX(pvTime) per tagID. If two packets land in
 * the same second, ties are broken arbitrarily by MySQL. Adding an
 * auto-increment id column to the table would make this exact.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$host = 'localhost';
$user = 'root';
$pass = '';          // set your MySQL/phpMyAdmin root password here
$db   = 'dbhmi1';

$mysqli = @new mysqli($host, $user, $pass, $db);

if ($mysqli->connect_errno) {
    http_response_code(500);
    echo json_encode(['error' => 'DB connection failed: ' . $mysqli->connect_error]);
    exit;
}

// One latest row per tagID, via a correlated MAX(pvTime) join.
$sql = "
    SELECT p.tagID, p.pvValue, p.pvTime
    FROM processvalues1 p
    INNER JOIN (
        SELECT tagID, MAX(pvTime) AS maxTime
        FROM processvalues1
        GROUP BY tagID
    ) latest ON p.tagID = latest.tagID AND p.pvTime = latest.maxTime
";

$result = $mysqli->query($sql);

$out = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $out[$row['tagID']] = [
            'pvValue' => (float) $row['pvValue'],
            'pvTime'  => $row['pvTime'],
        ];
    }
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Query failed: ' . $mysqli->error]);
    $mysqli->close();
    exit;
}

echo json_encode($out);
$mysqli->close();

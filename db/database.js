const sqlite3 = require("sqlite3").verbose();
const DBSOURCE = "db.sqlite";

const db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    // Cannot open database
    console.error(err.message);
    throw err;
  } else {
    console.log("Connected to the SQLite database.");
    const sql = `CREATE TABLE smartplugs(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timeOfReading,
      deviceName,
      ipAddress,
      power,
      kWhToday,
      costkWh,
      totalCostToday
    )`;

    db.run(sql, (err) => {
      if (err) {
        // Table already created
        console.log("Table already created");
        console.error(err);
      }
    });
  }
});

module.exports = db;

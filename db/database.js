let sqlite3 = require("sqlite3").verbose();
let sql;

const DBSOURCE = "db.sqlite";

let db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    // Cannot open database
    console.error(err.message);
    throw err;
  } else {
    console.log("Connected to the SQLite database.");
    sql = `CREATE TABLE smartplugs(id INTEGER PRIMARY KEY AUTOINCREMENT,TimeOfReading,DeviceName,IPAddress,Power,kWhToday,costkWh,totalCostToday)`;
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

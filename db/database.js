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
    sql = `CREATE TABLE smartplugs(id INTEGER PRIMARY KEY AUTOINCREMENT,DeviceName,IPAddress,Power,kWhToday,costkWh,totalCostToday)`;
    db.run(sql, (err) => {
      if (err) {
        // Table already created
        console.log("Table already created");
        console.error(err);
      } else {
        // Table just created, creating some rows
        console.log("Table just created. Create some rows");
        let insert =
          "INSERT INTO smartplugs (DeviceName, IPAddress, Power, kWhToday, costkWh, totalCostToday) VALUES (?,?,?,?,?,?)";
        db.run(insert, [
          "smartplug1",
          "IPAddress-1",
          "Power-1",
          "kWhToday-1",
          "costkWh-1",
          "totalCostToday-1",
        ]);
        db.run(insert, [
          "smartplug2",
          "IPAddress-2",
          "Power-2",
          "kWhToday-2",
          "costkWh-2",
          "totalCostToday-2",
        ]);
        db.run(insert, [
          "smartplug3",
          "IPAddress-3",
          "Power-3",
          "kWhToday-3",
          "costkWh-3",
          "totalCostToday-3",
        ]);
      }
    });
  }
});

module.exports = db;

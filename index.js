const express = require("express");
const cors = require("cors");
const app = express();
const db = require("./db/database");

const settings = require("./settings.json");

app.use(cors());
app.use(express.json());
app.use("/", express.static("public"));

app.post("/api/toggle", async (req, res) => {
  const device = req?.body?.device;

  if (process.env.NODE_ENV === "production") {
    const response = await fetch(`http://${device}/cm?cmnd=Power%20TOGGLE`);
    const json = await response.json();
    return res.json(json);
  }

  const deviceData = require(`./${device}.json`);
  if (deviceData.StatusSTS.POWER == "ON") res.json({ POWER: "OFF" });
  else res.json({ POWER: "ON" });
});

/**
 * Create an endpoint to which the user can receive all data on smartplugs from the database
 * */
app.get("/api/smartplugs", async (req, res) => {
  try {
    const rows = await getDbEntries();
    res.json({
      message: "success",
      data: rows,
    });
  } catch (err) {
    reject(res.status(502).json({ error: err.message }));
  }
});

/**
 * Create an endpoint to which the user can receive data from the database with a given id
 * */
app.get("/api/smartplugs/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const row = await getDbEntryWithId(id);
    res.json({
      message: "success",
      data: row,
    });
  } catch (err) {
    reject(res.status(502).json({ error: err.message }));
  }
});

app.get("/api/smartplugs/:IPAddress", async (req, res) => {
  try {
    const IPAddress = req.params.IPAddress;

    const rows = await getDbEntriesWithIPAddress(IPAddress);
    console.log("rows: ", rows);
    res.json({
      message: "success",
      data: rows,
    });
  } catch {
    reject(res.status(404).json({ error: err.message }));
  }
});

app.get("/api/status/power", async (req, res) => {
  /**
   * Call a function which gets smartplug device data to the user and store the data inside of a constant variable
   */
  const statuses = await getDevicesData();

  /**
   * Create an empty response object and add the specific data which is to be send to the client
   */
  const responseObject = {};

  responseObject.data = statuses.map((data) => {
    const currentPowerStatus = data.StatusSNS?.ENERGY;
    currentPowerStatus.DeviceName = data.Status?.DeviceName;
    currentPowerStatus.CostToday =
      (currentPowerStatus.Today * settings.kWhPrice) / 100;
    currentPowerStatus.Power = data.StatusSTS.POWER;
    currentPowerStatus.IPAddress = data.StatusNET.IPAddress;
    return currentPowerStatus;
  });

  /**
   * Eventually, we also want to add a TotalCostToday variable.
   * Preset the value to 0 and add the value of CostToday for each smartplug to this present value so we end up with a sum.
   * Once this is done, add TotalCostToday to responseObject.meta
   */
  let TotalCostToday = 0;
  responseObject.data.forEach((data) => (TotalCostToday += data.CostToday));

  responseObject.meta = {
    TotalCostToday,
  };

  /**
   * Finally, for each data object inside of responseObject.data, call a function which write data objects to the database
   */
  responseObject.data.forEach((data) => writeToDatabase(data));

  res.json(responseObject);
});

app.listen(9999, () => {
  if (process.env?.NODE_ENV !== "production") {
    console.log(`Listening on http://localhost:${process.env.PORT}`);
  }
});

/**
 * Implement an asynchronous function which goal is to return smartplug data to the user.
 * The user should have specified IP-Addresses of smartplug devices within the network in root file settings.json.
 *
 * If the node enviroment variaible is set to production, the function fetches data for each of these smartplugs via fetch api.
 * Each of these fetch api calls return a promise.
 * Once all promises are settled, whether they get resolved of rejected, the smartplug data is then returned to the user.
 *
 * In development mode, we send back the data specified in three sample files:
 * 192.168.2.113.json
 * 192.168.2.116.json
 * 192.168.2.117.json
 *
 * The data found inside of these sample files are then returned to the user.
 */
async function getDevicesData() {
  if (process.env.NODE_ENV === "production") {
    const promises = settings.devices.map((device) =>
      fetch(`http://${device}/cm?cmnd=STATUS%200`).then((res) => res.json())
    );

    const results = await Promise.allSettled(promises);

    return results.map((result) => result.value);
  }

  if (process.env.NODE_ENV === "development") {
    return settings.devices.map((device) => require(`./${device}.json`));
  }
}

/**
 * Implement a function which writes (adds) data objects to the database
 */
function writeToDatabase(object) {
  const error = [];

  /**
   *  In case a data object is not given, push an error message to the user
   */
  if (!object) {
    error.push("No object specified");
  }

  /**
   * The goal is to create a new record (row) in the database table.
   * We can do this by running the SQL INSERT INTO statement.
   *
   * Since the column names are pre-defined in database.js, we solely need to specify the values for each column.
   * By inserting the value of NULL for id as it means autoincrement.
   */
  const sql = `INSERT INTO smartplugs (
    timeOfReading,
    deviceName,
    ipAddress,
    power,
    kWhToday,
    costkWh,
    totalCostToday
  )
  VALUES (?, ?, ?, ?, ?, ?, ?)`;

  const params = [
    new Date().toISOString(),
    object.DeviceName,
    object.IPAddress,
    object.Power,
    object.Today,
    object.CostToday,
    object.Today * object.CostToday,
  ];

  /**
   * Run the SQL statement
   */
  db.run(sql, params, function (err) {
    if (err) {
      console.error(err);
    }
  });
}

/**
 * Implement a afunction which returns a promise.
 * If the promise is resolved, return all smartplug entries from the database
 * If the promise is rejected, return error to the user.
 * */
function getDbEntries() {
  const sql = `SELECT * FROM smartplugs`;
  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
      }
      resolve(rows);
    });
  });
}

/**
 * Implement a function which returns a promise.
 * If the promise is resolved, the function should return the data object from the dataabase which has the given id.
 * If the promise is rejected, return an error to the user.
 * */
function getDbEntryWithId(id) {
  const sql = `SELECT * FROM smartplugs WHERE id = ?`;
  return new Promise((resolve, reject) => {
    db.get(sql, [id], (err, row) => {
      if (err) {
        reject(err);
      }
      resolve(row);
    });
  });
}

/**
 * Implement a function which returns a promise.
 * If the promise is resolved, the function should return all data objects from the database which have the given IP-Address.
 * If the promise is rejected, return an error to the user.
 *
 * TASK:
 * Read up on why the ? is necessary when you want to use SQL with user input for example.
 * Look into what the benefits are.
 * */
function getDbEntriesWithIPAddress(ipAddress) {
  const sql = `SELECT * FROM smartplugs WHERE ipAddress = ?`;
  return new Promise((resolve, reject) => {
    db.all(sql, [ipAddress], (err, rows) => {
      if (err) {
        reject(err);
      }
      resolve(rows);
    });
  });
}

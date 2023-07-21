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
  const statuses = await getDevicesData();

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
  let TotalCostToday = 0;
  responseObject.data.forEach((data) => (TotalCostToday += data.CostToday));

  responseObject.meta = {
    TotalCostToday,
  };

  // finally, write data objects inside of responseObject.data to the database
  responseObject.data.forEach((data) => writeToDatabase(data));

  res.json(responseObject);
});

app.listen(9999, () => {
  if (process.env?.NODE_ENV !== "production") {
    console.log(`Listening on http://localhost:${process.env.PORT}`);
  }
});

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

function writeToDatabase(object) {
  const error = [];

  // in case a data object is not given, push an error message to the user
  if (!object) {
    error.push("No object specified");
  }

  // create a data which is to be send to the database. Start by specifying the title of each row, then specify the value (param) for each row respectfully
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

  // add new data to the database
  db.run(sql, params, function (err) {
    if (err) {
      console.error(err);
    }
  });
}

function getDbEntries() {
  const sql = "select * from smartplugs";
  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
      }
      resolve(rows);
    });
  });
}

// Read up on why the ? is necessary when you want to use SQL with user input for example
// What the benefits are
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

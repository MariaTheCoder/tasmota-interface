const express = require("express");
const cors = require("cors");
const app = express();

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

app.get("/api/status/power", async (req, res) => {
  const statuses = await getDevicesData();

  const responseObject = {};

  responseObject.data = statuses.map((data) => {
    const currentPowerStatus = data.StatusSNS?.ENERGY;
    currentPowerStatus.deviceName = data.Status?.DeviceName;
    currentPowerStatus.costToday =
      (currentPowerStatus.Today * settings.kWhPrice) / 100;
    currentPowerStatus.power = data.StatusSTS.POWER;
    currentPowerStatus.IPAddress = data.StatusNET.IPAddress;
    return currentPowerStatus;
  });
  let totalCostToday = 0;
  responseObject.data.forEach((data) => (totalCostToday += data.costToday));

  responseObject.meta = {
    totalCostToday,
  };

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

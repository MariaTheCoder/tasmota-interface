(async () => {
  const response = await fetch("/api/status/power");

  if (!response.ok) return alert("Could not connect to backend");

  const data = await response.json();

  const devices = data.data;
  const meta = data.meta;

  displayTitle(meta.totalCostToday, document.body);

  for (const deviceData of devices) {
    displayDeviceInfo(deviceData, document.body);
  }
})();

function displayTitle(totalCostToday, parent) {
  const title = document.createElement("h1");

  title.innerText = `Today's total cost: ${totalCostToday} €`;

  parent.appendChild(title);
}

function displayDeviceInfo(deviceData, parent) {
  const div = document.createElement("div");
  div.classList.add("device");

  const title = document.createElement("h2");
  const costToday = document.createElement("p");
  const toggleButton = document.createElement("button");

  toggleButton.innerText = `Current status: ${deviceData.power}`;

  toggleButton.addEventListener("click", async (event) => {
    const response = await fetch("/api/toggle", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        device: deviceData.IPAddress,
      }),
    });

    const json = await response.json();

    event.target.innerText = `Current status: ${json.POWER}`;
  });

  title.innerText = deviceData.deviceName;

  costToday.innerText = deviceData.costToday + " €";

  div.appendChild(title);
  div.appendChild(costToday);
  div.appendChild(toggleButton);

  parent.appendChild(div);
}

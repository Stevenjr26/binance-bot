const fs = require("fs/promises");
const fetchPlacedOrdersJson = async () => (await fs.readFile("placed-orders.json"))
  .toString("utf-8")

  fetchPlacedOrdersJson().then(s=>JSON.parse(s)).then(console.log)
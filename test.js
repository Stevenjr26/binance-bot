const fs = require("fs/promises");
const fetchPlacedOrdersJson = async () => {
    const str=(await fs.readFile("placed-orders.json")).toString("utf-8")
    console.log(str,typeof str,str.toString())
}

  fetchPlacedOrdersJson().then(console.log)
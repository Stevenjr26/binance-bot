const { config } = require("dotenv");
config();
require('log-timestamp')
const fs = require("fs/promises");
const oraPromise = import("ora").then(({ default: o }) => o);
const chalkModule = require("./chalkModule.js");
const input = require("input");
const TelegramAPI = require("./telegramAPI.js");
const binanceAPI = require("./binanceAPI.js");
const events = require("events");
const parseMessage = require("./parseMessage.js");

const orderStatusEmitter = new events.EventEmitter();
const telegramAPI = new TelegramAPI();

console.log(`pid`, process.pid, "\n");

const botConfig = { status: "RUNNING" };

orderStatusEmitter.on("NEW_ORDER", async (order) => {
  try {
    console.log("\n⚡️⚡️⚡️ORDER PLACED⚡️⚡️⚡️\n", order, "\n");
    if (order.status == "FILLED") {
      console.log("Order filled")
      await updatePlacedOrdersJson(order)
      orderStatusEmitter.emit("ORDER_FILLED", order);
      return;
    }
    let id;
    id = setInterval(async () => {
      try {
        const fetchedOrder = await binanceAPI.fetchOrder(order);
        console.log("Order status: ", fetchedOrder.status);
        if (fetchedOrder.status == "FILLED" && fetchedOrder.executedQty!=0 && fetchedOrder.executedQty!='0') {
          await updatePlacedOrdersJson(order)
          orderStatusEmitter.emit("ORDER_FILLED", order);
          clearInterval(id);
          return;
        }
        if (fetchedOrder.status == "CANCELED") {
          console.log("Order cancelled:", order);
          await removePlacedOrdersJson(fetchedOrder)
          clearInterval(id);
          botConfig.status = "RUNNING";
          return;
        }
      } catch (e) {
        console.log(e)
      }
    }
      , 30 * 1000);
  } catch (e) {
    console.log(e)
  }
});

orderStatusEmitter.on("ORDER_FILLED", (order) => {
  console.log("\n🍿🍿🍿ORDER FILLED🍿🍿🍿\n", order, "\n");
  
  let quantity = +order.executedQty;
  console.log("Sell quantity before deducting commission",quantity," Fills : "+(order.fills?.reduce((t,f)=>t+(+f.commission ?? 0),0) ?? 0))
  quantity = +order.executedQty - (order.fills?.reduce((t,f)=>t+(+f.commission ?? 0),0) ?? 0)
  console.log("Sell quantity after deducting commission",quantity)
  telegramAPI.sendMessage("-1002019185457", "Attempting sell order " + order.symbol+ " | Quantity: "+quantity)
  binanceAPI
    .createSellOrder(order.symbol, quantity, order.takeProfitTarget)
    .then(async (tp) => {
      console.log(`🎉 Take profit order created:`, tp);
      await removePlacedOrdersJson(order)
      botConfig.status = "RUNNING";
      telegramAPI.sendMessage("-1002019185457", "😀 Profit taken at" + order.takeProfitTarget)
      //process.exit();
    })
    .catch((e) => {
      console.log(e);
      console.log(
        "***ATTENTION REQUIRED***\nCancel existing buy order or create take profit order"
      );
      botConfig.status = "RUNNING";
    });
});

async function consent() {
  const chalk = await chalkModule;
  return input.confirm(`are you ready to ${chalk.red("LOSE MONEY?")} 🚀`);
}

const fetchPlacedOrdersJson = async () => (await fs.readFile("placed-orders.json")).toString("utf-8")

const writePlacedOrdersJson = (json) => (fs.writeFile("placed-orders.json", JSON.stringify(json)))

const updatePlacedOrdersJson = async (order) => {
  const str = await fetchPlacedOrdersJson()
  console.log(str,typeof str,str.toString(),order)
  const orders = JSON.parse(str);
  orders[order.orderId] = order;
  await writePlacedOrdersJson(orders);
}

const removePlacedOrdersJson = async ({ orderId }) => {
  const json = JSON.parse(await fetchPlacedOrdersJson())
  delete json[orderId]
  await writePlacedOrdersJson(json)
}


async function runBot() {
  const chalk = await chalkModule;
  const ora = await oraPromise;
  // if (!(await consent())) {
  //   console.log(chalk.green("i'm proud of you :)"));
  //   return;
  // }
  // console.log(chalk.blueBright("well, I tried 🤷\n"));
  const processedMessages = (await fs.readFile("processed-messages.txt"))
    .toString("utf-8")
    .split("\n")
    .filter((s) => !!s?.trim());


  const binanceSpinner = ora(chalk.yellow("connecting to binance...")).start();
  await binanceAPI.loadMarkets();
  binanceSpinner.succeed(chalk.green("connected to binance..."));

  const telegramSpinner = ora(chalk.blue("connecting to telegram...")).start();
  await telegramAPI.connect(telegramSpinner);

  telegramSpinner.succeed(chalk.green("connected to telegram..."));
  ora(chalk.green("starting bot...")).succeed();
  const callsSpinner = ora(
    chalk.gray("listening to calls on telegram")
  ).start();
  telegramAPI.sendMessage("-1002019185457", "BOT STARTED")
  setInterval(() => {
    if (botConfig.status == "STOPPED") {
      return;
    }
    telegramAPI.getLatestMessage(process.env.TELEGRAM_CHANNEL_ID).then(async (m) => {
      if (m.length == 0 || processedMessages.indexOf(m[0].id + "") != -1)
        return;
      let message = m[0].message.replaceAll("\n", "");
      if (message.indexOf("Entry Targets:") == -1) return;

      try {
        const { ticker, entryTarget, firstTakeProfitTarget, signalType } =
          parseMessage(message);
        if (signalType != "Long") {
          telegramAPI.sendMessage("-1002019185457", "Short call: " + ticker)
          return;
        }

        callsSpinner.succeed();
        telegramAPI.sendMessage("-1002019185457", `Attempting new order for ${ticker} at ${entryTarget}`)
        const order = await binanceAPI.createBuyOrder(ticker, entryTarget);
        await fs.appendFile("processed-messages.txt", m[0].id + "\n");
        botConfig.status = "STOPPED";
        await updatePlacedOrdersJson({
          ...order,
          takeProfitTarget: firstTakeProfitTarget,
        })
        orderStatusEmitter.emit("NEW_ORDER", {
          ...order,
          takeProfitTarget: firstTakeProfitTarget,
        });
      } catch (e) {
        // if ("PARSE_ERROR" != e.message) {
        //   console.log(e);
        // }
        console.log(e)
        telegramAPI.sendMessage("-1002019185457", "Error:"+e.message)
      }
    }).catch(console.log);
  }, 60 * 1000);
  // .then(process.exit);
}

runBot().catch((e) => {
  console.log(e);
  process.exit(1);
});



const executePlacedOrders = async () => {
  const placedOrders = JSON.parse(await fetchPlacedOrdersJson());
  //console.log("placedOrders",placedOrders)
  for (let o in placedOrders) {
    const order = placedOrders[o]
    try {
      if (order.status == "FILLED") {
        orderStatusEmitter.emit("ORDER_FILLED", order);
        continue;
      }
      if(Date.now()-(+order.transactTime)>24*60*60*1000){
        await removePlacedOrdersJson(order)
        console.log("Order in FILLED status for more than 24 hours :", order);
        continue;
      }
      // const {orderId,ticker,amount,price,status,placedAt}=order
      let intervalId = setInterval(async () => {
        const fetchedOrder = await binanceAPI.fetchOrder(order);
        if (fetchedOrder.status == "FILLED") {
          await updatePlacedOrdersJson(fetchedOrder)
          orderStatusEmitter.emit("ORDER_FILLED", order);
          clearInterval(intervalId);
          return;
        }
        if (fetchedOrder.status == "CANCELED") {
          await removePlacedOrdersJson(fetchedOrder)
          console.log("Order cancelled:", order);
          clearInterval(intervalId);
          //   botConfig.status = "RUNNING";
          return;
        }

      }, 60 * 1000);
    } catch (e) {
      console.log(e)
    }
  }
}

executePlacedOrders().then(console.log).catch(console.log)

// setInterval(async ()=>{
//   for(let o of placedOrders){
//     const [ticker,amount,price,status]=o.split(",")
//     let intervalId = setInterval(async () => {
//       const fetchedOrder = await binanceAPI.fetchOrder(order);
//       console.log("Order status: ", fetchedOrder.status);
//       if (fetchedOrder.status == "FILLED") {
//         await writePlacedOrdersJson(fetchedOrder)
//         orderStatusEmitter.emit("ORDER_FILLED", order);
//         clearInterval(intervalId);
//         return;
//       }
//       if (fetchedOrder.status == "CANCELED") {
//         console.log("Order cancelled:", order);
//         await writePlacedOrdersJson(fetchedOrder)
//         clearInterval(intervalId);
//         botConfig.status = "RUNNING";
//         return;
//       }
//     }, 20 * 1000);
//   }
// },30*1000)

//process.on("SIGINT", () => process.exit(1));

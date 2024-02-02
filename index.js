const { config } = require("dotenv");
config();
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

orderStatusEmitter.on("NEW_ORDER", (order) => {
  console.log("\n⚡️⚡️⚡️ORDER PLACED⚡️⚡️⚡️\n", order, "\n");
  if (order.status == "FILLED") {
    orderStatusEmitter.emit("ORDER_FILLED", order);
    return;
  }
  let id;
  id = setInterval(async () => {
    const fetchedOrder = await binanceAPI.fetchOrder(order);
    console.log("Order status: ", fetchedOrder.status);
    if (fetchedOrder.status == "FILLED") {
      orderStatusEmitter.emit("ORDER_FILLED", order);
      clearInterval(id);
      return;
    }
    if (fetchedOrder.status == "CANCELED") {
      console.log("Order cancelled:", order);
      clearInterval(id);
      botConfig.status = "RUNNING";
      return;
    }
  }, 20 * 1000);
});

orderStatusEmitter.on("ORDER_FILLED", (order) => {
  console.log("\n🍿🍿🍿ORDER FILLED🍿🍿🍿\n", order, "\n");
  binanceAPI
    .createSellOrder(order.symbol, order.executedQty, order.takeProfitTarget)
    .then((tp) => {
      console.log(`🎉 Take profit order created:`, tp);
      process.exit();
    })
    .catch((e) => {
      console.log(e);
      console.log(
        "***ATTENTION REQUIRED***\nCancel existing buy order or create take profit order"
      );
    });
});

async function consent() {
  const chalk = await chalkModule;
  return input.confirm(`are you ready to ${chalk.red("LOSE MONEY?")} 🚀`);
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
  console.log("");
  const callsSpinner = ora(
    chalk.gray("listening to calls on telegram")
  ).start();
  telegramAPI.sendMessage("-1002019185457","Short call: "+ ticker)
  setInterval(() => {
    if (botConfig.status == "STOPPED") {
      return;
    }
    telegramAPI.getLatestMessage("-1001756092613").then(async (m) => {
      if (m.length == 0 || processedMessages.indexOf(m[0].id + "") != -1)
        return;
      let message = m[0].message.replaceAll("\n", "");
      if (message.indexOf("Entry Targets:") == -1) return;

      try {
        const { ticker, entryTarget, firstTakeProfitTarget, signalType } =
          parseMessage(message);
        if (signalType != "Long"){ 
          telegramAPI.sendMessage("-1002019185457","Short call: "+ ticker)
          return;
        }

        callsSpinner.succeed();
        console.log("");
        const order = await binanceAPI.createBuyOrder(ticker, entryTarget);
        botConfig.status = "STOPPED";
        await fs.appendFile("processed-messages.txt", m[0].id + "\n");
        orderStatusEmitter.emit("NEW_ORDER", {
          ...order,
          takeProfitTarget: firstTakeProfitTarget,
        });
      } catch (e) {
        if ("PARSE_ERROR" != e.message) {
          console.log(e);
        }
        telegramAPI.sendMessage("-1002019185457","Error",e.message)
      }
    });
  }, 20 * 1000);
  // .then(process.exit);
}

runBot().catch((e) => {
  console.log(e);
  process.exit(1);
});

process.on("SIGINT", () => process.exit(1));

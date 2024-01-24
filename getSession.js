const { config } = require("dotenv");
config();
const TelegramAPI = require("./telegramAPI.js");

async function getSession() {
  const telegramAPI = new TelegramAPI();
  await telegramAPI.connect();
  console.log(await telegramAPI.getSession());
}

getSession().then(process.exit);

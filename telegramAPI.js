const { TelegramClient, Logger } = require("telegram");

const input = require("input");
const { StoreSession, StringSession } = require("telegram/sessions");
const { LogLevel } = require("telegram/extensions/Logger");

const telegramAppCreds = {
  apiId: process.env.TELEGRAM_API_ID,
  apiHash: process.env.TELEGRAM_API_HASH,
};

const createClient = (customer) =>
  new TelegramClient(
    new StringSession(process.env.TELEGRAM_SESSION_STRING),
    +telegramAppCreds.apiId,
    telegramAppCreds.apiHash,
    {
      connectionRetries: 5,
      baseLogger: new Logger(LogLevel.ERROR),
    }
  );

class TelegramAPI {
  constructor(customer) {
    this.customer = customer;
    this.client = createClient(customer);
  }

  async connect(spinner) {
    if (!(await this.isUserAuthorized())) {
      spinner?.stop();
      await this.client.start({
        phoneNumber: async () => await input.text("Please enter your number: "),
        password: async () => await input.text("Please enter your password: "),
        phoneCode: async () =>
          await input.text("Please enter the code you received: "),
        onError: (err) => console.log(err),
      });
    }

    return this.client.connect();
  }

  disconnect() {
    return this.client.disconnect();
  }

  isUserAuthorized() {
    return this.client.connect().then(() => this.client.isUserAuthorized());
  }

  async getSession() {
    return this.client.session.save();
  }
  async getLatestMessage(channelId) {
    return this.client.getMessages(channelId, {
      limit: 1,
    });
  }
}

module.exports = TelegramAPI;

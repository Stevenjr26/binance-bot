const { TelegramClient, Logger, Api } = require("telegram");

const input = require("input");
const { StoreSession, StringSession } = require("telegram/sessions");
const { LogLevel } = require("telegram/extensions/Logger");
const fs = require("fs/promises");
const parseMessage = require("./parseMessage.js");

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

  async getProcessedMessages(){
    return (await fs.readFile("processed-messages.txt"))
    .toString("utf-8")
    .split("\n")
    .filter((s) => !!s?.trim());
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
    const messages = await this.client.getMessages(channelId, {
      limit: 20,
    });

    const processed  = (await this.getProcessedMessages()) ?? []
    return messages.filter(m=>{
      try{
      const { ticker,  signalType } =
          parseMessage(m);
          if(processed.indexOf(m.id+"")!=-1) return false;
          if(ticker.indexOf('1000')!=-1) return false;
          if(signalType!="Long") return false;
          return true;
      }catch(e){
        console.log(e)
        return false;
      }
    })
  }

  async sendMessage(channelId, message) {
    

    const result = await this.client.invoke(
      new Api.messages.SendMessage({
        peer: channelId,
        message,
      })
    );
    return result
  }
}

module.exports = TelegramAPI;

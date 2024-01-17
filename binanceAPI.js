const { binance } = require("ccxt");
const BUDGET = require("./budget.js");

console.log(process.env.BINANCE_SECRET_KEY)

const exchange = new binance({
  apiKey: process.env.BINANCE_API_KEY,
  secret: process.env.BINANCE_SECRET_KEY,
   'proxies': {
        'http': 'e0pvhwhit9qxut:dx2zx8amr294lnkvfmwgxpl8l9rmyu@eu-west-static-06.quotaguard.com:9293',
        'https': 'e0pvhwhit9qxut:dx2zx8amr294lnkvfmwgxpl8l9rmyu@eu-west-static-06.quotaguard.com:9293',
    }
});

const loadMarkets = async () => {
  await exchange.loadMarkets();
};

const fetchOrder = async ({ symbol, orderId }) => {
  return exchange.sapiGetMarginOrder({
    symbol,
    orderId,
  });
};

const createBuyOrder = async (ticker, price) => {
  const symbol = ticker.replace("/", "");
  return exchange.sapiPostMarginOrder({
    symbol,
    side: "BUY",
    type: "LIMIT",
    quantity: exchange.amountToPrecision(
      symbol,
      +parseFloat(BUDGET / price).toFixed(5)
    ),
    price: exchange.priceToPrecision(symbol, price),
    //   stopPrice: exchange.priceToPrecision(symbol, price * 0.96),
    timeInForce: "GTC",
    recvWindow: 30000,
  });
};

const createMaginSellOrder = async (ticker, price) => {
  const symbol = ticker.replace("/", "");
  return exchange.sapiPostMarginOrder({
    symbol,
    side: "SELL",
    type: "LIMIT",
    quantity: exchange.amountToPrecision(
      symbol,
      +parseFloat(BUDGET / price).toFixed(5)
    ),
    price: exchange.priceToPrecision(symbol, price),
    //   stopPrice: exchange.priceToPrecision(symbol, price * 0.96),
    timeInForce: "GTC",
    recvWindow: 30000,
  });
};

const createSellOrder = async (ticker, quantity, price) => {
  await exchange.loadMarkets();
  const symbol = ticker.replace("/", "");
  return exchange.sapiPostMarginOrder({
    symbol,
    side: "SELL",
    type: "LIMIT",
    quantity: exchange.amountToPrecision(symbol, quantity),
    price: exchange.priceToPrecision(symbol, price),
    //   stopPrice: exchange.priceToPrecision(symbol, price * 0.96),
    timeInForce: "GTC",
    recvWindow: 30000,
  });
};

const createTakeProfitOrder = async (ticker, quantity, price, side="SELL") => {
  await exchange.loadMarkets();
  const symbol = ticker.replace("/", "");
  return exchange.sapiPostMarginOrder({
    symbol,
    side: side,
    type: "LIMIT",
    quantity: exchange.amountToPrecision(symbol, quantity),
    price: exchange.priceToPrecision(symbol, price),
    //   stopPrice: exchange.priceToPrecision(symbol, price * 0.96),
    timeInForce: "GTC",
    recvWindow: 30000,
  });
};

const binanceAPI = {
  loadMarkets,
  createBuyOrder,
  createSellOrder,
  fetchOrder,
};

module.exports = binanceAPI;

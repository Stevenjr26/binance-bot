const { binance } = require("ccxt");
const BUDGET = require("./budget.js");

const exchange = new binance({
  apiKey: process.env.BINANCE_API_KEY,
  secret: process.env.BINANCE_SECRET_KEY,
   'proxies': {
        'http': 'k5fbhsg3hthipf:7fpwk5psdq9dkibg115e15v8im@us-east-static-01.quotaguard.com:9293',
        'https': 'k5fbhsg3hthipf:7fpwk5psdq9dkibg115e15v8im@us-east-static-01.quotaguard.com:9293',
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

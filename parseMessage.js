module.exports = function parseMessage(message) {
  // Regular expressions to match the required patterns
  const tickerPattern = /#(\w+\/\w+)/;
  const entryTargetPattern = /Entry Targets:\s*([\d.]+)/;
  const takeProfitPattern = /3\)([\d.]+)/ // /Take-Profit Targets:\s*1\)([\d.]+)/;
  const signalTypePattern = /Signal Type:\s*Regular\s*\((Short|Long)\)/;

  // Extracting the ticker
  const tickerMatch = message.match(tickerPattern);
  const ticker = tickerMatch ? tickerMatch[1].replace("/", "") : null;

  // Extracting the entry target
  const entryTargetMatch = message.match(entryTargetPattern);
  const entryTarget = entryTargetMatch ? entryTargetMatch[1] : null;

  // Extracting the first take profit target
  const takeProfitMatch = message.match(takeProfitPattern);
  const firstTakeProfitTarget = takeProfitMatch ? takeProfitMatch[1] : null;
  

  // Extracting the signal type (Short/Long)
  const signalTypeMatch = message.match(signalTypePattern);
  const signalType = signalTypeMatch ? signalTypeMatch[1] : null;

  if (
    ticker == null ||
    entryTarget == null ||
    firstTakeProfitTarget == null ||
    signalType == null
  ) {
    throw new Error("PARSE_ERROR");
  }

  return { ticker, entryTarget, firstTakeProfitTarget, signalType };
};

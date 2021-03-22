var chains = {
  'RICK': {
    isV2: false,
    params: '-ac_supply=90000000000 -ac_reward=100000000 -ac_cc=3 -ac_staked=10 -addnode=138.201.136.145 -addnode=95.217.44.58',
  },
  'WSB': {
    isV2: false,
    params: '-ac_supply=90000000000 -ac_cc=3 -ac_reward=100000000 -addnode=94.130.38.173 -addnode=178.63.47.105',
  },
  'TOKENSV2': {
    isV2: true,
    params: '-ac_supply=10000000 -ac_reward=1000000000 -ac_decay=77700000 -ac_halving=43800 -ac_cc=1 -ac_ccenable=227,224,245,243,228,242,123,247 -addnode=159.69.53.25',
  },
};

module.exports = chains;
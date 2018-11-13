const child_process = require('child_process');
const keygen = require('./keygen.js');

// Variables
let keypair = undefined 
let bin_folder = '~/Documents/komodo/src/'
let chain_name = 'NAE'
let coin_name = 'NAE'
let chain_launch_params = '-ac_supply=100000 -addnode=95.216.196.64 -ac_cc=1337 -gen'
// Variables

let komodod_path = bin_folder + 'komodod -ac_name=' + chain_name + ' ';
let cli_path = bin_folder + 'komodo-cli -ac_name=' + chain_name + ' ';






function startUp(pubkey) {
    return new Promise((resolve, reject) => {
        // If pubkey does not exist: First launch
        if(pubkey === '') {
            keypair = keygen.generateKeyPair()
            pubkey = keypair.pubkey

            console.log('Generated pair: ')
            console.log('privkey: ' + keypair.privkey)
            console.log('pubkey: ' + keypair.pubkey)
            
            launchDaemon(pubkey).then(() => {
                importPrivKey(keypair.privkey).then(address => {
                    keypair.address = address
                    resolve({ generated: true, privkey: keypair.privkey, pubkey, address })
                })
            })
        }
        // If pubkey exists
        else {
            keypair = { privkey: '', pubkey }
        
            console.log('Launching with existing pubkey:')
            console.log('pubkey: ' + pubkey)
            
            launchDaemon(pubkey).then(() => {
                getAddressFromPubkey(pubkey).then(address => {
                    keypair.address = address
                    resolve({ generated: false, privkey: keypair.privkey, pubkey, address })
                })
            })
        }
    })
}


function launchDaemon(pubkey) {
    return new Promise((resolve, reject) => {
        let command = komodod_path + chain_launch_params + ' -pubkey=' + pubkey
        
        console.log('Launching the daemon... \n' + command)
        let cli = child_process.exec(command)

        cli.stdout.on('data', data => {
            console.log('stdout: ' + data)
        });


        cli.stderr.on('data', data => {
            console.log('stderr: ' + data)
        });

        // Wait until daemon is ready
        setTimeout(() => { resolve() }, 3000);
    })
}

// CLI
function stopDaemon() {
    return new Promise((resolve, reject) => {
        console.log('Stopping the daemon...')
        child_process.exec(cli_path + 'stop');

        setTimeout(() => { resolve() }, 20000);
    })
}

function getBalance() {
    return new Promise((resolve, reject) => {
        const cli = child_process.exec(cli_path + 'getwalletinfo');

        cli.stdout.on('data', data => {
            resolve(JSON.parse(data).balance)
        });
    })
}

function getNewAddress() {
    return new Promise((resolve, reject) => {
        const cli = child_process.exec(cli_path + 'getnewaddress');

        cli.stdout.on('data', data => {
            resolve(data)
        });
    })
}


function getTokenBalance(id) {
    return new Promise((resolve, reject) => {
        const cli = child_process.exec(cli_path + 'tokenbalance ' + id);

        cli.stdout.on('data', data => {
            resolve(JSON.parse(data).balance)
        });
    })
}

function getTokenName(id) {
    return new Promise((resolve, reject) => {
        const cli = child_process.exec(cli_path + 'tokeninfo ' + id);

        cli.stdout.on('data', data => {
            resolve(JSON.parse(data).name)
        });
    })
}


function getTokenList() {
    return new Promise((resolve, reject) => {
        const cli = child_process.exec(cli_path + 'tokenlist');

        cli.stdout.on('data', tokens => {
            tokens = JSON.parse(tokens)
            tokens.forEach((tok, i, arr) => {
                arr[i] = { id: tok }
            })


            // Get token information
            Promise.all(tokens.map(t => {
                return new Promise((resolve, reject) => {
                    // Get name and balance
                    Promise.all([
                        getTokenName(t.id).then(name => { t.name = name; }),
                        getTokenBalance(t.id).then(balance => { t.balance = balance; })                        
                    ]).then(() => { resolve() })
                })
            })).then(() => { resolve(tokens) })
        });
    })
}

function getTokenOrders() {
    return new Promise((resolve, reject) => {
        const cli = child_process.exec(cli_path + 'tokenorders');

        cli.stdout.on('data', orders => {
            orders = JSON.parse(orders)


            // Get token information
            Promise.all(orders.map(t => {
                return new Promise((resolve, reject) => {
                    // Get name and balance
                    Promise.all([
                        getTokenName(t.tokenid).then(name => { t.name = name; })                     
                    ]).then(() => { resolve() })
                })
            })).then(() => { resolve(orders) })
        });
    })
}

function importPrivKey(key) {
    console.log('Importing privkey: ' + key)
    return new Promise((resolve, reject) => {
        const cli = child_process.exec(cli_path + 'importprivkey ' + key);

        cli.stdout.on('data', data => {
            console.log('importprivkey result address: ' + data)
            resolve(data)
        });
    })
}

function getAddressFromPubkey(pubkey) {
    return new Promise((resolve, reject) => {
        const cli = child_process.exec(cli_path + 'tokenaddress ' + pubkey);

        cli.stdout.on('data', data => {
            resolve(JSON.parse(data).myaddress)
        });
    })
}



function sendToAddress(address, amount) {
    return new Promise((resolve, reject) => {
        console.log('Sending ' + amount + ' ' + getCoinName() + ' to ' + address)
        const cli = child_process.exec(cli_path + 'sendtoaddress ' + address + ' ' + amount);

        cli.stdout.on('data', data => {
            console.log('sendtoaddress ' + address + ' ' + amount)
            console.log('txid: ' + data)
            resolve(data)
        });


        cli.stderr.on('data', data => {
            reject(data)
        });
    })
}



function broadcastTX(raw_tx) {
    return new Promise((resolve, reject) => {
        const cli = child_process.exec(cli_path + 'sendrawtransaction ' + raw_tx);

        cli.stdout.on('data', data => {
            console.log('TX-ID result: ' + data)
            resolve(data)
        });

        cli.stderr.on('data', data => {
            console.log('Broadcast Failed: ' + data)
            reject(data)
        });
    })
}

function sendTokenToAddress(token_id, address, amount) {
    return new Promise((resolve, reject) => {
        console.log('Sending ' + amount + ' of token_id: ' + token_id + ' to ' + address)
        const cli = child_process.exec(cli_path + 'tokentransfer ' + token_id + ' ' + address + ' ' + amount);

        cli.stdout.on('data', data => {
            console.log('tokentransfer ' + address + ' ' + amount)

            broadcastTX(JSON.parse(data).hex).then(txid => {
                resolve(txid)
            }).catch(e => {
                reject(e)
            })
        });

        cli.stderr.on('data', data => {
            reject(data)
        });
    })
}



function createToken(name, supply, description) {
    return new Promise((resolve, reject) => {
        console.log('Creating token ' + name + ', supply: ' + supply + ' description: ' + description)
        
        let command = cli_path + 'tokencreate ' + name + ' ' + supply
        if(description !== '') command += '\"' + description + '\"'

        const cli = child_process.exec(command);
        

        cli.stdout.on('data', data => {
            console.log('Broadcasting tokencreate...')
            broadcastTX(JSON.parse(data).hex).then(txid => {
                resolve(txid)
            }).catch(e => {
                reject(e)
            })
        });

        cli.stderr.on('data', data => {
            reject(data)
        });
    })
}


function createTokenTradeOrder(action, supply, tokenid, price) {
    return new Promise((resolve, reject) => {
        console.log('Creating token buy order supply:' + supply + ', tokenid: ' + tokenid + ', price: ' + price)
        
        let command = cli_path + 'token' + (action === 'buy' ? 'bid' : 'ask')
            + ' ' + supply + ' ' + tokenid + ' ' + price

        const cli = child_process.exec(command);
        
        cli.stdout.on('data', data => {
            console.log('Broadcasting create trade order... ' + action)
            broadcastTX(JSON.parse(data).hex).then(txid => {
                resolve(txid)
            }).catch(e => {
                reject(e)
            })
        });

        cli.stderr.on('data', data => {
            reject(data)
        });
    })
}

function fillTokenOrder(func, tokenid, txid, count) {
    return new Promise((resolve, reject) => {
        console.log('Filling order token order:' + func + ', tokenid: ' + tokenid + ', txid: ' + txid + ' count: ' + count)
        
        let command = cli_path + 'tokenfill' + (func === 'buy' ? 'ask' : 'bid')
            + ' ' + tokenid + ' ' + txid + ' ' + count

        console.log(command)
        const cli = child_process.exec(command);
        
        cli.stdout.on('data', data => {
            console.log('Broadcasting fill order... ' + func)
            broadcastTX(JSON.parse(data).hex).then(txid => {
                resolve(txid)
            }).catch(e => {
                reject(e)
            })
        });

        cli.stderr.on('data', data => {
            reject(data)
        });
    })
}


function getCoinName() {
    return coin_name
}


function getKeyPair() {
    return keypair
}

module.exports = {
    startUp,
    stopDaemon,
    getBalance,
    getCoinName,
    sendToAddress,
    getNewAddress,
    getTokenList,
    getKeyPair,
    sendTokenToAddress,
    createToken,
    createTokenTradeOrder,
    getTokenOrders,
    fillTokenOrder
} 

const fs = require("fs");
const child_process = require('child_process');
const keygen = require('./keygen.js');

const os = require('os')
const platform = os.platform()

// Data
let config = {}
let komodod_path = ''
let cli_path = ''
let keypair = undefined 

function readConfig() {
    // Set default
    config = {
        bin_folder: '~/Documents/komodo/src/',
        chain_name: 'NAE',
        coin_name: 'NAE',
        chain_launch_params: '-ac_supply=100000 -addnode=95.216.196.64 -ac_cc=1337'
    }

    const config_path = getKomodoFolder() + 'gui_config.json'
    try {
        let data = JSON.parse(fs.readFileSync(config_path))

        // Set the value from the file if it exists
        if(data) {
            if(data.bin_folder) config.bin_folder = data.bin_folder
            if(data.chain_name) config.chain_name = data.chain_name
            if(data.coin_name) config.coin_name = data.coin_name
            if(data.chain_launch_params) config.chain_launch_params = data.chain_launch_params
        }

        console.log('Successfully loaded config file: ' + config_path)
    }
    catch(exception) {
        console.log('Config file does not exist or has invalid JSON, generating the default one' + config_path)
    }

    // Write config
    fs.writeFileSync(config_path, JSON.stringify(config))

    console.log('Config: ', config)

    // Refresh other variables
    komodod_path = config.bin_folder + 'komodod -ac_name=' + config.chain_name + ' '
    cli_path = config.bin_folder + 'komodo-cli -ac_name=' + config.chain_name + ' '
}




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
                importPrivKey(keypair.privkey).then(addr_info => {
                    keypair.address = addr_info.address
                    keypair.CCaddress = addr_info.CCaddress
                    resolve({ generated: true, privkey: keypair.privkey, pubkey, address: addr_info.address })
                })
            })
        }
        // If pubkey exists
        else {
            keypair = { privkey: '', pubkey }
        
            console.log('Launching with existing pubkey:')
            console.log('pubkey: ' + pubkey)
            
            launchDaemon(pubkey).then(() => {
                getAddressFromPubkey(pubkey).then(addr_info => {
                    keypair.address = addr_info.address
                    keypair.CCaddress = addr_info.CCaddress
                    resolve({ generated: false, privkey: keypair.privkey, pubkey, address: addr_info.address })
                })
            })
        }
    })
}


function launchDaemon(pubkey) {
    return new Promise((resolve, reject) => {
        let command = komodod_path + config.chain_launch_params + ' -pubkey=' + pubkey
        
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
            let json = JSON.parse(data)
            resolve({ address: json.myaddress, CCaddress: json.CCaddress, } )
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

function cancelTokenOrder(func, tokenid, txid) {
    return new Promise((resolve, reject) => {
        console.log('Cancelling order token order:' + func + ', tokenid: ' + tokenid + ', txid: ' + txid)
        
        let command = cli_path + 'tokencancel' + func + ' ' + tokenid + ' ' + txid

        console.log(command)
        const cli = child_process.exec(command);
        
        cli.stdout.on('data', data => {
            console.log('Broadcasting cancel order... ' + func)
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
    return config.coin_name
}

function getChainName() {
    return config.chain_name
}


function getKeyPair() {
    return keypair
}

function getKomodoFolder() {
    // macOS
    if(platform === 'darwin') 
        return os.homedir() + '/Library/Application Support/Komodo/' + config.chain_name + '/'  

    // Windows
    if(platform === 'win32') 
        return process.env.APPDATA + '\\Komodo\\' + config.chain_name + '\\' 

    // Probably Linux
    return os.homedir() + '/.komodo/' + config.chain_name + '/'  
}

module.exports = {
    startUp,
    stopDaemon,
    getBalance,
    getChainName,
    getCoinName,
    getKomodoFolder,
    sendToAddress,
    getNewAddress,
    getTokenList,
    getKeyPair,
    sendTokenToAddress,
    createToken,
    createTokenTradeOrder,
    getTokenOrders,
    fillTokenOrder,
    cancelTokenOrder,
    readConfig
} 

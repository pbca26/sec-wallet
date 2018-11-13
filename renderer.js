'use strict'

window.$ = window.jQuery = require('jquery')
window.Bootstrap = require('bootstrap')

let daemon = require('./api/daemon.js')

let Store = require('./api/store.js');

let store = new Store({
  configName: 'user-data',
  defaults: {
    first_privkey: '',
    first_pubkey: '',

    generated_privkey: '',
    generated_pubkey: '',

    pubkey: '',
  }
});

// Main pages
let pages = ['wallet', 'tokens', 'trade']

// Launch with the first page
openPage(pages[0])

// Navbar Page buttons
pages.forEach(page => {
    $('#nav-' + page).on('click', function(e) {
        openPage(page)
    });
});


// Initialize with the saved pubkey
init(store.get('pubkey'))

// TODO: Use events instead of polling
setInterval(() => updateBalance(), 1000);
setInterval(() => updateTokenLists(), 5000);
setInterval(() => updateTokenOrders(), 5000);

// Functions
function init(pubkey) {
    return new Promise((resolve, reject) => {
        inputLock(true);

        // Launch daemon 
        daemon.startUp(pubkey).then(wallet => {
            // Store the key
            store.set('pubkey', wallet.pubkey)

            // Save the new pubkey if generated for first time
            if(wallet.generated) {
                store.set('generated_privkey', wallet.privkey)
                store.set('generated_pubkey', wallet.pubkey)

                console.log('Firstprivkey empty: ', store.get('first_privkey') == '')
                console.log('Firstprivkey empty 2 : ', store.get('first_privkey') === '')
                console.log('Firstprivkey : ', store.get('first_privkey'))
                if(store.get('first_privkey') === '') {
                    store.set('first_privkey', wallet.privkey)
                    store.set('first_pubkey', wallet.pubkey)
                }
            }

            // // Add block for test
            // let transactions = []
            // for(let i = 0; i < 500; ++i)
            //     transactions.push(daemon.sendToAddress('RKSXk8CSb1tR1WBfx4z4xdedYLHPcPTFTx', 0.01))
            // Promise.all(transactions, () => { console.log('Sent all') })

            // Set UI Values
            updateNewAddress(wallet.address)
            Promise.all([
                updateBalance(),
                updateTokenLists(),
                updateTokenOrders()
            ]).then(() => {
                // Unlock input
                inputLock(false)
                
                resolve()
            })
        }) 
    })
}


$(".alert").hide();
$('.alert .close').on('click', function(e) {
    $(this).parent().hide();
});

$('#button-send').click(event => {
    event.preventDefault();
    
    let address = $('#input-address').val()
    let amount = $('#input-amount').val()
    // TODO: Validate inputs 

    // Send to address
    daemon.sendToAddress(address, amount).then(() => {
        updateBalance()

        // Add it to transaction history
        let transaction_text = addTransactionToHistory(address, amount, daemon.getCoinName())

        // Update status text
        statusAlert(true, transaction_text)
    }).catch(e => {
        statusAlert(false, e)
    })
})


$('#button-token-send').click(event => {
    event.preventDefault();

    let token_name = $('#select-tokens option:selected').text()
    let token_id = $('#select-tokens').val()
    let address = $('#input-token-address').val()
    let amount = $('#input-token-amount').val()
    // TODO: Validate inputs 

    // Send to address
    daemon.sendTokenToAddress(token_id, address, amount).then(txid => {
        // Add it to transaction history
        let transaction_text = addTransactionToHistory(address, amount, token_name, 
                                            '\nTransaction ID: ' + txid) 

        // Update status text
        statusAlert(true, transaction_text)
    }).catch(e => {
        statusAlert(false, e)
    })
})

function statusAlert(success, text) {
    $('#status-text').html(text);
    
    if(success) {
        // Remove danger
        $(".alert").removeClass("alert-danger")
        // Add success
        if(!$(".alert").hasClass("alert-success")) $(".alert").addClass("alert-success")
    }
    else {
        // Remove success
        $(".alert").removeClass("alert-success")
        // Add danger
        if(!$(".alert").hasClass("alert-danger")) $(".alert").addClass("alert-danger")
    }

    $(".alert").show();
}

function addTransactionToHistory(address, amount, asset_name, extra='') {
    var time = new Date().toTimeString().substr(0,8)

    let transaction_text = time + ' - Sent ' + amount + ' ' + asset_name + ' to ' + address;

    let thistory = $('#textarea-history')
    let curr_text = thistory.val()
    thistory.val(curr_text + (curr_text === '' ? '' : '\n') + transaction_text)

    return transaction_text
}

$('#button-show-keys').click(event => {
    event.preventDefault();

    $('#text-first-privkey').val(store.get('first_privkey'))
    $('#text-first-pubkey').val(store.get('first_pubkey'))

    $('#text-last-privkey').val(store.get('generated_privkey'))
    $('#text-last-pubkey').val(store.get('generated_pubkey'))
});




$('#button-change-pubkey').click(event => {
    event.preventDefault();

    // TODO: Validate inputs 
    $('#input-pubkey').val(daemon.getKeyPair().pubkey)
});

$('#button-save-pubkey').click(event => {
    event.preventDefault();
    
    // Close the modal
    $('#modal-change-pubkey').modal('hide')

    // TODO: Validate inputs 
    let new_pubkey = $('#input-pubkey').val()
    
    if(new_pubkey !== daemon.getKeyPair().pubkey) {
        // Restart the daemon
        inputLock(true);
        daemon.stopDaemon().then(() => {
            init(new_pubkey).then(() => {
                console.log('Restarted the daemon.')
            })
        })
    }
});


$('#button-new-address').click(event => {
    event.preventDefault();
    
    // Get a new address
    daemon.getNewAddress().then(address => updateNewAddress(address))
});




$('#button-create-token-submit').click(event => {
    event.preventDefault();
    
    // Close the modal
    $('#modal-create-token').modal('hide')

    // TODO: Validate inputs 
    let name = $('#input-create-token-name').val()
    let supply = $('#input-create-token-supply').val()
    let description = $('#input-create-token-description').val()
    

    // Create token
    daemon.createToken(name, supply, description).then(() => {
        console.log('Created token: ', name, supply, description)
    })
});



// Create buy / sell orders
['buy', 'sell'].forEach(action => {
    $('#button-token-'+ action +'-order-submit').click(event => {
        event.preventDefault();
        
        // Close the modal
        $('#modal-token-' + action +'-order').modal('hide')
    
        // TODO: Validate inputs 
        let tokenid = $('#select-token-' + action + '-order').val()
        let price = $('#input-token-' + action + '-order-price').val()
        let supply = $('#input-token-' + action + '-order-supply').val()
        
        // Create token
        daemon.createTokenTradeOrder(action, supply, tokenid, price).then(() => {
            console.log('Created token ' + action + ' order: ', supply, tokenid, price)
        })
    });
})




function inputLock(toggle) {
    $('#button-send').prop('disabled', toggle);
    $('#button-new-address').prop('disabled', toggle);
    $('#button-change-pubkey').prop('disabled', toggle);
    $('#button-save-pubkey').prop('disabled', toggle);
    $('#button-show-keys').prop('disabled', toggle);

    if(toggle) {
        $("#loader").modal({
            backdrop: "static", // Remove ability to close modal with click
            keyboard: false, // Remove option to close with keyboard
            show: true // Display loader!
        });
    }
    else {
        $("#loader").modal("hide");
    }
}

// Update balance
function updateBalance() {
    return daemon.getBalance().then(balance => {
        $('#balance').val(balance + ' ' + daemon.getCoinName())
    })
}

// Update address
function updateNewAddress(address) {
    $('#text-new-address').val(address)
}

// Update token list
function updateTokenLists() {
    return daemon.getTokenList().then(list => {
        const selects = ['#select-tokens', '#select-token-buy-order', '#select-token-sell-order']

        // Remove all
        selects.forEach(s => {
            // Get current selection
            let curr_selected = $(s + ' option:selected').val()

            $(s).children().remove()

            // Add new ones
            for(var i = 0; i < list.length; ++i) {
                $(s).append('<option value="' + list[i].id + '">' + list[i].name + ' - ' + list[i].balance + '</option>');
            }

            // Remember the selection
            if(curr_selected !== undefined) $(s).val(curr_selected);
        });
    })
}



// Update token list
function updateTokenOrders() {
    return daemon.getTokenOrders().then(list => {
        console.log('TOKEN ORDERS: ', list)
        // Remove all
        $('#table-token-buy').children().remove()
        $('#table-token-sell').children().remove()
        $('#table-token-my-sell').children().remove()
        $('#table-token-my-sell').children().remove()
        
        let my_address = daemon.getKeyPair().CCaddress


        // Add new ones to correct tables
        for(var i = 0; i < list.length; ++i) {
            let order = list[i]
            let buy = order.funcid === 'b' || order.funcid === 'B'
            let sell = order.funcid === 's' || order.funcid === 'S'

            // Reverse, because if you wanna buy, you look at sell-list
            order.action = buy ? 'sell' : sell ? 'buy' : 'unknown-func'

            
            // Available token order tables
            order.real_amount = buy ? order.totalrequired : sell ? order.amount : 'unknown'
            $('#table-token-' + order.action).append(`
                <tr>
                    <td>${order.name}</td>
                    <td>${order.price}</td>
                    <td>${order.real_amount}</td>
                    <td><button data-toggle="modal" data-target="#modal-token-fill-order" 
                                data-action="${order.action}" 
                                data-name="${order.name}" 
                                data-price="${order.price}"
                                data-amount="${order.real_amount}"
                                data-tokenid="${order.tokenid}"
                                data-txid="${order.txid}"
                        class="button-token-fill-order btn btn-primary">${buy ? 'Sell' : 'Buy'}</button></td>
                </tr>
            `);


            // If it's my order, add them to the my orders tables
            if(my_address === order.origaddress) {
                $('#table-token-my-' + order.action).append(`
                    <tr>
                        <td>${order.name}</td>
                        <td>${order.price}</td>
                        <td>${order.real_amount}</td>
                        <td><button 
                            data-type="${buy ? 'bid' : 'ask'}" 
                            data-tokenid="${order.tokenid}" 
                            data-txid="${order.txid}"
                            class="button-token-remove-order btn btn-primary">Remove</button></td>
                    </tr>
                `);            
            }
        }
    })
}


// Remove order
$(document).on('click', '.button-token-remove-order', function() {
    let btn = $(this);

    let type = btn.attr("data-type")
    let tokenid = btn.attr("data-tokenid")
    let txid = btn.attr("data-txid")

    daemon.cancelTokenOrder(type, tokenid, txid).then(() => {
        // Add it to transaction history
        let transaction_text = 'Cancelling token order...'//addTransactionToHistory(address, amount, daemon.getCoinName())

        // Update status text
        statusAlert(true, transaction_text)
    }).catch(e => {
        statusAlert(false, e)
    })
})




// Fill order
$(document).on('click', '.button-token-fill-order', function() {
    let btn = $(this);

    let action = btn.attr("data-action")
    let name = btn.attr("data-name")
    let price = btn.attr("data-price")
    let amount = btn.attr("data-amount")
    let tokenid = btn.attr("data-tokenid")
    let txid = btn.attr("data-txid")
    
    $('#text-token-fill-order-action').html((action === 'buy' ? 'Sell' : 'Buy') + 'ing Token')
    $('#text-token-fill-order-name').val(name)
    $('#input-token-fill-order-price').val(price)
    $('#input-token-fill-order-amount').val(amount)

    $('#button-token-fill-order-submit').attr('data-action', action)
    $('#button-token-fill-order-submit').attr('data-tokenid', tokenid)
    $('#button-token-fill-order-submit').attr('data-txid', txid)
})


// Fill order final submit
$('#button-token-fill-order-submit').click(event => {
    event.preventDefault();
    // Close the modal
    $('#modal-token-fill-order').modal('hide')

    let btn = $('#button-token-fill-order-submit')

    // TODO: Validate inputs 
    let action = btn.attr("data-action")
    let tokenid = btn.attr("data-tokenid")
    let txid = btn.attr("data-txid")
    let count = $('#input-token-fill-order-fill-count').val()


    daemon.fillTokenOrder(action, tokenid, txid, count).then(() => {
        // Add it to transaction history
        let transaction_text = 'Filling token order...'//addTransactionToHistory(address, amount, daemon.getCoinName())

        // Update status text
        statusAlert(true, transaction_text)
    }).catch(e => {
        statusAlert(false, e)
    })
})

function openPage(page) {
    // Hide other pages
    for(let p of pages) {
        if(p !== page) {
            $('#' + p + '-page-only').hide();
            $('#nav-' + p).toggleClass("active", false);
        }
    }

    // Show this one
    $('#nav-' + page).toggleClass("active", true);
    $('#' + page + '-page-only').show();
}

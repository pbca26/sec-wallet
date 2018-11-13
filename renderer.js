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
setInterval(() => updateTokenList(), 5000);
setInterval(() => updateTokenOrders(), 10000);

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
                updateTokenList()
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
        let transaction_text = addToHistory(address, amount, daemon.getCoinName())

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
        let transaction_text = addToHistory(address, amount, token_name, 
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

function addToHistory(address, amount, asset_name, extra='') {
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
function updateTokenList() {
    return daemon.getTokenList().then(list => {
        // Get current selection
        let curr_selected = $('#select-tokens option:selected').val()

        // Remove all
        $('#select-tokens').children().remove()
        
        // Add new ones
        for(var i = 0; i < list.length; ++i) {
            $('#select-tokens').append('<option value="' + list[i].id + '">' + list[i].name + ' - ' + list[i].balance + '</option>');
        }
        
        // Remember the selection
        if(curr_selected !== undefined) $("#select-tokens").val(curr_selected);
    })
}



// Update token list
function updateTokenOrders() {
    return daemon.getTokenOrders().then(list => {
        // Remove all
        $('#list-token-buy').children().remove()
        $('#list-token-sell').children().remove()
        
        // Add new ones to correct lists
        for(var i = 0; i < list.length; ++i) {
            let buy = list.funcid === 'b' || list.funcid === 'B'
            let sell = list.funcid === 's' || list.funcid === 'S'
            
            let act = buy ? 'buy' : sell ? 'sell' : 'unknown-func'
            
            $('#list-token-' + act).append('<li class=\"list-group-item\">' + 
                list[i].name + ' - ' + list[i].price 
            + '</li>');
        }
    })
}

function openPage(page) {
    // Hide other pages
    for(let p of pages) {
        if(p != page) {
            $('#' + p + '-page-only').hide();
            $('#nav-' + p).toggleClass("active", false);
        }
    }

    // Show this one
    $('#nav-' + page).toggleClass("active", true);
    $('#' + page + '-page-only').show();
}

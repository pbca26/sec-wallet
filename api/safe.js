const fs = require("fs");
const crypto = require("crypto");

const algorithm = 'aes-256-cbc'
const enc = '.enc'
class Safe {
    constructor(filePath, password='') {
        this.filePath = filePath;
        this.password = password;
    }

    setPassword(password) {
        this.password = password
    }

    errFileNotEncrypted(msg) {
        return msg.indexOf('0606506D') !== -1
    }

    errWrongPassword(msg) {
        return msg.indexOf('06065064') !== -1
    }

    errFileNotFound(msg) {
        return msg.indexOf('no such file or directory') !== -1
    }

    _encrypt(data) {
        var cipher = crypto.createCipher(algorithm, this.password);
        return Buffer.concat([cipher.update(new Buffer.from(JSON.stringify(data), "utf8")), cipher.final()]);
    }

    _decrypt(data) {
        var decipher = crypto.createDecipher(algorithm, this.password);
        var decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
        return JSON.parse(decrypted.toString());
    }

    decryptFile() {
        return new Promise((resolve, reject) => {
            // Read encrypted file
            let data
            try {  
                data = fs.readFileSync(this.filePath + enc) 
            } 
            catch(exception) { 
                console.log('Could not read encrypted file, probably first launch', this.filePath)
                reject({ message: exception.message })
            }

            // Decrypted and write
            try { 
                fs.writeFileSync(this.filePath, Buffer.from(this._decrypt(data).data))
                console.log('Decrypted and saved: ', this.filePath)

                console.log('Removing : ', this.filePath + enc)
                fs.unlinkSync(this.filePath + enc)
                console.log('Removed : ', this.filePath + enc)

                resolve({ message: 'success' }); 
            } 
            catch(exception) { 
                console.log('Could not decrypt and save: ', this.filePath)
                reject({ message: exception.message }); 
            }
        });
    }

    encryptFile() {
        return new Promise((resolve, reject) => {
            // Read non-encrypted file
            let data
            try {  
                data = fs.readFileSync(this.filePath) 
            } 
            catch(exception) { 
                console.log('Could not read to encrypt', this.filePath)
                reject({ message: exception.message })
            }

            // Encrypt and write
            try {  
                fs.writeFileSync(this.filePath + enc, this._encrypt(data));
                console.log('Encrypted and saved: ', this.filePath + enc)
                
                console.log('Removing : ', this.filePath)
                fs.unlinkSync(this.filePath)
                console.log('Removed : ', this.filePath)

                resolve({ message: 'success'}); 
            } 
            catch(exception) { 
                console.log('Could not encrypt the file!', this.filePath)
                reject({ message: exception.message })
            }
        });
    }
}

exports.Safe = Safe;

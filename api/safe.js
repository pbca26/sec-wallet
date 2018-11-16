const fs = require("fs");
const crypto = require("crypto");

const algorithm = 'aes-256-cbc'

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

    encryptAsync(data) {
        return new Promise((resolve, reject) => {
            try { var encrypted = this._encrypt(data) } 
            catch (exception) { reject({ message: exception.message }); }
            
            fs.writeFile(this.filePath, encrypted, error => {
                if(error) reject(error)
                
                resolve({ message: "Encrypted!" });
            });
        });
    }

    encrypt(data) {
        try {
            fs.writeFileSync(this.filePath, this._encrypt(data));
            return { message: "Encrypted!" };
        } catch (exception) {
            throw new Error(exception.message);
        }
    }

    decryptAsync() {
        return new Promise((resolve, reject) => {
            fs.readFile(this.filePath, (error, data) => {
                if(error) reject(error);

                try { resolve(this._decrypt(data)); } 
                catch (exception) { reject({ message: exception.message }); }
            });
        });
    }

    decrypt() {
        try {
            var data = fs.readFileSync(this.filePath);
            return this._decrypt(data);
        } catch (exception) {
            throw new Error(exception.message);
        }
    }

    decryptFile() {
        return new Promise((resolve, reject) => {
            fs.readFile(this.filePath, (error, data) => {
                if(error) reject(error);
                
                try { 
                    fs.writeFileSync(this.filePath, Buffer.from(this._decrypt(data).data))
                    resolve( { message: 'success'} ); 
                } 
                catch (exception) { reject({ message: exception.message }); }
            });
        });
    }

    encryptFile() {
        return new Promise((resolve, reject) => {
            fs.readFile(this.filePath, (error, data) => {
                if(error) reject(error);
                
                // Check if it's encrypted
                try { 
                    this._decrypt(data) 

                    // If it decrypts normally, it's already encrypted, don't do anything
                    console.log('File is already encrypted!')
                    resolve( { message: 'success'} ); 
                } 
                catch (exception) { 
                    // If not encrypted, good, that's what we want
                    if(this.errFileNotEncrypted(exception.message)) {
                        try { 
                            fs.writeFileSync(this.filePath, this._encrypt(data));
                            resolve( { message: 'success'} ); 
                        } 
                        // If couldn't encrypt:
                        catch (exception) { reject({ message: exception.message }); }
                    }
                    else {
                        console.log('File is already encrypted!')
                        reject({ message: 'success' })
                    }
                }
            });
        });
    }
}

exports.Safe = Safe;

const FileSystem = require("fs");
const Crypto = require("crypto");

const algorithm = 'aes-256-cbc'

class Safe {
    constructor(filePath, password) {
        this.filePath = filePath;
        this.password = password;
    }

    _encrypt(data) {
        var cipher = Crypto.createCipher(algorithm, this.password);
        return Buffer.concat([cipher.update(new Buffer(JSON.stringify(data), "utf8")), cipher.final()]);
    }

    _decrypt(data) {
        var decipher = Crypto.createDecipher(algorithm, this.password);
        var decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
        return JSON.parse(decrypted.toString());
    }

    encryptAsync(data) {
        return new Promise((resolve, reject) => {
            try { var encrypted = this._encrypt(data) } 
            catch (exception) { reject({ message: exception.message }); }
            
            FileSystem.writeFile(this.filePath, encrypted, error => {
                if(error) reject(error)
                
                resolve({ message: "Encrypted!" });
            });
        });
    }

    encrypt(data) {
        try {
            FileSystem.writeFileSync(this.filePath, this._encrypt(data));
            return { message: "Encrypted!" };
        } catch (exception) {
            throw new Error(exception.message);
        }
    }

    decryptAsync() {
        return new Promise((resolve, reject) => {
            FileSystem.readFile(this.filePath, (error, data) => {
                if(error) reject(error);

                try { resolve(this._decrypt(data)); } 
                catch (exception) { reject({ message: exception.message }); }
            });
        });
    }

    decrypt() {
        try {
            var data = FileSystem.readFileSync(this.filePath);
            return this._decrypt(data);
        } catch (exception) {
            throw new Error(exception.message);
        }
    }
}

exports.Safe = Safe;
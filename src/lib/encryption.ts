
/**
 * End-To-End Encryption flow for YaMa.
 * 1. All users generate their own personal private and public keypair
 * 2. The public key for users will be uploaded to the MongoDB Database
 * 3. Private keys will remain stored in browser storage
 * 4. When the user opens a chat, the app will fetch all the keys of the participents in the chat.
 * 5. When the user opens a chat, the app will generate a random symmetric key to encrypt messages.
 * 6. When a message is sent, the message will be encrypted with the symmetric key.
 * 7. When a message is sent, the symmetric key will be encrypted with all participants' pubkeys.
 * 8. The message sent to the server will contain the encrypted message, as well as a symmetric key for all participants, mapped to their user ID
 * 
 */

export default class YamaEncryption {
    /**
     * ### Generate a JWK Private and Public key
     * 
     * @returns {CryptoKeyPair} JWK Private and Public Key 
     */
    static async generateKeyPair(): Promise<{ privateKey: JsonWebKey, publicKey: JsonWebKey }> {
        // Generate a Elyptic Key-Pair using a length of 256
        const keyPair = await window.crypto.subtle.generateKey({
            name: "ECDH",
            namedCurve: "P-256",
        },
            true,
            ["deriveKey", "deriveBits"]
        );

        // Generate JWK Public Key
        // Info: https://datatracker.ietf.org/doc/html/rfc7517
        const publicKey = await window.crypto.subtle.exportKey(
            "jwk",
            keyPair.publicKey
        );

        // Generate JWK Private Key
        // Info: https://datatracker.ietf.org/doc/html/rfc7517
        const privateKey = await window.crypto.subtle.exportKey(
            "jwk",
            keyPair.privateKey
        );

        return { privateKey, publicKey }
    }

    /**
     * ### Generate a symmetric key, used for encrypting messages
     * 
     * @param {JsonWebKey} publicKey The JWK PublicKey
     * @param {JsonWebKey} privateKey The JWK PrivateKey
     * 
     * @returns {CryptoKey} The Symmetric key
     */
    static async generateSymmetricKey(publicKeyJWK: JsonWebKey, privateKeyJWK: JsonWebKey): Promise<CryptoKey> {
        try {
            const publicKey = await window.crypto.subtle.importKey(
                "jwk",
                publicKeyJWK,
                {
                    name: "ECDH",
                    namedCurve: "P-256"
                },
                true,
                []
            );

            const privateKey = await window.crypto.subtle.importKey(
                "jwk",
                privateKeyJWK,
                {
                    name: "ECDH",
                    namedCurve: "P-256",
                },
                true,
                ["deriveKey", "deriveBits"]
            );

            return await window.crypto.subtle.deriveKey(
                { name: "ECDH", public: publicKey },
                privateKey,
                { name: "AES-GCM", length: 256 },
                true,
                ["encrypt", "decrypt"]
            );
        } catch (e) {
            console.warn("Error generating symmetric key: " + e)
        }
    }

    /**
     * ### Encrypt a message using a given derived key
     * 
     * @param {string} plainText The plaintext of the message in `Uint8Array` format
     * @param {string} derivedKey The derived key used for encryption
     * 
     * @returns {{message: string, iv: string}} A JSON object containing the following: 
     *      {
     *          message: Encrypted message ,
     *          iv: The randomly generated Initialization Variable
     *      }
     */
    static async encryptMessage(plainText: string, derivedKey): Promise<MessageObject> {
        try {
            const encoder = new TextEncoder()
            const iv = (Math.random() + 1).toString(36).substring(2)

            const encryptedData = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv: new TextEncoder().encode(iv),
                    tagLength: 128
                },
                derivedKey,
                encoder.encode(plainText)
            );

            const uintArray = new Uint8Array(encryptedData);

            const convertedString = String.fromCharCode.apply(null, uintArray);

            const base64message = btoa(convertedString);

            return { message: base64message, iv: iv }
        } catch (e) {
            console.warn("Error encrypting message: " + e);
        }

    }

    /**
     * ### Decrypt a message using a given derived key
     * 
     * @param {string} messageJSONObject The output of {@link encryptMessage()}
     * @param {string} derivedKey The derived key used for encryption, can be obtained using {@link generateSymmetricKey()}
     * 
     * @returns {string} The decrypted message
     */
    static async decryptMessage(messageJSONObject, derivedKey): Promise<string> {
        try {
            const message = messageJSONObject;
            const base64text = message.message;
            const iv = new TextEncoder().encode(message.iv);

            const text: string = atob(base64text);

            const uintArray = new Uint8Array(
                [...text].map((char) => char.charCodeAt(0))
            );
            const decryptedData = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv,
                    tagLength: 128
                },
                derivedKey,
                uintArray
            );

            return new TextDecoder().decode(decryptedData);

        } catch (e) {
            console.warn("An error occurred whilst decrypting a message: " + e)
        }
    }

    /**
     * ### Encrypt a message with a given string
     * 
     * This function will derive a PBKDF2 key using a password,
     * and will then encrypt the plaintext using the AES-GCM 
     * method and a randomly generated integer value
     * 
     * @param {string} plaintext The message to encrypt
     * @param {string} password The password to encrypt the message with
     * 
     * @returns base64 encoded object containing the message 
     * (also encoded as b64) and the integer value
     * 
     */
    static async encryptWithString(plaintext: string, password: string): Promise<string> {
        try {
            const encoder = new TextEncoder()
            const iv = (Math.random() + 1).toString(36).substring(2)

            const key = await this.deriveKey(password)

            const encryptedText = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv: encoder.encode(iv)
                },
                key,
                encoder.encode(plaintext)
            );

            const uint8array = new Uint8Array(encryptedText);

            const base64message = btoa(String.fromCharCode.apply(null, uint8array));

            return btoa(JSON.stringify({
                message: base64message,
                iv: iv
            }))
        } catch (e) {
            console.warn("Error encrypting with a string: " + e);
        }
    }

    /**
     * ### Decrypt a message with a given string
     * 
     * This function will derive a PBKDF2 key using a password,
     * and will then decrypt the message that was encrypted using the 
     * AES-GCM method.
     * 
     * @param {string} b64EncryptedMessage The output of {@link encryptWithString()}
     * @param {string} password The password used to decrypt the message
     * 
     * @returns {string} base64 encoded object containing the message 
     * (also encoded as b64) and the integer value
     * 
     */
    static async decryptWithString(b64EncryptedMessage: string, password: string): Promise<string> {
        const encoder = new TextEncoder()
        const decoder = new TextDecoder()

        try {
            // Decode the response from the DB and parse to JSON
            const response = atob(b64EncryptedMessage);
            const JSONMessage = JSON.parse(response)
            const iv = JSONMessage.iv

            // Decode the message
            const message = atob(JSONMessage.message)
            const uintArray = new Uint8Array(
                [...message].map((char) => char.charCodeAt(0))
            );

            const key = await this.deriveKey(password)

            return decoder.decode(await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: encoder.encode(iv)
                },
                key,
                uintArray
            ));
        } catch (e) {
            console.warn("Error decrypting string via password! " + e)
        }
    }

    /**
     * ### Derive key for password decryption
     * 
     * Used in association with {@link encryptWithString} and {@link decryptWithString}
     * to generate the key via password
     * 
     * @param {string} password Password used for decryption
     * @returns {CryptoKey} The key used for decryption
     */
    static async deriveKey(password: string): Promise<CryptoKey> {
        const encoder = new TextEncoder()

        // Create a PBKDF2 key for use in the deriveKey() function
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            "PBKDF2",
            false,
            ['deriveKey', 'deriveBits']
        );

        return await window.crypto.subtle.deriveKey({
            "name": "PBKDF2",
            "salt": encoder.encode(""),
            "iterations": 10000,
            "hash": "SHA-256"
        },
            keyMaterial,
            { "name": "AES-GCM", "length": 256 },
            true,
            ["encrypt", "decrypt"]);
    }

    /**
     * ### Encrypt a symmetric key for multiple users in a group scenario
     * 
     * @param {CryptoKey} symmetricKey The symmetric key to encrypt
     * @param {Array<JsonWebKey>} userPublicKeys An array of user public keys to encrypt for
     * @param {CryptoKey} userPrivateKey The calling user's private key
     * @returns {Promise<Array<{ userPubKey: JsonWebKey, encryptedSymKey: string, iv: string }>>} An array 
     * of objects containg the public key for the user, their encrypted symmetric key and the integer value 
     * used for the algorithm
     */
    static async encryptSymKeyForUsers(symmetricKey: CryptoKey, userPublicKeys: Array<JsonWebKey>, userPrivateKey: JsonWebKey): Promise<Array<{ userPubKey: JsonWebKey, encryptedSymKey: string, iv: string }>> {
        try {
            const encryptedKeyArray: Array<{ userPubKey: JsonWebKey, encryptedSymKey: string, iv: string }> = []
            const encoder = new TextEncoder()
            const rawKey = await crypto.subtle.exportKey("raw", symmetricKey);
            const rawKeyUint8Array = new Uint8Array(rawKey);

            // Loop through all members
            for (const key of userPublicKeys) {
                try {
                    const symmetricKey = await this.generateSymmetricKey(key, userPrivateKey)

                    //Generate IV for user
                    const iv = (Math.random() + 1).toString(36).substring(2);

                    // Encrypt Symmetric key using user's pubkey
                    const encryptedText = await window.crypto.subtle.encrypt(
                        {
                            name: "AES-GCM",
                            iv: encoder.encode(iv)
                        },
                        symmetricKey,
                        rawKeyUint8Array
                    );

                    const uintArray = new Uint8Array(encryptedText)

                    const convertedString = String.fromCharCode.apply(null, uintArray)

                    const b64EncryptedText = btoa(convertedString);

                    encryptedKeyArray.push({
                        userPubKey: key,
                        encryptedSymKey: b64EncryptedText,
                        iv: iv
                    })
                } catch (e) {
                    console.warn("Error encrypting symmetric key for a user: " + e)
                }
            }
            return encryptedKeyArray
        } catch (e) {
            console.warn("Error encrypting the symmetric key for the users: " + e);
        }
    }

    /**
     * ### Create a message for YaMa
     * Function used to create the object that will be posted to the 
     * backend for a single chat message
     * 
     * @param {string} plainText The plaintext message to encrypt
     * @param {Array<JsonWebKey>} userPublicKeys An array of public keys for users in the group chat
     * @param {JsonWebKey} userPublicKey The public key for the calling user
     * @param {JsonWebKey} userPrivateKey The private key for the calling user
     * @returns {Promise<EncryptedMessage>}
     * An object containing the encrypted message, the public key of the user that send the message,
     * and the keyArray that is generated by {@link encryptSymKeyForUsers()}
     */
    static async createYaMaMessage(plainText: string, userPublicKeys: Array<JsonWebKey>, userPublicKey: JsonWebKey, userPrivateKey: JsonWebKey): Promise<EncryptedMessage> {
        const keyPair1 = await this.generateKeyPair()
        const keyPair2 = await this.generateKeyPair()
        const symmetricKey = await this.generateSymmetricKey(keyPair2.publicKey, keyPair1.privateKey)
        const yamaMessage = {
            message: await this.encryptMessage(plainText, symmetricKey),
            sendingUserPublicKey: userPublicKey,
            keyArray: await this.encryptSymKeyForUsers(symmetricKey, userPublicKeys, userPrivateKey)
        }
        return yamaMessage
    }

    /**
     * ## Decrypt a YaMa message object
     * @param {{message: string, sendingUserPublicKey: JsonWebKey, keyArray: Array<{ userPubKey: JsonWebKey, encryptedSymKey: string, iv: string }>}} yamaMesssage 
     * A message object produced by {@link createYaMaMessage()}
     * @param {CryptoKey} userPublicKey The public key for the calling user
     * @param {CryptoKey} userPrivateKey The private key for the calling user
     * @returns {string} The decrypted message 
     */
    static async decryptYaMaMessage(yamaMesssage: EncryptedMessage , userPublicKey: JsonWebKey, userPrivateKey: JsonWebKey): Promise<string> {
        try {
            const encoder = new TextEncoder();

            let encryptedSymKeyUit8;
            let iv;

            for (let item of yamaMesssage.keyArray) {
                if (item.userPubKey.x == userPublicKey.x && item.userPubKey.y == userPublicKey.y) {
                    encryptedSymKeyUit8 = atob(item.encryptedSymKey);
                    iv = item.iv;
                }
            }
            
            // Convert message into Uint8Array for encrypting
            const uintArray = new Uint8Array(
                [...encryptedSymKeyUit8].map((char) => char.charCodeAt(0))
            );

            // Generate symmetric key for decrypting the message symmetric key
            const decryptSymmetricKey = await this.generateSymmetricKey(yamaMesssage.sendingUserPublicKey, userPrivateKey)

            // Decrypt Symmetric key using user's private key
            const rawDecryptedSymKey = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: encoder.encode(iv)
                },
                decryptSymmetricKey,
                uintArray
            );

            const decryptedSymKey = await crypto.subtle.importKey(
                "raw",
                rawDecryptedSymKey,
                "AES-GCM",
                true,
                ["encrypt", "decrypt"]
            )

            return await this.decryptMessage(yamaMesssage.message, decryptedSymKey);
        } catch (e) {
            console.warn("Error decrypting YaMa message: " + e)
        }
    }
}
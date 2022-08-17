/// <reference types="svelte" />

type KeyObject = {
    userPubKey: JsonWebKey;
    encryptedSymKey: string;
    iv: string;
}

type YamaMessage = {
    _id: string;
    active: boolean;
    user: string;
    username: string;
    date: string;
    reactions: [];
    message: EncryptedMessage | String
}

type MessageObject = {
    message: string,
    iv: string
}

type EncryptedMessage = {
    message: MessageObject;
    sendingUserPublicKey: JsonWebKey;
    keyArray: Array<KeyObject>;
}

declare module '*'; // Remove type errors for modules that do not have typescrypt typing
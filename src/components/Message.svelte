<script lang="ts">
    import YamaEncryption from "../lib/encryption";
    import Alert from "./Alert.svelte"
    import type { SnackbarComponentDev } from '@smui/snackbar';

    export let message

    let activeUserPublicKey: JsonWebKey
    let activeUserPrivateKey: JsonWebKey

    try {
        activeUserPublicKey = JSON.parse( localStorage.getItem("pubKey") );
        activeUserPrivateKey = JSON.parse( localStorage.getItem("privKey") );
    } catch (err) {
        console.error("Error retrieving the encryption keys for the logged in user. Messages will not be decrypted.", err)
    }
    
    async function decryptMessage(messages: YamaMessage) {
        try {
            if (typeof message === "string" || !activeUserPublicKey || !activeUserPrivateKey) {
                return message;
            } else {
                let decryptedMessage = await YamaEncryption.decryptYaMaMessage(
                    message as EncryptedMessage,
                    activeUserPublicKey,
                    activeUserPrivateKey
                );
                return decryptedMessage
            }
        } catch (err) {
            console.error("Message decryption error.", err)
            return null
        }
    }

</script>

<span class="message-text">
    { #await decryptMessage(message) }
        .....
    {:then decryptedMessage}
        { #if typeof decryptedMessage == "string" }
            { #if decryptedMessage.startsWith("<audio") && decryptedMessage.endsWith("</audio>") }
                { @html decryptedMessage}
            {:else}
                {decryptedMessage}
            {/if}
        {:else}
            * Private Message *
        {/if}
    {:catch error}
        Error decrypting message: {error}
    {/await}
</span>

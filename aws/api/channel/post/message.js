const LAYER = require('/opt/nodejs/layer');

/**
 * CHANNEL/POST/MESSAGE
 * Add a message to a channel 
 * 
 * @param {Object} event
 * 
 * EXPECTS:
 * 
 *      POST {
 *          "header": {
 *              "Authorization": "Bearer <token>"
 *          },
 *          "body": "{
 *              \"channel\": <channel_id>, 
 *              \"message\": "<the_encrypted_message: EncryptedMessage>"
 *          }"
 *      }
 * 
 * @param {Object} context
 *
 * @returns {Object}
 * 
 * RETURNS:
 * 
 *      {
 *          "body":"{\"result\": <true/false>, \"error\":<any_errors_encountered>}"
 *      }
 * 
 */
exports.handler = async (event, context) => {
    console.log("CHANNEL/POST/MESSAGE");
    console.dir(event);

    const ERROR_STRING = "Error adding the message to the Channel.";

    let response = false;
    let error = "";
    let code = 200;

    try {

        // Extract _id from token and check user is active
        let userId = LAYER.getAuthToken(event)
        
        event = JSON.parse(event.body);

        // Extract passed parameters
        let channel = event.channel;
        let message = event.message;
        if (!channel) {
            throw "No channel ID received for the sent message."
        }
        if (!message) {
            throw "No message received for the passed channel."
        }
        if (typeof message == "string") {
            console.warn("Unencryped message received.")
        } else {
            if (!message.message || !message.message.message || message.message.message.length == 0) {
                throw "Invalid message received for the passed channel."
            }
        }
        
        // Add the message to the channel
        response = await LAYER.addMessage(userId, channel, message) 
    
    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);
}

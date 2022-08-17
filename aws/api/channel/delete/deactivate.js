const LAYER = require('/opt/nodejs/layer');

/**
 * CHANNEL/DELETE/DEACTIVATE
 * Deactivate a channel
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
 *              \"channel\": "<Channel_ID>",
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
    console.log("CHANNEL/DELETE/DEACTIVATE");
    console.dir(event);

    const ERROR_STRING = "Error deactivating the passed channel.";

    let response = false;
    let error = "";
    let code = 200;

    try {

        // Extract _id from token and check user is active
        let userId = LAYER.getAuthToken(event)
        
        event = JSON.parse(event.body);

        // Extract passed parameters
        let channel = event.channel;

        if (!channel) {
            throw "Invalid data passed to the API."
        }

        // Deactive the channel 
        response = await LAYER.deactivateChannel(userId, channel)
    
    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

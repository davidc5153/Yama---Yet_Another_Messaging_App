const LAYER = require('/opt/nodejs/layer');

/**
 * CHANNEL/GET/MESSAGES
 * Get messages from a channel
 * 
 * @param {Object} event
 * 
 * EXPECTS:
 * 
 *      GET {
 *          "header": {
 *              "Authorization": "Bearer <token>"
 *          },
 *          "queryStringParameters": {
 *              "channel": "<channel_id>"       // The channel containing the messages to retrieve 
 *                  --- OPTIONAL ---
 *              "date": "<date_time>"           // The date/time to retrieve messages from 
 *         }
 *      }
 * 
 * @param {Object} context
 *
 * @returns {Object}
 * 
 * RETURNS:
 * 
 *      {
 *          "body":"{
 *              \"result\": {"messages": [{<Message_Objects>}] },  
 *              \"error\":<any_errors_encountered> }"
 *      }
 *
 */
exports.handler = async (event, context) => {
    console.log("CHANNEL/GET/MESSAGES");
    console.dir(event);

    const ERROR_STRING = "Error retrieving the messages for the passed channel ID.";

    let response = [];
    let error = "";
    let code = 200;

    try {

        // Validate token and check user is active
        let userId = LAYER.getAuthToken(event)

        let channelId;
        let date;

        if (event.queryStringParameters) {
            channelId = event.queryStringParameters.channel;
            date = event.queryStringParameters.date;
        }         
        if (!channelId) {
            throw "No channel ID passed to the API";
        }

        response = await LAYER.getMessages(userId, channelId, date)

    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

const LAYER = require('/opt/nodejs/layer');

/**
 * CHANNEL/GET/INFO
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
 *              "channel": "<channel_id>"       // Get detailed information on a single channel 
 *                  --- OR ---
 *              "group": "<group_id>"           // Get general information of ALL channels under the passed group
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
 *              \"result\": [<channel_object>],  
 *              \"error\":<any_errors_encountered> }"
 *      }
 *
 *      NB: Adds "admin" parameter to channel object that indicates if the authenticated user is an admin of the channel
 */
exports.handler = async (event, context) => {
    console.log("CHANNEL/GET/INFO");
    console.dir(event);

    const ERROR_STRING = "Error retrieving channel information for the passed channel ID.";

    let response = [];
    let error = "";
    let code = 200;

    try {

        // Validate token and check user is active
        let userId = LAYER.getAuthToken(event)

        let groupId;
        let channelId;

        if (event.queryStringParameters) {
            groupId = event.queryStringParameters.group;
            channelId = event.queryStringParameters.channel;
        }         
        if (!groupId && !channelId) {
            throw "Invalid query parameters passed to the API";
        }

        if (groupId) {
            // Get information for all channels for a group (which the user is a member of)
            response = await LAYER.getAllParsedChannels(userId, groupId)
        } else {
            // Get information for the specified channel (IF the user is a member)
            response = await LAYER.getParsedChannels(userId, channelId)
        }
    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

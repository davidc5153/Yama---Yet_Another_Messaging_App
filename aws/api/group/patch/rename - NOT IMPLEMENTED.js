const LAYER = require('/opt/nodejs/layer');

/**
 * CHANNEL/PATCH/RENAME
 * Rename an existing channel
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
 *              \"name\": "<new_name>" 
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
 *          "body":"{\"result\": "<channel_name>", \"error\":<any_errors_encountered>}"
 *      }
 *  
 */
exports.handler = async (event, context) => {
    console.log("CHANNEL/PATCH/RENAME");
    console.dir(event);

    const ERROR_STRING = "Error renaming the Channel.";

    let response = "";
    let error = "";
    let code = 200;

    try {

        // Extract _id from token and check user is active
        let userId = LAYER.getAuthToken(event)
        
        event = JSON.parse(event.body);

        // Extract passed parameters
        let channel = event.channel;
        let name = event.name;

        if (!channel || !name) {
            throw "Invalid data passed to the API."
        }

        // Remove the user from channel - Also checks requesting user has authority, member exists in the channel etc 
        response = await LAYER.renameChannel(userId, channel, name)
    
    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

const LAYER = require('/opt/nodejs/layer');

/**
 * CHANNEL/PATCH/MEMBER
 * Remove a member from an existing channel
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
 *              \"member\": "<member_id>" 
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
 *          "body":"{\"result\": [ {<members>} ], \"error\":<any_errors_encountered>}"
 *      }
 * 
 *      Where the array of members for the channel is In the form
 *      [
 *          {
 *              _id: <user_Id>,
 *              active: <true/false>,
 *              admin: <true/false> 
 *          }
 *      ]  
 */
exports.handler = async (event, context) => {
    console.log("CHANNEL/PATCH/MEMBER");
    console.dir(event);

    const ERROR_STRING = "Error removing the passed member from the Channel.";

    let response = [];
    let error = "";
    let code = 200;

    try {

        // Extract _id from token and check user is active
        let userId = LAYER.getAuthToken(event)
        
        event = JSON.parse(event.body);

        // Extract passed parameters
        let channel = event.channel;
        let member = event.member;

        if (!channel || !member) {
            throw "Invalid data passed to the API."
        }

        // Remove the user from channel - Also checks requesting user has authority, member exists in the channel etc 
        response = await LAYER.removeUserFromChannel(userId, member, channel)
    
    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

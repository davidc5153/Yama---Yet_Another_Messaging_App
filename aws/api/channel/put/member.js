const LAYER = require('/opt/nodejs/layer');

/**
 * CHANNEL/PUT/MEMBER
 * Add a member to an existing channel
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
 *              admin: <true/false>,
 *              pubKey: <public_key>
 *          }
 *      ]  
 */
exports.handler = async (event, context) => {
    console.log("CHANNEL/PUT/MEMBER");
    console.dir(event);

    const ERROR_STRING = "Error adding the passed member to the Channel.";

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

        // Add the member to the channel - Also checks channel exists/active, requesting user is admin, member is not already in the channel etc   
        response = await LAYER.addUserToChannel(userId, member, channel)
    
    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

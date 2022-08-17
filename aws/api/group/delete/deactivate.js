const LAYER = require('/opt/nodejs/layer');

/**
 * GROUP/DELETE/DEACTIVATE
 * Deactivate a group
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
 *              \"group\": "<Group_ID>",
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
    console.log("GROUP/DELETE/DEACTIVATE");
    console.dir(event);

    const ERROR_STRING = "Error deactivating the passed group.";

    let response = false;
    let error = "";
    let code = 200;

    try {

        // Extract _id from token and check user is active
        let userId = LAYER.getAuthToken(event)
        
        event = JSON.parse(event.body);

        // Extract passed parameters
        let group = event.group;

        if (!group) {
            throw "Invalid data passed to the API."
        }

        // Deactivate the group    
        response = await LAYER.deactivateGroup(userId, group)
    
    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

const LAYER = require('/opt/nodejs/layer');

/**
 * CHANNEL/POST/CREATE
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
 *              \"name\": <group_name>, 
 *              \"group\": "<Group_ID>",
 *              \"members\": [<GROUP_initial_member_OBJECTS>], 
 *              \"avatar\": "<OPTIONAL base64 encoded image>",
 *          }"
 *      }
 * 
 *      Where member objects are in the form:
 *      { 
 *          _id: <ID>, 
 *          active: <true/false>, 
 *          admin: <true/false>
 *      }
 * 
 * @param {Object} context
 *
 * @returns {Object}
 * 
 * RETURNS:
 * 
 *      {
 *          "body":"{\"result\": <GroupObject>, \"error\":<any_errors_encountered>}"
 *      }
 * 
 */
exports.handler = async (event, context) => {
    console.log("CHANNEL/POST/CREATE");
    console.dir(event);

    const ERROR_STRING = "Error creating a Channel with the supplied details.";

    let response = {};
    let error = "";
    let code = 200;

    try {

        // Extract _id from token and check user is active
        let userId = LAYER.getAuthToken(event)
        
        event = JSON.parse(event.body);

        // Extract passed name, avatar and group (where avatar is optional)
        let name = event.name;
        let group = event.group;
        let members = event.members;
        let avatar = event.avatar;

        if (!name || name.length === 0) {
            throw "No name received for channel creation."
        }
        if (!group) {
            throw "No group ID received for group creation."
        }
        /* checks done in LAYER.createChannel()
        if (!members || !Array.isArray(members) || members.length === 0) {
            members = [{
                _id: userId,
                active: true,
                admin: true
            }]
        }
        */

        // Create the channel - Also checks that the group exists and that the channel name is not a duplicate within the group 
        response = await LAYER.createChannel(userId, name, group, members, avatar) 
    
    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

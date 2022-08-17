const LAYER = require('/opt/nodejs/layer');

/**
 * GROUP/POST/CREATE
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
 *              \"name\": <GROUP_name>, 
 *              \"isPrivate\": <boolean if the group should be private>, 
 *              \"members\": [{<GROUP_initial_members_OBJECTS>}], 
 *              \"avatar\": "<OPTIONAL base64 encoded image>",
 *          }"
 *      }
 * 
 * Where member objects are in the form:
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
    console.log("GROUP/POST/CREATE");
    console.dir(event);

    const ERROR_STRING = "Error creating a Group with the supplied details.";

    let response = {};
    let error = "";
    let code = 200;

    try {

        // Extract _id from token and check user is active
        let userId = LAYER.getAuthToken(event)
        
        event = JSON.parse(event.body);

        // Extract passed name, avatar and group (where avatar is optional)
        let name = event.name;
        let isPrivate = event.isPrivate;
        let members = event.members;
        let avatar = event.avatar;

        if (!name || name.length === 0) {
            throw "No name received for group creation."
        }
        if (isPrivate == null) {
            throw "No privacy level provided for group creation."
        }

        // Create the group - Also checks if the group exists via Name 
        response = await LAYER.createGroup(userId, name, isPrivate, members, false, avatar)

    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

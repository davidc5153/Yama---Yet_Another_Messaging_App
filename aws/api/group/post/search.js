const LAYER = require('/opt/nodejs/layer');

/**
 * GROUP/POST/SEARCH
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
 *                  AND/OR
 *              \"member\": "<member_ID>",
 * 
 *                  OPTIONAL
 *              \"friend\": "<OPTIONAL-friend_group>"
 *          }"
 *      }
 * 
 * 
 * @param {Object} context
 *
 * @returns {Object}
 * 
 * RETURNS:
 * 
 *      {
 *          "body":"{\"result\": [<GroupObjects>], \"error\":<any_errors_encountered>}"
 *      }
 * 
 */
exports.handler = async (event, context) => {
    console.log("GROUP/POST/SEARCH");
    console.dir(event);

    const ERROR_STRING = "Error searching for the Group with the supplied details.";

    let response = {};
    let error = "";
    let code = 200;

    try {

        // Verify token and check user is active
        LAYER.getAuthToken(event)
        
        event = JSON.parse(event.body);

        // Extract passed search data
        let name = event.name;
        let member = event.member;
        let friend = event.friend;
        if (!friend) {
          friend=null
        }

        if ( (!name || name.length === 0) && (!member || member.length === 0) ) {
            throw "No name and/or member ID received for group search."
        }

        // Search for groups that match the passed parameters 
        response = await LAYER.searchGroups(name, member, friend) 

    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

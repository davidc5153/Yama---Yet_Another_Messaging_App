const LAYER = require('/opt/nodejs/layer');

/**
 * GROUP/GET/INFO
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
 *              "group": "<group_id>"       // IIF no parameter passed, returns the information on ALL the user's groups
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
 *          "body":"{\"result\": [<group_object>], \"error\":<any_errors_encountered> }"
 *      }
 * 
 *      NB: Adds "admin" parameter to group object that indicates if the authenticated user is an admin of the group
 */
exports.handler = async (event, context) => {
    console.log("GROUP/GET/INFO");
    console.dir(event);

    const ERROR_STRING = "Error retrieving group information.";

    let response = [];
    let error = "";
    let code = 200;

    try {

        // Find the authenticated user and the groups they are a member of
        let userId = LAYER.getAuthToken(event)

        let groupId

        if (event.queryStringParameters) {
            groupId = event.queryStringParameters.group;
        }

        if (!groupId) {
            response = await getAllUserGroupInfo(userId)
        } else {
            // Return group information for the grouId passed
            response = await getSpecificGroupInfo(groupId, userId)
        }

    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

/**
 * Returns the information of a specific group the user is a member of
 * 
 * @param {string} groupId - The group ID 
 * @param {string} userId - The user ID of the authenticated user making the request
 *   
 * @returns { [object] } An array containing the group object
 */
async function getSpecificGroupInfo(groupId, userId) {
    // Get the group info
    let groupArray = await LAYER.getGroups({
        _id: LAYER.convertToObjectId(groupId),
        active: true
    })
    if (groupArray && Array.isArray(groupArray) && groupArray.length===1) {
        // Check that the user is a member of the passed group
    
        let groupMember = LAYER.userIsMember(groupArray[0].members, userId)
        if (!groupMember) {
            throw "User is not a member of the group"
        }
        // Add a convenience parameter to the group object if the user is an admin of the group
        if (groupMember==="ADMIN") {
            groupArray[0].admin = true
        } else {
            groupArray[0].admin = false
        }
        return groupArray[0]
    } else {
        throw "Group not found or is not active"
    }
}

async function getAllUserGroupInfo(userId) {
    let response = []
    let users = await LAYER.getUsers(LAYER.convertToObjectId(userId))
    if (!users || !Array.isArray(users) || users.length!==1) {
        throw "User not found."
    }
    let usersGroups = users[0].groups
    
    // Return all group information for the authenticated user
    if (usersGroups && Array.isArray(usersGroups)) {
        let result = await LAYER.getGroups({
            _id: {
                "$in": usersGroups
            },
            active: true
        })
        if (result && Array.isArray(result)) {
            for (let index = 0; index < result.length; index++) {
                const group = result[index];
                // Make sure the user is an active member In the group
                let groupMember = LAYER.userIsMember(group.members, userId)
                if (groupMember) {
                    if (groupMember === "ADMIN") {
                        group.admin = true
                    } else {
                        group.admin = false
                    }
                    response.push(group)
                }
            }
            return response
        } else {
            throw "Error retrieving groups"
        }
    } else {
        throw "User has No groups."
    }
}
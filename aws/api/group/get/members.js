const LAYER = require('/opt/nodejs/layer');

/**
 * GROUP/GET/MEMBERS
 * 
 * Returns all the active members of an active group
 * The user making the request must be a member of the group
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
 *              "group": "<group_id>"
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
 *          "body":"{\"result\": [<member_object>], \"error\":<any_errors_encountered> }"
 *      }
 * 
 *      NB: Members objects contain:
 *          {
 *              _id: <members_id>,
 *              username: <members_username>,
 *              name: <members_name>,
 *              email: <members_email>,
 *              avatar: <members_avatar>,
 *              admin: <true/false>,
 *              pubKey: <members_public_key>
 *          }
 */
exports.handler = async (event, context) => {
    console.log("GROUP/GET/MEMBERS");
    console.dir(event);

    const ERROR_STRING = "Error retrieving information on members of the group.";

    let response = [];
    let error = "";
    let code = 200;

    try {

        // Find the authenticated user and the groups they are a member of
        let userId = LAYER.getAuthToken(event)

        let groupId

        if (event.queryStringParameters) {
            groupId = event.queryStringParameters.group;
            if (!groupId) {
                throw "The request is missing a group ID"
            }
    
        } else {
            throw "The request has no parameters"
        }

        let groupArray = await LAYER.getGroups({
            _id: LAYER.convertToObjectId(groupId),
            active: true
        })
        if (groupArray && Array.isArray(groupArray) && groupArray.length===1) {

            response = await getMembers(LAYER.convertToObjectId(userId), groupArray[0])

        } else {
            throw "Group not found or is not active"
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
 * Extract member ID's from group.members
 * Then get information on all users who are members of that group (removing non-active members)
 *  
 * @param {ObjectId} userId The ID of the user making the request
 * @param {ObjectId} group The ID of the group
 * 
 * @returns { [ {<member_object>} ] } - An array of objects with member data
 */
async function getMembers(userId, group) {
    let validUser = false
    let returnMemberArray = []
    let members = group.members    
    if (!members || !Array.isArray(members)) {
        return returnMemberArray
    }
    // Get the status of each member in the group
    let memberIdArray = []
    for (let index = 0; index < members.length; index++) {
        const member = members[index];
        if (member.active) {
            returnMemberArray.push({
                _id: member._id,
                admin: member.admin,
                username: null,
                name: null,
                avatar: null,
                pubKey: null
            })
            memberIdArray.push(member._id)
            if (member._id.equals(userId)) {
                validUser = true // User making the request is a member of the group
            }
        }
    }
    if (validUser && returnMemberArray.length>0) {
        return await getMemberInfo(userId, group._id, memberIdArray, returnMemberArray)
    }
    return []
}

/**
 * Gets the data of all active users who have the passed groupId in their user.group array
 * Users who have active=false set in their group.members object are removed
 * 
 * @param {ObjectId} userId The ID of the user making the request
 * @param {ObjectId} groupId - The ID of the group
 * @param { [ ObjectId ] } memberIdArray - The array of user active=true ObjectId's from group.members 
 * @param { [ {<member_object>} ] } memberObjectArray - The array of member objects for the array of member ID's 
 * 
 * @returns { [ {<member_object>} ] } - An array of objects with member data in the form: 
 *          {
 *              _id: <members_id>,
 *              username: <members_username>,
 *              name: <members_name>,
 *              avatar: <members_avatar>
 *              admin: <true/false>,
 *              pubKey: <members_public_key>
 *          }
 */    
async function getMemberInfo(userId, groupId, memberIdArray, memberObjectArray) {
    let validUser = false
    let returnArray = []
    // get all the user data who are members of the group
    let users = await LAYER.getUsers({
        active: true,
        groups: groupId
    }, {
        avatar: 1,
        username: 1,
        name: 1,
        email: 1,
        active: 1,
        admin: 1,
        pubKey: 1
    })
    if (!users || !Array.isArray(users) || users.length == 0) {
        throw "No active users found in the group"
    }

    // For each user, merge the object arrays
    for (let index = 0; index < users.length; index++) {
        const user = users[index];
        let foundMember = memberObjectArray.find( (member)=> {
            return member._id.equals(user._id)
        })
        if (foundMember) {
            if (user._id.equals(userId)) {
                validUser = true // User requesting the data has been verified as a valid member of the group
                // No need to send back the requesting users details
            } else {
                returnArray.push({...foundMember, ...user})
            }
        }
    }
    if (validUser) {
        return returnArray
    }
    return []
}


const LAYER = require('/opt/nodejs/layer');

/**
 * USER/GET/ACCEPT
 * 
 * @param {Object} event
 * 
 * EXPECTS:
 * 
 *      GET {
 *          "header": {
 *              "Authorization": "Bearer <token>"       // The token created for the invite including all the Information required
 *          }
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
 *              \"result\": <true/false>,  
 *              \"error\":<any_errors_encountered> }"
 *      }
 * 
 */
exports.handler = async (event, context) => {
    console.log("USER/GET/ACCEPT");
    console.dir(event);

    const ERROR_STRING = "Error accepting the passed invitation.";

    let response = false;
    let error = "";
    let code = 200;


    try {

        // Validate token
        LAYER.getAuthToken(event)

        // Parse the data sent with the token
        let token = event.headers.Authorization.split(" ")[1]
        let data = LAYER.decodeToken(token)

        if (!data || !data.group || !data.group._id) {
            throw "Invalide group for invitation acceptance."
        }

        let friend = false
        if (data.group.friend === true) {
            friend = true
        }

        let reactivatedGroup = false

        // If a friend group, need to check they are not reactivating a friends group
        if (friend) {
            // Get the group
            let group = await LAYER.getGroups({
                _id: LAYER.convertToObjectId(data.group._id)
            },{
                active: 1,
                friend: 1,
                members: 1
            })
            if (!group || !Array.isArray(group) || group.length != 1 || !group[0]._id || !group[0].friend || group[0].members.length > 2) {
                throw "Group not found for Invitation acceptance."
            }
            group = group[0]
        
            // If there are 2 members already in the friends group ...
            if (group.members.length == 2) {
                // The group must be inactive
                if (group.active) {
                    throw "Error accepting the friends request. There are already 2 members in the friend group."
                }
                // The user must be one of them
                let foundMember = group.members.find( (member) => {
                    return member._id == data._id 
                })
                if (!foundMember) {
                    throw "User not found in non-active existing friends group."
                }
                // We only need to reactivate the friend group
                response = await LAYER.reactiveFriendGroup(group._id)
                reactivatedGroup = true
            }
        }

        // Adding user to a GROUP
        if (!reactivatedGroup) {
            // New user - Look them up with their email address
            if (!data._id && data.email) {
                data.email = data.email.toLowerCase()
                let user = await LAYER.getUsers({
                    email: data.email
                }, {
                    username: 1,
                })
                if (!user || !Array.isArray(user) || user.length!==1) {
                    throw "User not found for acceptance of group invite."
                }
                data._id = user[0]._id
                data.username = user[0].username
            } 
                      
            // Add the user to the group
            if (data._id && data.username && data.group && data.group._id) {
                let result = await LAYER.addUserToGroup(data._id, data.username, data.group._id, friend, friend)
                if (result.acknowledged === true && result.modifiedCount === 1) {
                    response = true
                }
            } else {
                throw "Invalid user for acceptance of group invite."
            }
        }
    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}


const LAYER = require('/opt/nodejs/layer');

/**
 * GROUP/POST/INVITE
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
 *              \"group\": <group_ID OR null>,              (IIF null, it is a friend request) 
 *              \"email\": "<users_email>",
 *              \"name\": "<User's name for the invite>"    (OPTIONAL)
 *              \"message\": "<optional_message>"           (OPTIONAL)
 *          }"
 *      }
 * 
 * @param {Object} context
 *
 * @returns {Object}
 * 
 * RETURNS: The token to be passed to URL/#/invitation/<token>  - This will enable testing by manually using the token
 * 
 *      {
 *          "body":"{\"result\": {MessageId: <Id_of_email_sent>, token: <invite_token>}, \"error\":<any_errors_encountered>}" 
 *      }
 * 
 */

exports.handler = async (event, context) => {
    console.log("GROUP/POST/INVITE");
    console.dir(event);

    const ERROR_STRING = "Error processing the requested group invite.";

    let response = {};
    let error = "";
    let code = 200;

    try {

        // Extract _id from token and check user is active
        let _id = LAYER.getAuthToken(event)

        event = JSON.parse(event.body);

        // Extract passed information
        let group   // The group the user is invited to (IFF null, it is a friend request)
        let email   // Either existing username or an email address is required 
        let name    // Name to use when sending the invite
        let message = event.message; // Any message to be sent with the invite (OPTIONAL)
        let from    // Who the invite was initiated by in the form "name (username)" or just "username" if they have no name in the DB 

        let initiatingUser = await LAYER.getUsers({
            _id: LAYER.convertToObjectId(_id),
            active: true
        }, {
            email: 1,
            username: 1,
            name: 1
        });
        if (!initiatingUser || !Array.isArray(initiatingUser) || initiatingUser.length != 1 || !initiatingUser[0]._id || !initiatingUser[0].email || !initiatingUser[0].username) {
            throw "Error retrieving the user initiating the invitiation. Are they active?"
        }
        initiatingUser = initiatingUser[0]
        from = initiatingUser.username
        if (initiatingUser.name) {
            from = initiatingUser.name + " (" + initiatingUser.username + ")"
        }

        // Get the user information if it exists
        user = await _findInvitedUser(event.email)
        if (user.name) {
            name = user.name
        } else if (event.name && event.name.length>0) {
            name = event.name
        }

        // Get the Group
        group = await _getInviteGroup(initiatingUser, event.group, user.email)
        
        // If the user exists, make sure the user is not already a member of the group (If not a friend request)
        if (!group.friend) {
            if (user && user.email && group && group.members && Array.isArray(group.members)) {
                for (let index = 0; index < group.members.length; index++) {
                    const member = group.members[index];
                    if (member._id === user._id && member.active === true) {
                        throw "The user is already a member of the group"
                    }
                }    
            } else {
                throw "Invalid user and/or group for invitation to be created."
            }
        }

        let tokenData = {
            name: name,
            group: {
                _id: group._id,
                name: group.name,
                friend: group.friend
            },
            from: from
        }
        console.info("user", user)
        if (user) {
            tokenData._id = user._id,
            tokenData.email = user.email
            tokenData.username = user.username
        } else {
            tokenData.email = email
        }

        // Generate token
        let token = LAYER.generateToken(tokenData);

        // Construct link for email
        let link = LAYER.BASE_URL + "/#/invitation/"+token;

        // ***** HTML *****

        let html = '<img src="https://yama-chat.vercel.app/icons/logo-login.png" alt= "Yama logo" width="128" height="87">'
        if (tokenData.group.friend) {
            html += '<h1>YaMa Friend Invite</h1><p>Hello ' + tokenData.name + '!</p><p>You have a friend invite from "<strong>' + tokenData.from + '</strong>" on YaMa.</p>';

        } else {
            html += '<h1>YaMa Invitation</h1><p>Hello ' + tokenData.name + '!</p><p>You have been invited to join the "<strong>' + tokenData.group.name + '</strong>" group on YaMa.</p>';
        }
        if (message) {
            html += "<p>" + message + "</p>"
        }
        html += '<table align="center" border="0" cellpadding="0" cellspacing="0" style="border-collapse:separate;line-height:100%;"><tr><td align="center" bgcolor="#CDB96A" style="border:none;border-radius:8px;cursor:auto;padding:9px 18px;background:#CDB96A;" valign="middle"><a href="'+link+'" style="background:#CDB96A;color:#000000;font-family:Helvetica, sans-serif;font-size:18px;font-weight:800;line-height:120%;Margin:0;text-decoration:none;text-transform:none;" target="_blank">Accept Invite!</a></td></tr></table>';

        // ***** TEXT *****

        let text
        if (tokenData.group.friend) {
            text = "YaMa Friend Invite\nHello " + tokenData.name + ", you have a friend invite from '" + tokenData.from + "' on YaMa.\n"
        } else {
            text = "YaMa Group Invitation\nHello " + tokenData.name + ", you have been invited to join the '" + tokenData.group.name + "' group on YaMa.\n"
        }
        if (message) {
            text += message + "\n"
        }
        text += "Click or copy the following link to your browser to accept your invitation!\n" + link

        let subject = "YaMa "
        if (tokenData.group.friend) {
            subject += "friend request from " + tokenData.from
        } else {
            subject += "group invitation: " + tokenData.group.name
        }
        if (!tokenData.email.endsWith("test.com") && !tokenData.email.endsWith("test-users.com")) {
            response = await LAYER.sendEmail(tokenData.email, subject, html, text);
        } else {
            response.error = "Test User - Email not sent."
        }
        response.token = token
    
    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}


async function _findInvitedUser(email) {
    let user = {}
    if (email) {
        if (LAYER.EMAIL_REGEX.test(email)) {
            // Check if user already exists
            user.email = email.toLowerCase()
            let users = await LAYER.getUsers({
                email: user.email,
                active: true
            }, {
                email: 1,
                username: 1,
                name: 1
            });
            if (users && Array.isArray(users) && users.length==1) {
                user = users[0];
            }
        } else {
            throw "Invalid email address received for the invitation request."
        }
    } else {
        throw "No user email received for the invitation request.";
    }
    return user
}

async function _getInviteGroup(initiatingUser, inviteGroup, email) {
    let group
    if (inviteGroup) {
        let groups = await LAYER.getGroups({
            _id: LAYER.convertToObjectId(inviteGroup),
            active: true
        }, {
            name: 1,
            members: 1,
            friend: 1
        });
        if (!groups || !Array.isArray(groups) || groups.length!==1) {
            throw "Invalid group ID for the invitation or group is not active.";
        }
        group = groups[0];
    } else {
        // Friend invite
        // Check if the friends group already exists (Either user could have been the invitor)
        let groupName = [
            "FRIEND$" + initiatingUser.email + '/' + email,
            "FRIEND$" + email + "/" + initiatingUser.email
        ]
        let existingGroup = await LAYER.getGroups({
            friend: true,
            $or: [ 
                { name: groupName[0] }, 
                { name: groupName[1] }
            ] 
        }, {
            _id: 1,
            active: 1,
            name: 1,
            members: 1,
            friend: 1
        })
        if (existingGroup && Array.isArray(existingGroup) && existingGroup.length > 0 && existingGroup[0]._id) {
            // Found an existing friend group.
            // If it is active, this friend request is invalid (as they already have the friend)
            // If not active, the user may have deleted the friend and are now re-inviting the to be friends
            if (existingGroup[0].active) {
                throw "Invalid friend request. The friend group requested already exists."
            }
            existingGroup[0].name = null // Don't need the group name for a friend invite
            group = existingGroup[0]
        } else {
            // New friend group
            let result = await LAYER.createGroup(initiatingUser._id, groupName[0], false, [], true)
            if (!result || !result._id || !result.name || !result.members || !result.friend) {
                throw "Error creating the friends group."
            }
            group = result
        }
    }
    return group
}

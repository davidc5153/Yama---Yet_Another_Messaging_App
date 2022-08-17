const LAYER = require('/opt/nodejs/layer');

/**
 * USER/POST/RESET
 * Allow a user to reset their password
 * 
 * @param {Object} event
 * 
 * EXPECTS:
 * 
 *      POST {
 *          "body": "{
 *              \"email\": "<users_email>"
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
 *          "body":"{\"result\": {MessageId: <Id_of_email_sent>, token: <invite_token>, email: <email_address>}, \"error\":<any_errors_encountered>}" 
 *      }
 * 
 */

exports.handler = async (event, context) => {
    console.log("USER/POST/RESET");
    console.dir(event);

    const ERROR_STRING = "Error resetting the password using the passed email address.";

    let response = {};
    let error = "";
    let code = 200;

    try {

        event = JSON.parse(event.body);

        // Extract passed information
        let email = event.email   // The email address to send the reset link/token 
        if (!LAYER.EMAIL_REGEX.test(email)) {
            console.error("Invalid email format received for password reset.");
            throw "Invalid email format."
        }

        // Get the user information
        let initiatingUser = await LAYER.getUsers({
            email: email,
            active: true
        }, {
            email: 1,
            username: 1,
            name: 1
        });
        if (!initiatingUser || !Array.isArray(initiatingUser) || initiatingUser.length != 1 || !initiatingUser[0]._id || !initiatingUser[0].email || !initiatingUser[0].username) {
            throw "No active user found with ther email address provided."
        }
        initiatingUser = initiatingUser[0]

        let tokenData = {
            _id: initiatingUser._id,
            name: initiatingUser.name,
            email: initiatingUser.email,
            username: initiatingUser.username
        }

        // Generate token
        let token = LAYER.generateToken(tokenData);
        console.info("TOKEN", token)

        // Construct link for email
        let link = LAYER.BASE_URL + "/#/reset/"+token;

        // ***** HTML *****

        let html = '<img src="https://yama-chat.vercel.app/icons/logo-login.png" alt= "Yama logo" width="128" height="87">'
        html += '<h1>YaMa Password Reset</h1><p>Hello ' + tokenData.name + '!</p><p>A YaMa password reset request has been received for this account.</p>';
        html += '<p>Click on the button below to reset your password.</p>';
        html += '<table align="center" border="0" cellpadding="0" cellspacing="0" style="border-collapse:separate;line-height:100%;"><tr><td align="center" bgcolor="#CDB96A" style="border:none;border-radius:8px;cursor:auto;padding:9px 18px;background:#CDB96A;" valign="middle"><a href="'+link+'" style="background:#CDB96A;color:#000000;font-family:Helvetica, sans-serif;font-size:18px;font-weight:800;line-height:120%;Margin:0;text-decoration:none;text-transform:none;" target="_blank">Reset Password</a></td></tr></table>';

        // ***** TEXT *****

        let text
        text = "YaMa Password Reset\nHello " + tokenData.name + ", a YaMa password reset request has been received for this account.\n"
        text += "Click or copy the following link to reset your password.\n" + link

        let subject = "YaMa Password Reset"
        response = await LAYER.sendEmail(tokenData.email, subject, html, text);
        response.token = token
        response.email = tokenData.email
    
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

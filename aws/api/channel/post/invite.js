const LAYER = require('/opt/nodejs/layer');

/**
 * CHANNEL/POST/INVITE
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
 *              \"group\": <group_ID>, 
 *              \"channel\": "<channel_ID>",
 *              \"user\": "<user_ID>",
 *              \"message\": "<optional_message>"
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
 *          "body":"{\"result\": <token>, \"error\":<any_errors_encountered>}" 
 *      }
 * 
 */
exports.handler = async (event, context) => {
    console.log("CHANNEL/POST/INVITE");
    console.dir(event);

    const ERROR_STRING = "Error processing the requested channel invite.";

    let response = {};
    let error = "";
    let code = 200;

    try {

        // Extract _id from token and check user is active
        let _id = LAYER.getAuthToken(event)
        
        event = JSON.parse(event.body);

        // Extract passed name, avatar and group (where avatar is optional)
        let group
        let channel;
        let user;
        let message = event.message;

        // Group
        if (event.group) {
            let groups = await LAYER.getGroups({
                _id: LAYER.convertToObjectId(event.group),
                active: true
            });
            if (!groups || !Array.isArray(groups) || groups.length!==1) {
                throw "Invalid group ID for channel invitation or group is not active.";
            }
            group = groups[0];
        } else {
            throw "No group ID received for channel invitation.";
        }

        // Channel
        if (event.channel) {
            let channels = await LAYER.getUnparsedChannels({
                _id: LAYER.convertToObjectId(event.channel),
                active: true
            });
            if (!channels || !Array.isArray(channels) || channels.length!==1) {
                throw "Invalid channel ID for channel invitation or channel is not active.";
            }
            channel = channels[0];
        } else {
            throw "No channel ID received for channel invitation.";
        }
        
        // user
        if (event.user) {

            let users = await LAYER.getUsers({
                _id: LAYER.convertToObjectId(event.user),
                active: true
            });
            if (!users || !Array.isArray(users) || users.length!==1) {
                throw "Invalid user ID for channel invitation or user is not active.";
            }
            user = users[0];
        } else {
            throw "No user ID received for channel invitation.";
        }
        
        // Genertate token
        let token = LAYER.generateToken({
            _id: user._id,
            group: group._id,
            channel: channel._id
        });

        // Construct link for email
        let link = LAYER.BASE_URL + "/#/invitation/"+token;

        let html = "<h1>Channel Invitation</h1><p>Link: " + link + "</p><p>Message: </p>"+message 
        let text = "Channel Invitation.\nLink: "+link+".\nMessage: " + message

        response = await LAYER.sendEmail("s3338610@student.rmit.edu.au", "Channel Invitation", html, text);
        response.token = token

    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

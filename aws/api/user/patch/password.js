const LAYER = require('/opt/nodejs/layer');

/**
 * USER/PATCH/PASSWORD
 * Update user's password
 * 
 * @param {Object} event
 * 
 * EXPECTS:
 * 
 *      POST {
 *             "header": {
 *              "Authorization": "Bearer <token>"
 *          },
 *          "body": "{
 *              \"email": "<email_address>", 
 *              \"password": "<new_password>"
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
 *          "body":"{\"result\":<user_collection_inc_token>, \"error\":<any_errors_encountered>}"
 *      }
 * 
 */

exports.handler = async (event, context) => {
    console.log("USER/POST/RESET");
    console.dir(event);

    const ERROR_STRING = "Error setting the new password for the user provided.";

    let response = {};
    let error = "";
    let code = 200;

    try {

        let userId = LAYER.getAuthToken(event)

        event = JSON.parse(event.body);

        if (!event.email || !LAYER.EMAIL_REGEX.test(event.email)) {
            console.error("Invalid email = "+event.email);
            throw "Invalid email received."
        }
        let email = event.email.toLowerCase()

        // Extract passed information
        let password = event.password 
        if (!password || !LAYER.PASSWORD_REGEX.test(password)) {
            throw "Invalid password received.";
        }
        response = await LAYER.setNewUserPassword(userId, email, password)

    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

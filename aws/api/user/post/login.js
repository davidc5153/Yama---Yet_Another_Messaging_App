const LAYER = require('/opt/nodejs/layer');

/**
 * USER/POST/LOGIN
 * 
 * @param {Object} event
 * 
 * EXPECTS:
 * 
 *      POST {
 *          "body": "{\"username\": <username_or_email>, \"password\": <password>}"
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
    console.log("USER/POST/LOGIN");
    console.dir(event);

    const ERROR_STRING = "Error signing in the user with the supplied details.";

    let response = {};
    let error = "";
    let code = 200;

    try {
        event = JSON.parse(event.body);

        // Extract passed username/email and password
        let email = event.username; // assume username passed is an email
        let username;
        if (!LAYER.EMAIL_REGEX.test(email)) {
            console.warn("Invalid email received for signin. Assuming username has been sent.");
            username = email;
            email = null;
        } else {
            email = email.toLowerCase()
        }

        let password = event.password;
        if (!password) {
            throw "Invalid password received for signin.";
        }

        response = await LAYER.login(email, username, password);

    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

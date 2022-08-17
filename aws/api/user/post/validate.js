const LAYER = require('/opt/nodejs/layer');

/**
 * USER/POST/VALIDATE
 * Validates the user's credentials without logging them in or creating/refreshing the token
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
 *          "body":"{\"result\": { \"_id\": \"<user_id>\"}, \"error\":<any_errors_encountered>}"
 *      }
 * 
 */
exports.handler = async (event, context) => {
    console.log("USER/POST/VALIDATE");
    console.dir(event);

    const ERROR_STRING = "Error validating the user with the supplied details.";

    let response = false;
    let error = "";
    let code = 200;

    try {
        event = JSON.parse(event.body);

        // Extract passed username/email and password
        let email = event.username; // assume username passed is an email
        let username;
        if (!LAYER.EMAIL_REGEX.test(email)) {
            console.warn("Invalid email received for validation. Assuming username has been sent.");
            username = email;
            email = null;
        } else {
            email = email.toLowerCase()
        }

        let password = event.password;
        if (!password) {
            throw "Invalid password received for validation.";
        }

        let result = await LAYER.validate(email, username, password);

        if (result && result._id && result.active===true) {
            response = {
                _id: result._id
            }
        } else {
            throw "User not found or is inactive."
        }
    
    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

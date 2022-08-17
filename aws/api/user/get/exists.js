const LAYER = require('/opt/nodejs/layer');

/**
 * USER/GET/EXISTS
 * 
 * @param {Object} event
 * 
 * EXPECTS:
 * 
 *      GET {
 *          "queryStringParameters": {
 *             username": "test@test.com"   // Username or email address
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
 *          "body":"{\"result\": <true/false>, \"error\":<any_errors_encountered> }"
 *      }
 * 
 */
exports.handler = async (event, context) => {
    console.log("USER/GET/EXISTS");
    console.dir(event);

    const ERROR_STRING = "Error searching for the existance of the passed username/email.";

    let response = false;
    let error = "";
    let code = 200;

    try {

        let username;

        if (event.queryStringParameters) {
            username = event.queryStringParameters.username;
        }         
        if (!username) {
            throw "Invalid query parameters passed to the API";
        }

        // Check if username passed is an email address
        let email = false;
        if (LAYER.EMAIL_REGEX.test(username)) {
            email = true;
        }

        // Try and find user
        let userFound;
        if (email) {
            userFound = await LAYER.getUsers({
                email: username.toLowerCase()
            });
        } else {
            userFound = await LAYER.getUsers({
                username: {$regex: "^"+username+"$", $options: "i"}
            });

        }
        // Return true if the user has been found
        response = (userFound && Array.isArray(userFound) && userFound.length > 0);

    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

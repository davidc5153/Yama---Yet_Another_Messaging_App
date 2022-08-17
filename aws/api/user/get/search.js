const LAYER = require('/opt/nodejs/layer');

/**
 * USER/GET/SEARCH
 * Search for a "public" user matching a passed username or email address
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
 *              username": "test@test.com",     // Username, name or email address
 *              group: <groud_id>               // OPTIONAL: The group ID - existing members are filter from the results 
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
 *          "body":"{\"result\": [<user_objects>], \"error\":<any_errors_encountered> }"
 *      }
 * 
 */
exports.handler = async (event, context) => {
    console.log("USER/GET/SEARCH");
    console.dir(event);

    const ERROR_STRING = "Error searching for users based on the passed username/email.";

    let response = [];
    let error = "";
    let code = 200;

    try {

        let username;
        let group;

        if (event.queryStringParameters) {
            username = event.queryStringParameters.username;
            group = event.queryStringParameters.group;
        }         
        if (!username) {
            throw "Invalid query parameters passed to the API";
        }

        // Search and return the users found
        response = await LAYER.searchUsers(username, group, {
            active: 1,
            admin: 1,
            avatar: 1,
            email: 1,
            username: 1,
            name: 1
        })

    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

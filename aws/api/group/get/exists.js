const LAYER = require('/opt/nodejs/layer');

/**
 * GROUP/GET/EXISTS
 * 
 * @param {Object} event
 * 
 * EXPECTS:
 * 
 *      GET {
 *          "queryStringParameters": {
 *             "name": "<group_name>"
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
    console.log("GROUP/GET/EXISTS");
    console.dir(event);

    const ERROR_STRING = "Error searching for the existance of the passed group name.";

    let response = false;
    let error = "";
    let code = 200;

    try {

        let name;

        if (event.queryStringParameters) {
            name = event.queryStringParameters.name;
        }         
        if (!name) {
            throw "Invalid query parameters passed to the API";
        }

        // Try and find user
        let groupFound = await LAYER.getGroups({
                name: name
        });

        // Return true if the user has been found
        response = (groupFound && Array.isArray(groupFound) && groupFound.length > 0);

    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

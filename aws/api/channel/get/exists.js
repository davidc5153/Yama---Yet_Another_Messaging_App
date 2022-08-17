const LAYER = require('/opt/nodejs/layer');

/**
 * CHANNEL/GET/EXISTS
 * 
 * @param {Object} event
 * 
 * EXPECTS:
 * 
 *      GET {
 *          "queryStringParameters": {
 *             "group": "<group_ID>"
 *             "name": "<channel_name>"
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
    console.log("CHANNEL/GET/EXISTS");
    console.dir(event);

    const ERROR_STRING = "Error searching for the existance of the passed channel name.";

    let response = false;
    let error = "";
    let code = 200;

    try {

        let groupId;
        let name;
        if (event.queryStringParameters) {
            groupId = event.queryStringParameters.group;
            name = event.queryStringParameters.name;
            if (!groupId || !name) {
                throw "Invalid query parameters passed to the API";
            }
        } else {
            throw "No valid query parameters have been passed."
        }

        // Try and find the channel within the group
        let channelFound = await LAYER.getUnparsedChannels({
            group: LAYER.convertToObjectId(groupId),
            name: name
        });

        // Return true if the user has been found
        response = (channelFound && Array.isArray(channelFound) && channelFound.length > 0);

    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

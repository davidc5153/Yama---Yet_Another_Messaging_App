const LAYER = require('/opt/nodejs/layer');

/**
 * BUCKET/GET/URL
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
 *              "type": <mimeType> 
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
 *          "body":"{
 *              \"result\": {
 *                              url: <The_url_for_the_upload>,
 *                              filename: <file_name_of_the_file_to_be_uploaded>
 *              },   
 *              \"error\": <any_errors_encountered>
 *      }
 *
 */
exports.handler = async (event, context) => {
    console.log("BUCKET/GET/URL");
    console.dir(event);

    const ERROR_STRING = "Error retrieving bucket upload URL.";

    let response = [];
    let error = "";
    let code = 200;

    try {

        // Validate token and check user is active
        let userId = LAYER.getAuthToken(event)

        let type;

        if (event.queryStringParameters) {
            type = event.queryStringParameters.type;
        } else {
            throw "Invalid query parameters."
        }         

        response = await LAYER.getAudioUloadUrl(userId, type)


    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

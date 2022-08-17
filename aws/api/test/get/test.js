const LAYER = require('/opt/nodejs/layer'); // Lambda layer shared code
const REGION = process.env.REGION

/**
 * TEST/GET/TEST
 *  
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 * @param {Object} context
 *
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 * 
 */
exports.handler = async(event, context) => {
    console.log("TEST/GET/TEST");
    console.dir(event);

    let test = await LAYER.test();

    let response = {
        statusCode: 200,
        isBase64Encoded: false,
        headers: {
            "Access-Control-Allow-Origin": "*"
        },
        body: {
            result: "OK",
            region: REGION,
            test: JSON.stringify(test),
            error: null
        }
    };

    // Return the HTTP response
    return response;
}
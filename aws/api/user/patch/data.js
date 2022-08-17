const LAYER = require('/opt/nodejs/layer');

/**
 * USER/PATCH/DATA
 * Update user's data
 * 
 * @param {Object} event
 * 
 * EXPECTS:
 * 
 *      POST {
 *             "header": {
 *              "Authorization": "Bearer <token>"
 *          },
 *          "body": "{                          // ALL Parameters are OPTIONAL
 *              \"email": <new_email>,         // UNIQUE
 *              \"name\": <new_name>, 
 *              \"username\": <new_username>,   // UNIQUE
 *              \"dob"\: <new_dob>, 
 *              \"phone\": <new_phone>, 
 *              \"avatar\": <custom_avatar_id>, 
 *              \"active\": <true/false>,
 *              \"public\": <true/false>,
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
 *          "body":"{\"result\":<user_collection>, \"error\":<any_errors_encountered>}"
 *      }
 * 
 */

exports.handler = async (event, context) => {
    console.log("USER/POST/DATA");
    console.dir(event);

    const ERROR_STRING = "Error setting the new data for the user provided.";

    let response = {};
    let error = "";
    let code = 200;

    try {

        let userId = LAYER.getAuthToken(event)
        let userData = {}

        event = JSON.parse(event.body);

        // *** email *** UNIQUE
        if (event.hasOwnProperty('email')) {
            if (LAYER.EMAIL_REGEX.test(event.email)) {
                userData.email = event.email.toLowerCase()
            } else {
                console.error("Invalid email = "+event.email);
                throw "Invalid email received."    
            }
            let currentUsers = await LAYER.getUsers({
                email: userData.email
            });
            if (currentUsers.length > 0) {
                throw "A user with an email of '" + userData.email + "' already exists."
            } 
        }
        // *** username *** UNIQUE
        if (event.hasOwnProperty('username')) {
            if (event.username < LAYER.MIN_USERNAME_LENGTH) {
                console.error("Registration: Invalid username = " + event.username);
                throw "Invalid username. Usernames must be at least "+LAYER.MIN_USERNAME_LENGTH+" characters long."
            }
            let currentUsers = await LAYER.getUsers({
                    username: {$regex: "^"+event.username+"$", $options: "i"}

            });
            if (currentUsers.length > 0) {
                throw "A user with a username of '" + event.username + "' already exists."
            }
            userData.username = event.username
        } 
        // *** name *** 
        if (event.hasOwnProperty('name')) { userData.name = event.name }
        // *** dob ***
        if (event.hasOwnProperty('dob')) { 
            try {
                let newDob = new Date(event.dob)
                userData.dob = newDob
            } catch (err) {
                console.warn("Error parsing DOB")
            }
        }
        // *** phone *** 
        if (event.hasOwnProperty('phone')) { userData.phone = event.phone }
        // *** avatar *** 
        if (event.hasOwnProperty('avatar')) { userData.avatar = event.avatar }
        // *** active *** 
        if (event.hasOwnProperty('active') && event.active === false ) { userData.active = false } // Can only set active to false
        // *** public *** 
        if (event.hasOwnProperty('public') && ( event.public === true || event.public === false ) ) { userData.public = event.public }


        response = await LAYER.setNewUserData(userId, userData)

    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

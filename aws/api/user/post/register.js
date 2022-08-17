const LAYER = require('/opt/nodejs/layer');

/**
 * USER/POST/REGISTER
 * 
 * @param {Object} event
 * 
 * EXPECTS:
 * 
 *      POST {
 *          "body": "{
 *              \"username\": <username>, 
 *              \"email\": <email>,
 *              \"first_name\": <first_name>,
 *              \"surname\": <surname>,
 *              \"public\": true/false,
 *              \"dob\": <YYYY-MM-DD | null>,
 *              \"avatar\": <Base64(avatar) | null>,
 *              \"password\": <password>
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
 *          "body":"{\"result\": <UserObject>, \"error\":<any_errors_encountered>}"
 *      }
 * 
 */
exports.handler = async (event, context) => {
    console.log("USER/POST/REGISTER");
    console.dir(event);

    const ERROR_STRING = "Error registering the user with the supplied details.";

    let response = {};
    let error = "";
    let code = 200;

    try {
        event = JSON.parse(event.body);

        // Extract passed username and email to see if any user's already exist with those details
        if (!event.email || !LAYER.EMAIL_REGEX.test(event.email)) {
            console.error("Registration: Invalid email = "+event.email);
            throw "Invalid email received for registration."
        }
        event.email = event.email.toLowerCase()
        if (!event.username || event.username < LAYER.MIN_USERNAME_LENGTH) {
            console.error("Registration: Invalid username = " + event.username);
            throw "Invalid username received for registration."
        }
        let currentUsers = await LAYER.getUsers({
            $or: [
                { username: {$regex: "^"+event.username+"$", $options: "i"} },
                { email: event.email }
            ]
        });
        if (currentUsers.length > 0) {
            throw "A user with a username of '" + event.username + "' and/or email of '" + event.email + "' already exists."
        }

        if (!event.public) {
            event.public = true;
        }

        let requestJson = {
            active: false,
            username: event.username,
            name: event.name,
            email: event.email,
            phone: event.phone,
            public: event.public,
            avatar: event.avatar,
            groups: [],
            unread: [],
            pubKey: event.pubKey,
            privKey: event.privKey
        }

        // Parse DOB
        if (event.dob) {
            try{
                requestJson.dob = new Date(event.dob);
            } catch (err) {
                console.warn("Error parsing DOB", event.dob);
            }
        }
        // Check password is valid
        if (!event.password || !LAYER.PASSWORD_REGEX.test(event.password)) {
            throw "Invalid password received for registration.";
        }
        requestJson.password = event.password;        

        // Register the user
        let result = await LAYER.registerUser(requestJson);
        if (result) {
            delete requestJson.password 
            // requestJson.token = result // Token no longer generated on registration as user is not logged in automatically
            response = requestJson    
        } else {
            throw "Error registering the user and generating the authentication token"
        }
        
    } catch (err) {
        error = err.toString();
        code = 401;
        console.error(ERROR_STRING, error);
    }
    
    // Return the HTTP response
    return LAYER.constructHttpResponse(response, error, code);

}

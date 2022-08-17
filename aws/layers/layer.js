/**
 * Shared layer for access by all lambda functions 
 */

/****************************************************
 ******************* CONSTANTS **********************
 ****************************************************/

const CRYPTO = require('crypto');
const JWT = require('jsonwebtoken')
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY;
const SECRETS = require("./.secret");
const ACCESS_TOKEN_SECRET = SECRETS.getTokenSecret().ACCESS_TOKEN_SECRET;
const MONGODB = require("mongodb");
const AWS = require("aws-sdk");
const REGION = process.env.REGION;
AWS.config.update({ region: REGION })
const SES = new AWS.SESV2({apiVersion: '2019-09-27'});
const BUCKET = process.env.BUCKET;
const S3_BUCKET_LINK_EXPIRY = 1; // minute(s)
const BASE_URL = "https://yama-chat.vercel.app";
const EMAIL_SOURCE_ADDRESS = "s3338610@student.rmit.edu.au";

// https://stackoverflow.com/questions/46155/whats-the-best-way-to-validate-an-email-address-in-javascript
const EMAIL_REGEX = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

// https://stackoverflow.com/questions/19605150/regex-for-password-must-contain-at-least-eight-characters-at-least-one-number-a
const PASSWORD_REGEX = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/  // Min 8 letter password, with at least a special character, upper and lower case letters and a number

const MIN_USERNAME_LENGTH = 5;
const MAX_MESSAGES = 200;

/****************************************************
 **************** SHARED FUNCTIONS ******************
 ****************************************************/

// ********************* AUTH **********************

/**
 * Extracts and validates JWT Bearer token from the passed event header.
 * Throws on error.
 * 
 * @param {JSON} event 
 * 
 * @returns {string} UserID 
 */
 function getAuthToken(event) {

    if (!event.headers) {
        throw "Invalid Authorization header"
    }
    let authHeader = event.headers.Authorization;
    if (!authHeader) {
        throw "Token not found in Authorization header"
    }
    let authArray = authHeader.split(' ');
    if (authArray.length !== 2 || authArray[0] !== 'Bearer' || authArray[1].length === 0) {
        throw "Malformed token found in Authorization header"
    }

    // https://github.com/auth0/node-jsonwebtoken
    // Do not want to run async
    let userId;
    try {
        let tokenData = JWT.verify(authArray[1], ACCESS_TOKEN_SECRET);
        userId = tokenData._id;
    } catch (err) {
        throw "Valid Access Token Not Found."
    }
    return userId;
}

function decodeToken(token) {
    return JWT.decode(token)
}

/**
 * Generate a JWT token using the passed data
 * 
 * @param {JSON} data - Json data to be included in the token.
 *  
 * @returns accessToken
 */
function generateToken(data) {
    return JWT.sign(data, ACCESS_TOKEN_SECRET, { expiresIn: TOKEN_EXPIRY }); // Where ACCESS_TOKEN_SECRET is a 64-byte hex string
}

/**
 * Encrypts string password with salt.
 * 
 * @param {string} password
 *  
 * @returns {string} Encrypted password encoded as a hex string in the form <SALT>$<PASSWORD>. Returns NULL if no password passed.
 */
 function hashPassword(password, salt = null) {
    // Salt and hash password
    let returnPassword = null;
    if (password) {
        if (!salt) {
            salt = CRYPTO.randomBytes(16).toString('hex');
        }
        const PW = CRYPTO.pbkdf2Sync(password, salt, 2048, 32, 'sha512').toString('hex');
        returnPassword = salt + '$' + PW;
    }
    return returnPassword 
}

/**
 * 
 * @param {string|null} email 
 * @param {string|null} username 
 * @param {string} password in plain test (un-hashed)
 * 
 * @returns {JSON} User document inc token (password removed)
 */
async function login(email, username, password) {

    result = await validate(email, username, password)
    if (result.active !== true) {
        // The user may have just registered (active=false)
        // Then they click on the email verification link sent by AWS SES
        // So if they are verified, we can set (active=true) and let them log in
        let emailIdentity = await getEmailIdentity(result.email)
        if (emailIdentity.IdentityType == "EMAIL_ADDRESS" && emailIdentity.VerifiedForSendingStatus === true) {
            // User has verified their email address - Set as active
            const COLLECTION = await getDBCollection('user');
            let updateActive = await COLLECTION.updateOne(
                {_id: result._id},
                {
                    $set: {active: true}
                }
            );
            if (updateActive && updateActive.acknowledged == true && updateActive.modifiedCount == 1) {
                result.active = true
            } else {
                throw "Error attempting to set active status to true."
            }
        } else {
            throw "Email addresses are required to be verified before access to YaMa can be granted. Please check your email (including spam) for an email from Amazon Web Services."
        }
    }

    // Update the user's token
    result.token = await updateToken(result._id);

    // Remove the Password from the returned result
    delete result.password;

    return result;
}

async function validate(email, username, password) {
    let result;
    const COLLECTION = await getDBCollection('user');
    if (username) {
        result = await COLLECTION.findOne({
            username: {$regex: "^"+username+"$", $options: "i"}
        });
    } else {
        result = await COLLECTION.findOne({
            email: email.toLowerCase()
        });
    }

    // Check password
    let hashedPassword;
    let existingPassword;
    if (result && result.password) {
        // Parse existing password and salt from the DB collection
        let existingSalt;
        try {
            let existingPasswordArray = result.password.split('$'); 
            existingSalt = existingPasswordArray[0];
            existingPassword = existingPasswordArray[1];
        } catch (err) {
            console.err('Error parsing existing password.', err);
            throw "Existing password is invalid";
        }
        // Create hashed version of the passed password 
        try {
            hashedPassword = hashPassword(password, existingSalt).split('$')[1];
        } catch (err) {
            console.err('Error hashing entered password.', err);
            throw "Password hash is invalid.";
        }
    } else {
        throw "No user found with the username/email provided.";
    }
    // Check the passwords match
    if (hashedPassword !== existingPassword) {
        throw "Invalid password provided.";
    }
    return result
}



/**
 * Calculate a fresh JWT token, save to DB, and return the generated token
 *   
 * @param {ObjectId} _id
 *  
 * @returns {String} The generated token
 *  
 */
async function updateToken(_id) {
    let token = generateToken({_id: _id}); 
    const COLLECTION = await getDBCollection('user');
    await COLLECTION.updateOne(
        {_id: _id},
        {
            $set: {token: token}
        }
    );
    return token;
}

// ********************* USER *********************

/**
 * Return users found to match the passed parameters.
 * NB:  Returns both active and non-active users. 
 *      Include {active: true} in params to limit to active users only.
 * 
 * @param {JSON} params in MongoDB query format. 
 *  
 * @returns {ARRAY} An array of users that have been found
 *  
 */
async function getUsers(params, projection=null) {
    const COLLECTION = await getDBCollection('user');
    if (projection) {
        return await COLLECTION.find(params).project(projection).toArray()
    }
    return await COLLECTION.find(params).toArray();
}

async function searchUsers(username, group=null, projection=null) {
    if (!username) {
        throw "Search string not provided"
    }
    // Remove any starting/ending wildcard characters '*'
    while(username.charAt(0) === '*') {
        username = username.substring(1);
    }
    while(username.charAt(username.length-1) === '*') {
        username = username.substring(0,username.length-1);
    }

    if (username.length <= 3) {
        throw "Search string must be over 3 valid characters long"
    }
    
    const COLLECTION = await getDBCollection('user');
    const query = [
        {
            '$search': {
                'index': 'default', 
                'text': {
                    'query': '*' + username + '*', 
                    'path': {
                        'wildcard': '*'
                    }
                }
            }
        }, {
            '$match': {
                'active': true, 
                'public': true
            }
        }
    ]

    let result
    if (projection) {
        result = await COLLECTION.aggregate(query).project(projection).toArray()
    }
    result = await COLLECTION.aggregate(query).toArray()

    if (group && result && Array.isArray(result) && result.length > 0) {
        // Get group members and filter from the results
        let groupMembers = await getGroups({
            _id: MONGODB.ObjectId(group)
        }, {
            _id: 0,
            members: 1
        })
        if (groupMembers && Array.isArray(groupMembers) && groupMembers.length==1 && groupMembers[0].members && Array.isArray(groupMembers[0].members) && groupMembers[0].members.length > 0) {

            let returnResult = []
            for (let index = 0; index < result.length; index++) {
                const user = result[index];
                if (userIsMember(groupMembers[0].members, user._id.toString())===false) {
                    returnResult.push(user)
                } else {
                    console.warn("User excluded from search results as they exist in the group", user._id)
                }
            }
            result = returnResult
        }

    }
    return result
}

/**
 * Insert a user with the passed userData into the database
 * 
 * @param {JSON} userData in the form:
 *      {
 *          username: <username>, 
 *          email: <email>,
 *          first_name: <first_name>,
 *          surname: <surname>,
 *          public: true/false,
 *          dob: <YYYY-MM-DD | null>,
 *          avatar: <Base64(avatar) | null>,
 *          password: <password>
 *      }
 *  
 * @returns {JSON} The user inserted into the DB (inc _id). NULL on error.
 * 
 */
async function registerUser(userData) {
    let password = userData.password;
    userData.email = userData.email.toLowerCase()
    userData.password = hashPassword(password);
    const COLLECTION = await getDBCollection('user');
    let result = await COLLECTION.insertOne(userData);
    if (result.acknowledged) {
        let identityResult
        try {
            identityResult = await createEmailIdentity(userData.email)
        } catch (err) {
            if (err.code == "AlreadyExistsException") {
                // User already exists as an email Identity - Delete them and try again
                await deleteEmailIdentity(userData.email)
                identityResult = await createEmailIdentity(userData.email)
            } else {
                throw err
            }
        }
        if (identityResult && identityResult.IdentityType == "EMAIL_ADDRESS") {
            if (identityResult.VerifiedForSendingStatus === true) {
                throw "The email address has already been verified."
            }
            delete userData.password
            return userData
        } else {
            throw "Error trying to create an email identity."
        }
    }
    return null;
}

async function addUserToChannel(userId, memberId, channelId, admin=false) {

    let userObjId = MONGODB.ObjectId(userId)
    let memberObjId = MONGODB.ObjectId(memberId)
    let channelObjId = MONGODB.ObjectId(channelId)

    const COLLECTION = await getDBCollection('channel');
    let check = await COLLECTION.aggregate([
        {
          '$match': {    // Channel exists & is active
            '_id': channelObjId,
            'active': true,
            'members': {
                $elemMatch: {
                    '_id': userObjId,    // User making the request is a members of the channel
                    'active': true,                     // and is active
                    'admin': true                       // and is admin
                }
            }
          }
        }, {
          '$addFields': {
            'memberId': memberObjId
          }
        }, {
          '$lookup': {  // Groups exists
            'from': 'group', 
            'localField': 'group',          
            'foreignField': '_id', 
            'as': 'groupInfo'
          }
        }, {
          '$lookup': {      // New member exists
            'from': 'user', 
            'localField': 'memberId', 
            'foreignField': '_id', 
            'as': 'newMember'
          }
        }, {
            '$lookup': {      // Current members
              'from': 'user', 
              'localField': 'members._id', 
              'foreignField': '_id', 
              'as': 'pubKey'
            }
        }, {
          '$match': {
            'newMember.active': true, // Member is active
            'groupInfo.active': true, // Group is activce
            'groupInfo.members._id': memberObjId // Member is in the group hosting the channel
          }
        }, {
          '$project': {
            'name': 1, 
            'group': 1, 
            'memberId': 1,
            'members': 1,
            'newMember.username': 1,
            'newMember.pubKey': 1,
            'pubKey._id': 1,
            'pubKey.pubKey': 1
          }
        }
    ]).toArray()

    if (!check || !Array.isArray(check) || check.length != 1 || !check[0]._id || 
        !check[0].newMember || !Array.isArray(check[0].newMember) || check[0].newMember.length != 1 || 
        !check[0].newMember[0].username || !check[0].newMember[0].pubKey
    ) {
        throw "The member can not be added to the channel."
    }
    
    // Check if the passed member is not already a member of the channel
    let match = check[0].members.findIndex( (currentMember) => {
        return ( (currentMember._id.toString() == memberId) && (currentMember.active === true) )
    })
    if (match >= 0) {
        throw "The passed member is already a member of the channel"
    }

    let newMember = {
        _id: memberObjId,
        active: true,
        admin: admin
    }

    // Add or update the new member to active in the channel
    await COLLECTION.updateOne({
        _id: channelObjId, 
        active: true
    }, {
        '$pull': {
            'members': {
                '_id': memberObjId      // Remove if it exists
            }
        }
    });
    let result = await COLLECTION.updateOne({
        _id: channelObjId, 
        active: true
    }, {
        '$push': {
            'members':newMember,        // Add as active member
            'messages': {
                _id: new MONGODB.ObjectId(),
                active: true,
                user: memberObjId,
                username: check[0].newMember[0].username,
                date: new Date(),
                message: "'" + check[0].newMember[0].username + "' is now a member of the channel!",
                reactions: []
            }
        }
    });
    if (result && result.acknowledged == true && result.modifiedCount == 1) {
        // So we don't have to make another call to MongoDB, parse the member array initially read for return

        // Check if the member being added already existed in the initial read of the members
        let existing = check[0].members.find((member) => {
            return (member._id.equals(memberObjId))
        })
        if (existing) {
            // If the member existed already, adding them would have made them active, so we set that for return
            existing.active = true
        } else {
            // New member - Add them to the initial array (as they would have been added in the above DB command)
            check[0].members.push(newMember)
        }
        // Now add the pubKey for each member and filter out members who are active=false 
        let returnMemberArray = []
        for (let index = 0; index < check[0].members.length; index++) {
            const member = check[0].members[index];
            if (member.active===true && !member.pubKey) {
                let pubKey = check[0].pubKey.find( (keyMember) => {
                    return ( member._id.equals(keyMember._id))
                })
                if (pubKey) {
                    member.pubKey = pubKey.pubKey
                }
                returnMemberArray.push(member)
            }
        }
        return returnMemberArray
    } else {
        throw "Error trying to add the member to the channel."
    }
}


async function removeUserFromChannel(userId, memberId, channelId) {
    let userObjId = MONGODB.ObjectId(userId)
    let memberObjId = MONGODB.ObjectId(memberId)
    const COLLECTION = await getDBCollection('channel');
    let check = await COLLECTION.aggregate([
        {
          '$match': {    // Channel exists & is active
            '_id': MONGODB.ObjectId(channelId),
            'active': true,
            'members': {
                $elemMatch: {
                    '_id': userObjId,    // User making the request is a member of the channel
                    'active': true,                     // and is active
                    '$or': [
                        { 'admin': true },               // and is admin OR user requesting is the user to be removed 
                        { "_id": memberObjId }
                    ]
                }
            }
          }
        }, {
            '$match': {
              'members': {
                '$elemMatch': {
                  '_id': memberObjId,    // Member is a member of the channel 
                  'active': true,                       // They are active
                  'admin': false                        // and NOT admin
                }
              }
            }
        }, {
          '$addFields': {
            'memberId': memberObjId
          }
        }, {
          '$lookup': {      // Get Member details
            'from': 'user', 
            'localField': 'memberId', 
            'foreignField': '_id', 
            'as': 'memberInfo'
          }
        }, {
          '$project': {
            'name': 1, 
            'group': 1, 
            'memberId': 1,
            'memberInfo.username': 1,
            'members': 1
          }
        }
    ]).toArray()

    if (!check || !Array.isArray(check) || check.length != 1 || !check[0]._id || 
        !check[0].memberInfo || !Array.isArray(check[0].memberInfo) || check[0].memberInfo.length != 1 || 
        !check[0].memberInfo[0].username
    ) {
        throw "The member can not be removed from the channel."
    }
    
    // Remove the member from the channel
    let result = await COLLECTION.updateOne(
        {   
            _id: MONGODB.ObjectId(channelId), 
            active: true,
            'members._id': MONGODB.ObjectId(memberId)
        }, { 
            $set: {
                'members.$.active': false
            },  
            $push: { 
                messages: {
                    _id: new MONGODB.ObjectId(),
                    active: true,
                    user: MONGODB.ObjectId(memberId),
                    username: check[0].memberInfo[0].username,
                    date: new Date(),
                    message: "'" + check[0].memberInfo[0].username + "' has left the channel!",
                    reactions: []
                }
            }
        }
    );

    if (result && result.acknowledged == true && result.modifiedCount == 1) {
        check[0].members = check[0].members.filter( (member) => {
            return member._id.toString() !== memberId
        })
        return check[0].members
    } else {
        throw "Error trying to remove the member from the channel."
    }
}

async function setNewUserPassword(userId, email, password) {
    let hashedPassword = hashPassword(password);
    const COLLECTION = await getDBCollection('user');
    let result = await COLLECTION.updateOne({
        '_id': MONGODB.ObjectId(userId),
        'email': email,
        'active': true
    },{
        '$set': {
            'password': hashedPassword
        }
    });
    if (result && result.acknowledged && result.modifiedCount == 1) {
        // Password updated successfuly - Now login
        return await login(email, null, password);
    } else {
        throw "Error modifying password."
    }

}

/**
 * 
 * @param {string} userId The user token of the user making the request to change their own data 
 * @param {*} userData An object containing the data to be change
 *      // ALL Parameters are OPTIONAL
 *      {
 *              email: <new_email>,         // Must be a UNIQUE value passed
 *              name: <new_name>, 
 *              username: <new_username>,   // Must be a UNIQUE value passed
 *              dob: <new_dob>, 
 *              phone: <new_phone>, 
 *              avatar: <custom_avatar_id>, 
 *              active: <true/false>,
 *              public: <true/false>,
 *       }
 * 
 * @returns All 
 */
async function setNewUserData(userId, userData) {

    const COLLECTION = await getDBCollection('user');
    let userObjId = MONGODB.ObjectId(userId)
    // If required, make sure new username/email are unique 
    if (userData.username) {
        let found = await COLLECTION.findOne({ username: {$regex: "^"+userData.username+"$", $options: "i"} }, {_id: 1})
        if (found && found._id) {
            throw "A user already exists with that username."
        }
    } 
    if (userData.email) {
        userData.email = userData.email.toLowerCase()
        let found = await COLLECTION.findOne({ email: userData.email }, {_id: 1})
        if (found && found._id) {
            throw "A user already exists with that email address."
        }
    }

    let result = await COLLECTION.updateOne({_id: userObjId, active: true} , { '$set': userData })
    if (result && result.acknowledged && result.modifiedCount == 1) {
        // User has been modified, now read all the current user details for return  
        return (await COLLECTION.findOne({
            _id: userObjId
        }, {
            active: 1,
            avatar: 1,
            username: 1,
            public: 1,
            dob: 1,
            email: 1,
            groups: 1,
            token: 1,
            phone: 1,
            name: 1,
            unread: 1,
            privKey: 1,
            puKey: 1
        }))
    } else {
        throw "Error trying to update user data."
    }
}

// ********************* GROUP *********************

/**
 * Returns a list of groups matching the passed params
 * Inc active === false
 *  
 * @param {JSON} params The parameters to pass to the find function
 *  
 * @returns {Array} An array of the found groups 
 */
 async function getGroups(params, projection=null) {
    const COLLECTION = await getDBCollection('group');
    if (projection) {
        return await COLLECTION.find(params).project(projection).toArray()
    }
    return await COLLECTION.find(params).toArray()
}

/**
 * Insert the passed channel ObjectId into the group with the passed ObjectId
 * IE: push channel into the group.channels array
 * 
 * @param {ObjectId} group The ID of the group to add the channel to
 * @param {ObjectId} channel The ID of the channel to add to the group
 * 
 * @return {JSON} The result object of the update
 */
async function addChannelToGroup(group, channel) {
    const COLLECTION = await getDBCollection('group');
    let result = await COLLECTION.updateOne(
        { _id: group },
        { $push: { channels: channel } }
    )
    return result;
}

/**
 * Creates a group with the passed parameters
 *  - Checks that the user exists and is active
 *    
 * @param {String} userId The ID of the user creating the group 
 * @param {string} name The name of the group to be created
 * @param {Boolean} isPrivate If true this group is a private group
 * @param {[{String, Boolean, Boolean}]} members An array containing members objects to be intially added to the group as it is created. Fields are _id of member, if the member is active, and finally if the member should be an admin.
 *   Example input:
 *   [{"_id": "623bb78e3cb41fb72c936df3", active: true, admin: true}]
 *      NB - Additional fields that can be included for friends groups: "username" and "avatar"  
 * @param {Boolean} friend If true this is a friend group (avatar should then be null)
 * @param {String} avatar The base64 encoded image to use as the avatar for the group
 */
async function createGroup(userId, name, isPrivate, members, friend = false, avatar = null) {
    
    // Check user exists and is active
    let userArray = await getUsers({
        _id: MONGODB.ObjectId(userId), 
        active: true 
    }, {
        username: 1,
        avatar: 1
    })
    if (!userArray || !Array.isArray(userArray) || userArray.length !== 1 || !userArray[0]._id) {
        throw "Invalid user or user is inactive."
    }

    // Check if group exists via name
    let groupArray = await getGroups({
        name: name,
    })
    if (groupArray && Array.isArray(groupArray) && groupArray.length > 0 && groupArray[0]._id) {
        throw "A group already exists with this name."
    }

    // Add the creator of the group as admin 
    let initialMember = [{
        _id: userArray[0]._id,
        active: true,
        admin: true
    }]
    if (friend) {
        initialMember[0].username = userArray[0].username,
        initialMember[0].avatar = userArray[0].avatar
    }

    // Need to iterate through each member and convert the string _id into ObjectId()
    let initialMemberExists = false
    if (members && Array.isArray(members)) {
        members.forEach(member => {
            if (member._id) {
                if (member._id === userId) {
                    initialMemberExists = true
                }
                member._id = MONGODB.ObjectId(member._id)
            } else {
                throw "Invalid member object found"
            }
        });    
    } else {
        members = []
    }
    if (!initialMemberExists) {
        members = initialMember.concat(members)
    }

    let params = {
        active: true,
        public: !isPrivate,
        name: name,
        members: members,
        avatar: avatar,
        channels: [],
        friend: friend
    }

    // Add the new group
    const COLLECTION = await getDBCollection('group')
    let result = await COLLECTION.insertOne(params);
    if (result.acknowledged && result.insertedId) {
        // Group insert success 
        // Add group._id to params and return params
        params._id = result.insertedId
        params.admin = true // User who created the group is always admin
    } else {
        throw "The group could not be successfully inserted"
    }

    // Add the group to each user's user.groups array
    const USERCOLLECTION = await getDBCollection('user')
    params.members.forEach(member => {
        USERCOLLECTION.updateOne(
            {"_id": member._id},
            { "$push": { 
                "groups" : params._id
            }}
        )
    })

    // Create a default channel with no name
    let initialChannel
    try {
        initialChannel = await createChannel(userId, null,  params._id, params.members); // No name or Avatar for default channel
        // createChannel() automatically adds the channel._id to the group.channels array
        params.channels.push(initialChannel._id)
    } catch (error) {
        throw "Unable to create initial channel. Error from channel creation: " + error
    }
    if (!initialChannel) {
        throw "Unable to create initial channel. Initial channel returned no input."
    }
    return params
}

async function searchGroups(name, member, friend=null) {
    let searchParams = []

    if (name) {
        searchParams.push({
            "$search": {
                "index": "GroupSearch",
                "text": {
                    "query": name,
                    "path": "name",
                    "fuzzy": {"maxEdits": 2.0}
                }                
            }
        })
    }

    let match = {
        "active": true,
        "public": true
    }


    if (member) {
        match.members = {
            "$elemMatch": {
              "_id": convertToObjectId(member),
              "active": true
            }
        }
    }

    if (friend === true || friend === false) {
        match.friend = {
            "friend": friend,
        }
    }

    searchParams.push({
        "$match": match
    })

    const COLLECTION = await getDBCollection('group');
    return await COLLECTION.aggregate(searchParams).toArray()
  
}

async function deactivateGroup(userId, groupId) {

    const COLLECTION = await getDBCollection('group')

    const groupObjId = MONGODB.ObjectId(groupId)

    // Check the channel exists, and is active
    // Check the user making the request is an admin of the channel    
    let foundGroups = await COLLECTION.find({
        '_id': groupObjId,
        'active': true,
        'members': {
          '$elemMatch': {
            '_id': MONGODB.ObjectId(userId), 
            'active': true, 
            'admin': true
          }
        }
    }, {
        '_id': 1
    }).toArray()

    if (!foundGroups || !Array.isArray(foundGroups) || foundGroups.length != 1) {
        throw "Invalid group. An active group where the user is an active administrator has not been found."
    }

    // Set channel.active = false
    let result = await COLLECTION.updateOne({
        '_id':  groupObjId
    }, {
        '$set': {
            'active': false
        }
    })

    if (result && result.acknowledged && result.modifiedCount == 1) {
        return true
    }
    return false
}

async function addUserToGroup(memberId, username, groupId, admin = false, friend = false) {

    let memberObjId = MONGODB.ObjectId(memberId)
    let groupObjId = MONGODB.ObjectId(groupId)

    let COLLECTION = await getDBCollection('group');

    // Check the requesting user is valid and the group is valid
    let check = await COLLECTION.aggregate([
        {
          '$match': {    // Group exists & is active
            '_id': groupObjId,
            'active': true,
            'friend': friend
          }
        }, {
          '$addFields': {
            'memberId': memberObjId
          }
        }, {
          '$lookup': {      // Member exists
            'from': 'user', 
            'localField': 'memberId', 
            'foreignField': '_id', 
            'as': 'memberInfo'
          }
        }, {
          '$project': {
            'name': 1, 
            'group': 1, 
            'memberId': 1,
            'memberInfo.username': 1,
            'memberInfo.avatar': 1,
            'members': 1
          }
        }
    ]).toArray()

    if (!check || !Array.isArray(check) || check.length != 1 || !check[0]._id || 
        !check[0].memberInfo || !Array.isArray(check[0].memberInfo) || check[0].memberInfo.length != 1 || 
        !check[0].memberInfo[0].username
    ) {
        throw "The member can not be added to the group."
    }
    
    // Check if the passed member is not already a member of the channel
    let match = check[0].members.findIndex( (currentMember) => {
        return ( (currentMember._id.toString() == memberId) && (currentMember.active) )
    })
    if (match >= 0) {
        throw "The passed member is already a member of the group"
    }

    let newMember = {
        _id: memberObjId,
        active: true,
        admin: admin
    }
    if (friend) {
        newMember.username = check[0].memberInfo[0].username
        newMember.avatar = check[0].memberInfo[0].avatar
    }
    // Add or update the member to be active in the group
    await COLLECTION.updateOne({  
        _id: groupObjId, 
        active: true
    }, {
        '$pull': {
            'members': {            
                '_id': memberObjId       // Remove if it exists
            }
        }
    });
    let result = await COLLECTION.updateOne({   
        _id: groupObjId, 
        active: true
    }, {
        '$push': {
            'members':newMember         // Add as active member
        }
    })

    if (result && result.acknowledged === true && result.modifiedCount === 1) {
        // Member added to the group, now add the group to the member
        const USERS = await getDBCollection('user');
        await USERS.updateOne({  
            _id: memberObjId
        }, {
            $pull: {
                groups: groupObjId       // Remove from user.groups if it exists
            }
        });
        let result2 = await USERS.updateOne(
            { 
                _id: memberObjId
            }, {
                $push: { 
                    groups: groupObjId  // Add in to user.groups
                }
            }                
        )
        if (result2 && result2.acknowledged === true && result2.modifiedCount === 1) {
            // Add a message to say that the user has joined the group
            COLLECTION = await getDBCollection('channel');
            await COLLECTION.updateOne(
                { 
                    group: groupObjId,
                    name: null
                },
                { $push: { 
                    messages: {
                        _id: new MONGODB.ObjectId(),
                        active: true,
                        user: memberObjId,
                        username: username,
                        date: new Date(),
                        message: "'" + username + "' has accepted the invitation to join the group!",
                        reactions: []
                    }
                }}
            )
        } else {
            console.error("Error trying to a message to the default channel of the group.")
        } 
    } else {
        throw "Error trying to add the member to the group."
    }

    return result
    
}

async function removeUserFromGroup(userId, memberId, groupId) {
    let groupObjId = MONGODB.ObjectId(groupId)
    let userObjId = MONGODB.ObjectId(userId)
    let memberObjId = MONGODB.ObjectId(memberId)
    const COLLECTION = await getDBCollection('group');
    let check = await COLLECTION.aggregate([
        {
          '$match': {    // Group exists & is active
            '_id': groupObjId,
            'active': true,
            'members': {
                '$elemMatch': {
                    '_id': userObjId,    // User making the request is a member of the group
                    'active': true,                     // and is active in the group
                    '$or': [
                        { 'admin': true },              // and is admin of the group OR the user making the requesting is the user to be removed  
                        { "_id": memberObjId }
                    ]
                }
            }
          }
        }, {
            '$match': {
              'members': {
                '$elemMatch': {
                  '_id': memberObjId,    // Member that is to be removed is a member of the group 
                  'active': true,                       // They are active
                  'admin': false                        // and NOT admin
                }
              }
            }
        }, {
          '$addFields': {
            'memberId': memberObjId
          }
        }, {
          '$lookup': {      // Get Member details
            'from': 'user', 
            'localField': 'memberId', 
            'foreignField': '_id', 
            'as': 'memberInfo'
          }
        }, {
          '$project': {
            'name': 1, 
            'group': 1, 
            'memberId': 1,
            'memberInfo.username': 1,
            'members': 1
          }
        }
    ]).toArray()

    if (!check || !Array.isArray(check) || check.length != 1 || !check[0]._id || 
        !check[0].memberInfo || !Array.isArray(check[0].memberInfo) || check[0].memberInfo.length != 1 || 
        !check[0].memberInfo[0].username
    ) {
        throw "The member can not be removed from the group."
    }
    
    // Remove the member from the group
    let result = await COLLECTION.updateOne(
        {   
            _id: groupObjId, 
            active: true,
            'members._id': memberObjId
        }, { 
            $set: {
                'members.$.active': false
            }
        }
    );

    if (result && result.acknowledged == true && result.modifiedCount == 1) {
        let memberIndex = check[0].members.findIndex( (member) => {
            return member._id.toString() == memberId
        })
        if (memberIndex >= 0) {
            check[0].members[memberIndex].active = false
        } else {
            throw "Member not found in the group."
        }
        return check[0].members
    } else {
        throw "Error trying to remove the member from the group."
    }
}

async function reactiveFriendGroup(groupObjectId) {
    const COLLECTION = await getDBCollection('group');
    let result = await COLLECTION.updateOne({
        '_id': groupObjectId,
        'friend': true, 
        'active': false 
    },{
        '$set': {
            active: true
        } 
    })
    if (result.acknowledged === true && result.modifiedCount === 1) {
        return true
    }
    return false
}

// ********************* CHANNEL *********************

/**
 * Returns a list of channels matching the passed params
 * Inc active === false
 *  
 * @param {JSON} params The parameters to pass to the find function
 *  
 * @returns {Array} An array of the found channels 
 */
async function getUnparsedChannels(params, projection=null) {
    const COLLECTION = await getDBCollection('channel');
    if (projection) {
        return await COLLECTION.find(params).project(projection).toArray()
    }
    return await COLLECTION.find(params).toArray()
}

async function getParsedChannels(userId, channelId) {
    let data = await _validateParseChannel(userId, channelId, null, true)
    if (data && Array.isArray(data) && data.length===1) {
        // If not the MAIN default channel, the channel will have members - Check if the user is admin
        if (data[0].members) {
            // Parse if they are an admin of the channel
            if (userIsMember(data[0].members, userId) === "ADMIN") {
                data[0].admin = true
            } else {
                data[0].admin = false
            }
        }
        return data[0]
    } else {
        throw "Channel data not found"
    }
}

/**
 * 
 * @param {string} userId 
 * @param {string} groupId
 *  
 * @returns 
 */
async function getAllParsedChannels(userId, groupId) {
    let group = await getGroups({
        _id: MONGODB.ObjectId(groupId),
        active: true,
        "members": {
            $elemMatch: {
                _id: MONGODB.ObjectId(userId),
                active: true
            }
        }
    }, {
        active: 1,
        name: 1,
        public: 1,
        avatar: 1,
        friend: 1,
        channels: 1
    })
    if (!group || !Array.isArray(group) || group.length!==1) {
        throw "Group not found"
    }
    if (group[0].members && Array.isArray(group[0].members) && userIsMember(group[0].members, userId) === "ADMIN") {
        group[0].admin = true
    }

    let channels
    if (group[0].channels && Array.isArray(group[0].channels) && group[0].channels.length > 0) {
        let channelIdArray = []
        group[0].channels.forEach(channelId => {
            channelIdArray.push(MONGODB.ObjectId(channelId))
        });
        channels = await _validateParseChannel(userId, { "$in": channelIdArray })
    }
    if (channels && Array.isArray(channels)) {
        // Admin helper field Only done in getParsedChannels() for an individual channel for efficiency
        group[0].channels = channels
    } else {
        group[0].channels = []
    }

    return group[0]
}

/**
 * Creates a channel with the passed parameters
 *  - Checks that the user exists and is active
 *  - Checks that the group exists and is active
 *    
 * @param {string} userId The ID of the user creating the channel   
 * @param {string} name The name of the channel to be created (Can be an empty string to create the groups default channel) 
 * @param {String} groupId The ID of the group the channel is to be created under 
 * @param {[{string|ObjectId, boolean, boolean}]} members Array of users to be added to the new channel in the form { _id: <ID>, active: <true/false>, admin: <true/false> }  
 * @param {String} avatar The base64 encoded image to use as the avatar for the group 
 */
 async function createChannel(userId, name, groupId, members, avatar = null) {

    // Convert string ID's into ObjectIds
    let creatorInArray = false
    if (members && Array.isArray(members)) {
        members.forEach(user => {
            if (user._id) {
                if (user._id.toString() === userId) { creatorInArray = true }  // Check if the creator is in members array. If not, we will add them below
                if (typeof user._id === "string") {
                    user._id = MONGODB.ObjectId(user._id)
                }
            } else {
                throw "Invalid member object found."
            }
        });    
    } else {
        members = []
    }

    // Check creating user exists and is active
    userId = MONGODB.ObjectId(userId)
    let user = await getUsers({
        _id: userId, 
        active: true 
    })
    if (!user || !Array.isArray(user) || user.length !== 1 || !user[0]._id) {
        throw "Invalid user or user is inactive."
    }
    // Add the creator to the members array if they were not included
    if (!creatorInArray) {
        members.push({
            _id: userId,
            active: true,
            admin: true
        })
    }

    // Check group exists
    let groupArray = await getGroups({
        _id: MONGODB.ObjectId(groupId),
        active: true
    })
    if (!groupArray || !Array.isArray(groupArray) || groupArray.length !== 1 || !groupArray[0]._id) {
        throw "Invalid group or group is inactive."
    }

    // Check channel name does not exist within the group
    let channelArray = await getUnparsedChannels({
        group: groupArray[0]._id,
        name: name
    })
    if (channelArray && Array.isArray(channelArray) && channelArray.length > 0) {
        throw "Channel name already exists within the group. Channel names must be unique."
    }

    let message
    if (!name) {
        if (groupArray[0].friend) {
            message = "New friend group created by '" + user[0].username + "'"
        } else {
            message = "New group created by '" + user[0].username + "': " + groupArray[0].name
        }
    } else {
        message = "New channel created by '" + user[0].username + "': " + name
    }
    let params = {
        active: true,
        admin: true,
        name: name,
        avatar: avatar,
        members: null, // Default channel (no name) has null members as all members of the group are members of the default channel
        messages: [{
            _id: new MONGODB.ObjectId(),
            active: true,
            user: userId,
            username: user[0].username,
            date: new Date(),
            message: message,
            reactions: []
        }],
        group: groupArray[0]._id
    }
    // Only the default channel created when a group is created has no members (as all group members are default channel members)
    if (name) {
        params.members = members
    }

    // Create the new channel
    const COLLECTION = await getDBCollection('channel')
    let result = await COLLECTION.insertOne(params);
    
    // If the channel has been added successfully, add the channel._id to the group.channels array 
    if (result.acknowledged && result.insertedId) {
        addChannelToGroup(groupArray[0]._id, result.insertedId)
        // Add channel._id to params and return params
        params._id = result.insertedId
        return params
    }    
    return null
} 

async function renameChannel(userId, channel, name) {
    if (name.length < 3) {
        throw "channel names must be at least 3 characters in length."
    }
    const COLLECTION = await getDBCollection('channel');
    let check = await COLLECTION.aggregate([
        {
          '$match': {
            '_id': MONGODB.ObjectId(channel),   // Find the channel
            'active': true                      // Must be active
          }
        }, {
          '$project': {
            'group': 1                          // Get the group the channel is In
          }
        }, {
          '$lookup': {
            'from': 'channel', 
            'localField': 'group',              // Lookup the channels group
            'foreignField': 'group', 
            'as': 'groupChannels'
          }
        }, {
          '$project': {
            'groupChannels': {
              '$filter': {
                'input': '$groupChannels', 
                'as': 'matchingChannels', 
                'cond': {
                  '$eq': [
                    '$$matchingChannels.name', name   // Extract all the channels in the group matching the name 
                  ]
                }
              }
            }
          }
        }
    ]).toArray()
    if (!check || !Array.isArray(check) || check.length != 1 || 
        !check[0].groupChannels && !Array.isArray(check[0].groupChannels)
    ) {
        throw "There has been an error finding the channel you wish to rename."
    }
    if (check[0].groupChannels.length > 0) {
        throw "A channel with the requested name already exists."
    }
    
    let result = await COLLECTION.updateOne({
        '_id': MONGODB.ObjectId(channel), 
        'active': true, 
        'members': {
            '$elemMatch': {
                '_id': MONGODB.ObjectId(userId), 
                'active': true, 
                'admin': true
            }
        }
    },{
        '$set': {
            name: name
        } 
    })
    
    if (result && result.acknowledged == true && result.modifiedCount == 1) {
       return name
    } else {
        throw "Error trying to rename the channel."
    }


}

async function deactivateChannel(userId, channelId) {

    const COLLECTION = await getDBCollection('channel')

    const channelObjId = MONGODB.ObjectId(channelId)

    // Check the channel exists, and is active
    // Check the user making the request is an admin of the channel    
    let foundChannels = await COLLECTION.find({
        '_id': channelObjId,
        'active': true,
        'members': {
          '$elemMatch': {
            '_id': MONGODB.ObjectId(userId), 
            'active': true, 
            'admin': true
          }
        }
    }, {
        '_id': 1
    }).toArray()

    if (!foundChannels || !Array.isArray(foundChannels) || foundChannels.length != 1) {
        throw "Invalid channel. An active channel where the user is an active administrator has not been found."
    }

    // Set channel.active = false
    let result = await COLLECTION.updateOne({
        '_id':  channelObjId
    }, {
        '$set': {
            'active': false
        }
    })

    if (result && result.acknowledged && result.modifiedCount == 1) {
        return true
    }
    return false
}

// ********************* GROUP/CHANNEL FUNCTIONS ************************

/**
 * Searches the member array for the passed (ACTIVE) userId
 * 
 * @param {[object]} members - Array of member objects in the form [{_id: <ObjectId>, active: true/false, admin: <true/false>}, ...] 
 * @param {string} userId - The authenticated user's ID
 *   
 * @returns false if user not found or inactive, true if user found, "ADMIN" if user found and is an admin 
 */
 function userIsMember(members, userId) {
    if (members) {
        let isAdmin = false
        let memberIndex = members.findIndex( (member) => {
            if (member.active && member._id.toString() === userId) {
                if (member.admin) {
                    isAdmin = true
                }
                return true
            }
            return false
        })
        if (memberIndex >= 0) {
            if (isAdmin) {
                return "ADMIN"
            }
            return true
        }    
    }
    return false
}

// ********************* CHANNEL/MESSAGES *********************

async function addMessage(userId, channelId, message) {

    let validate = await _validateParseChannel(userId, channelId)
    if ( !validate || !Array.isArray(validate) || validate.length != 1 || !validate[0]._id ) {
        throw "Channel not found."
    }

    let userObjId = MONGODB.ObjectId(userId)

    let user
    if (!validate.name) {
        // MAIN channel of the group
        user = validate[0].groupMembers.find( (member) => {
            return (userObjId.equals(member._id))
        })    
    } else {
        user = validate[0].channelMembers.find( (member) => {
            return (userObjId.equals(member._id))
        })    
    }
    if (!user) {        
        throw "The user does not have authority to add a messages to the selected channel"
    }

    // Add the message to the channel
    let channelObjId = MONGODB.ObjectId(channelId)
    const COLLECTION = await getDBCollection('channel');
    let result = await COLLECTION.updateOne(
        { _id: channelObjId },
        {"$push": {
            messages: {
                _id: (new MONGODB.ObjectId()),
                active: true,
                user: userObjId,
                username: user.username,
                avatar: user.avatar,
                date: (new Date()),
                message: message,
                reactions: []
            }
        }}
    )
    if (result.acknowledged === true && result.modifiedCount === 1) {
        return true
    }
    return false
} 


async function getMessages(userId, channelId, date=null) {

    // Check the user is valid and get messages
    let data = await _validateParseChannel(userId, channelId, date, true)
    if (!data || !Array.isArray(data) || data.length!==1 || !data[0]._id) {
        throw "The user does not have authority to get messages for the selected channel"
    }
    return data[0].activeMessages
}


// ********************* DATABASE *********************

/**
 * Database connectivity test
 * 
 * @returns {Array} Showing the result of the DB connection test
 */
async function test() {
    try {
        const COLLECTION = await getDBCollection('test');
        let result = await COLLECTION.find().toArray();
        return result;
    } catch(err) {
        console.error(err);
        return [err];
    }
}

/**
 * Return a connection to the MongoDB Collection
 * 
 * @param {string} collection
 * 
 * @returns {mongodb.collection}
 */
async function getDBCollection(collection) {
    const DB_CONNECTION = await connectToDatabase();
    const DB = DB_CONNECTION.db();
    return DB.collection(collection);
}

/**
 * Initiate connection to the MongoDB Database
 * 
 * @returns MongoClientPromise
 */
function connectToDatabase() {
    if (!global._mongoClientPromise) {
        const URI = SECRETS.getDBCredentials().URI;
        const OPTIONS = {
            useUnifiedTopology: true,
            useNewUrlParser: true,
            serverApi: MONGODB.ServerApiVersion.v1
        } 
        const CLIENT = new MONGODB.MongoClient(URI, OPTIONS)
        global._mongoClientPromise = CLIENT.connect()
    }
    return global._mongoClientPromise
}

/**
 * Convert _id string into a ObjectId
 * 
 * @param {string} _id - String _id to be converted to an ObjectId  
 * 
 * @returns The calculated ObjectId(_id)
 */
function convertToObjectId(_id) {
    return MONGODB.ObjectId(_id);
}

// ********************* SES EMAIL *********************

/**
 * Function to send an email using AWS SES
 *  
 * @param {string} to - The address to send the email to 
 * @param {string} subject - The subject of the email
 * @param {string} body - The body of the email
 *  
 * @returns The result of the sendEmail promise 
 */
async function sendEmail(to, subject, html, text) {
    let params = {
        Destination: {
            ToAddresses: [to.toLowerCase()]
        },
        Content: {
            Simple: {
                Subject: {
                    Data: subject
                },
                Body: {
                    Html: {
                        Data: html
                    },
                    Text: {
                        Data: text
                    }
                }

            }
        },
        FromEmailAddress: EMAIL_SOURCE_ADDRESS
    };

    return await SES.sendEmail(params).promise();
}

/**
 * Add email address as an identity
 * An email will be sent.
 * Once they click on the link in the email, they will be verified and able to login.
 *   
 * @param {string} email The email address of the user trying to register
 * 
 * @returns {object} An object in the form:
 *      {
 *          "DkimAttributes": { <DKIM Attributes> } 
 *          "IdentityType": "EMAIL_ADDRESS",
 *          "VerifiedForSendingStatus": false
 *      } 
 */
async function createEmailIdentity(email) {
    try {
        // If the email domain is "test.com" or "test-users.com" 
        //      It is a test account, so we don't send an email.
        let domain = email.split('@')[1]
        if (domain=="test.com" || domain=="test-users.com") {
            const COLLECTION = await getDBCollection('user');
            await COLLECTION.updateOne(
                {email: email},
                {
                    $set: {active: true}
                }
            ); // Artificially set user to active for testing 
            return {
                IdentityType: "EMAIL_ADDRESS", 
                VerifiedForSendingStatus: false
            }
        }
    } catch (err) {
        console.warn("Error splitting email to check for test domain.")
    }

    return await SES.createEmailIdentity ({
        "EmailIdentity": email
    }).promise();
}

/**
 * Returns the identity status of a user.
 * VerifiedForSendingStatus indicates if the user is verified.
 * 
 * @param {string} email The email of the user you want to check the status of.
 *  
 * @returns {object} An object containing a VerifiedForSendingStatus parameter.
 *                      If true the user has verified their email.
 *      {
 *          ...
 *          VerifiedForSendingStatus: true (If they have verified their email)
 *      }
 */
async function getEmailIdentity(email) {
    return await SES.getEmailIdentity ({
        "EmailIdentity": email
    }).promise();
}

async function deleteEmailIdentity(email) {
    return await SES.deleteEmailIdentity ({
        "EmailIdentity": email
    }).promise();
}


// ********************* S3 BUCKET *********************


async function getAudioUloadUrl(userId, type) {
    const S3 = new AWS.S3({
        apiVersion: '2006-03-01',
        signatureVersion: 'v4'
    })
    const filename = userId + "-" + Date.now()
    const params = {
        Bucket: BUCKET,
        Key: filename,
        ContentType: type,
        Expires: (S3_BUCKET_LINK_EXPIRY*60),
        ACL: 'public-read'
    }
    let url = await S3.getSignedUrlPromise("putObject", params)
    return {
        url: url,
        filename: filename
    }
}  


// ********************* HTTP *********************

/**
 * Construct Standard HTTP JSON response for return to the client 
 * 
 * @param {JSON} result - JSON result being returned  
 * @param {String} error - Error string
 * @param {Number} code - HTTP status code being returned
 * 
 * @returns {JSON} HTTP response
 */
function constructHttpResponse(response={}, error="", code=200) {
    if (error.length>0 && code===200) {
        code = 400; // Default to 400 if any error supplied
    }
    return {
        statusCode: code,
        isBase64Encoded: false,
        headers: {
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
            result: response,
            error: error
        })
    };
}

// ********************* UTILITY PRIVATE FUNCTIONS *********************

/**
 * Finds the channel with the passed ID - Ensures it is active
 * Checks the user with the userId is an active member of the channel
 * Checks channels group is active
 * Checks the user is active 
 * 
 * @param {string} userId - The user's ID 
 * @param {string|object} channelId - The ID of the channel as a string or an object to search for multiple channels 
 * @param {boolean} returnMessages - IFF user is valid ... If set to an true, returns the channel messages as activeMessages  
 * 
 * @returns {[<channle_objects>] | null}    if all tests passed ...
 *                                              If returnMessages
 *                                                  Returns array of channel data with activeMessages
 *                                              else
 *                                                  Returns array of channel data WITHOU activeMessages
 *                                          else null
 * 
 */
async function _validateParseChannel(userId, channelId, date=null, returnMessages=false) {
    
    userId = MONGODB.ObjectId(userId)
    if (typeof channelId === "string") {
        channelId = MONGODB.ObjectId(channelId)
    }
    if (date) {
        try {
            date = new Date(date) 
        } catch (err) {
            console.error("Error parsing date.")
            date = null
        }
    }

    let query = [{
        '$match': {
            '_id': channelId,   // Get the channel
            'active': true      // Channel is active
        }
    }, {
        '$lookup': {
            'from': 'group', 
            'localField': 'group', 
            'foreignField': '_id',      // Look up the parent group  
            'as': 'groupArray'
        }
    }, {
        '$lookup': {
            'from': 'user', 
            'localField': 'members._id',    // Look up the members of the channel 
            'foreignField': '_id', 
            'as': 'channelMembers'
        }
    }, {
        '$lookup': {
            'from': 'user', 
            'localField': 'groupArray.members._id',     // Look up the members of the group
            'foreignField': '_id', 
            'as': 'groupMembers'
        }
    }, {
        '$match': {
            'groupArray': {
                '$elemMatch': {
                    'active': true  // Group the channel belongs to is active 
                }
            },
            '$or': [
                { 'members': null },           // Channel is MAIN channel with no members (accessible by all group members)
                {                                    // OR
                    'members': {               //The user making the request is an active member of the channel
                        '$elemMatch': {
                            '_id': userId,
                            'active': true  
                        }
                    }
                }
            ]
        }
    }, {
        '$project': {
            'active': 1, 
            'name': 1, 
            'avatar': 1, 
            'members': 1, 
            'group': 1,
            'channelMembers.username': 1,
            'channelMembers.avatar': 1,
            'channelMembers.pubKey': 1,
            'channelMembers._id': 1,
            'channelMembers.username': 1,
            'channelMembers.avatar': 1,
            'channelMembers.pubKey': 1,
            'groupMembers._id': 1,
            'groupMembers.username': 1,
            'groupMembers.avatar': 1,
            'groupMembers.pubKey': 1,
        }
    }]
    // If we are returning the channel messages, limit them to active messages
    // and limit the total to the last MAX_MESSAGES messages
    if (returnMessages) {
        let activeMessages = {
            '$filter': {
                "input": { "$slice": [ "$messages", -MAX_MESSAGES] },
                'as': 'element', 
                'cond': {
                    '$and': [ 
                        { '$eq': [ '$$element.active', true ] }
                    ]
                }
            }
        }
        if (date) {
            // file deepcode ignore ArrayMethodOnNonArray: Invalid code quality warning. activeMessages.$filter.cond.$and IS an array
            activeMessages.$filter.cond.$and.push({ 
                '$gt': [ '$$element.date', new Date(date) ] 
            })
        }
        query[5].$project.activeMessages = activeMessages
    }

    const COLLECTION = await getDBCollection('channel');
    let result = await COLLECTION.aggregate(query).toArray();

    if ( result && Array.isArray(result)) {
        return result
    }
    return null
}

/****************************************************
 ***************** EXPORT REQUIRED ******************
 ********************* ELEMENTS *********************
 ****************************************************/

module.exports.BASE_URL = BASE_URL; 
module.exports.EMAIL_REGEX = EMAIL_REGEX;
module.exports.PASSWORD_REGEX = PASSWORD_REGEX;
module.exports.MIN_USERNAME_LENGTH = MIN_USERNAME_LENGTH;
module.exports.test = test;
module.exports.convertToObjectId = convertToObjectId;
module.exports.getAuthToken = getAuthToken;
module.exports.decodeToken = decodeToken;
module.exports.generateToken = generateToken;
module.exports.constructHttpResponse = constructHttpResponse;
module.exports.login = login;
module.exports.validate = validate;
module.exports.setNewUserPassword = setNewUserPassword;
module.exports.setNewUserData = setNewUserData;
module.exports.getUsers = getUsers;
module.exports.searchUsers = searchUsers;
module.exports.registerUser = registerUser;
module.exports.addUserToChannel = addUserToChannel;
module.exports.addUserToGroup = addUserToGroup;
module.exports.reactiveFriendGroup = reactiveFriendGroup;
module.exports.removeUserFromChannel = removeUserFromChannel;
module.exports.createChannel = createChannel;
module.exports.getGroups = getGroups;
module.exports.getUnparsedChannels = getUnparsedChannels;
module.exports.getParsedChannels = getParsedChannels;
module.exports.getAllParsedChannels = getAllParsedChannels;
module.exports.removeUserFromGroup = removeUserFromGroup;
module.exports.renameChannel = renameChannel;
module.exports.deactivateChannel = deactivateChannel;
module.exports.deactivateGroup = deactivateGroup;
module.exports.sendEmail = sendEmail;
module.exports.createGroup = createGroup;
module.exports.searchGroups = searchGroups;
module.exports.userIsMember = userIsMember;
module.exports.addMessage = addMessage;
module.exports.getMessages = getMessages;
module.exports.getAudioUloadUrl = getAudioUloadUrl;
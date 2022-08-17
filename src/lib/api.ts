/**
 * Helper class for sending HTTP requests to the back-end API
 */

const API_URL = "https://i8lwly2z5c.execute-api.ap-southeast-2.amazonaws.com/Prod/"
const HEADERS = {
    "Content-Type": "application/json;charset=UTF-8"
}
const HEADERS_WITH_TOKEN = {
    "Content-Type": "application/json;charset=UTF-8",
    "Authorization": ""
}
export default class ApiRequest {

    /******************************************************
     ************************ USER ************************
     ******************************************************/

    /**
     * Calls back-end API to check if the supplied username or email has already been used
     * 
     * @param username - Entered username or email address
     * 
     * @returns Resonse in the form
     *      {
     *          result: <true/false>,
     *          error: <error>
     *      } 
     */
    static async userGetExisting(username:string) {
        return await ApiRequest._getRequest(API_URL+"user/exists?" + new URLSearchParams({username: username}), false)
    }

    static async userPostRegister(username:string, email:string, name:string, phone:string, password:string, dob:Date, pubKey:JsonWebKey, privKey, avatar=null) {
        let requestBody = { 
            username: username,
            email: email.toLowerCase(),
            name: name,
            phone: phone,
            password: password,
            dob: dob,
            avatar: avatar,
            pubKey: pubKey,
            privKey: privKey
        }
        return await ApiRequest._postRequest(API_URL+"user/register", requestBody, false)
    }

    static async userPostLogin(username:string, password:string) {
       let requestBody = { 
                username: username,
                password: password
        }
        return await ApiRequest._postRequest(API_URL+"user/login", requestBody, false)
    }

    /**
     * Validate a user's sign-in credentials WITHOU logging them in
     * 
     * @param {string} username The user's username or email address 
     * @param {string} password The entered password
     * 
     * @returns {string} { _id: "<user_id>" } on successfull validation
     */
    static async userPostValidate(username:string, password:string) {
        let requestBody = { 
            username: username,
            password: password
        }
        return await ApiRequest._postRequest(API_URL+"user/validate", requestBody, false)
    }

    /**
     * Search the database for the user that matches the user name
     * Where username, name, and email are searched
     * OPTION: Removed users in the results that are already members of the passed group
     * 
     * @param {string} username The username, name, or email address to be used to search the database  
     * @param {string} group OPTIONAL: The ID of the group whose members will be excluded from the returned results
     * 
     * @returns [<user_objects>] 
     */
    static async userGetSearch(username:string, group:string|null = null) {
        let url = API_URL+"user/search?" + new URLSearchParams({username: username})
        if (group) {
            url += "&" + new URLSearchParams({group: group})
        }
        return await ApiRequest._getRequest(url, true)
    }

    static async userPostReset(email) {
        let requestBody = { 
            email: email
        }
        return await ApiRequest._postRequest(API_URL+"/user/reset", requestBody, false)
    }

    /**
     * Used to update a user's password. Either by changing when logged in, or the recovery process 
     * 
     * @param userId
     * @param email
     * @param password - The new password to be set 
     * @param specialToken - This is the recovery token, else will use the normal login token
     * 
     * @returns user_collection_inc_token
     * 
     */
    static async userPatchPassword(userId, email, password, specialToken = null) {
        let requestBody = {
            _id: userId, 
            email: email,
            password: password
        }

        if (specialToken) {
            // specialToken is not in the from of the normal token (Before login), so can not use the default methods
            HEADERS_WITH_TOKEN.Authorization = "Bearer "+specialToken
        } else {
            HEADERS_WITH_TOKEN.Authorization = "Bearer "+localStorage.getItem("token")
        }
        let headers = HEADERS_WITH_TOKEN                       
        let response = await fetch(API_URL+"user/password", {
            method: "PATCH",
            headers: headers,
            body: JSON.stringify(requestBody)
        })
        let json = await response.json()
        if (response.ok && !json.error && json.hasOwnProperty("result")) {
            return json.result
        } 
        throw json 
    }

    /**
     * Allow a user to update their data
     * 
     * @param newUserData A JSON object in the form:
     *              {                                 // ALL Parameters are OPTIONAL
     *                  "email": <new_email>,         // UNIQUE
     *                  "name": <new_name>, 
     *                  "username": <new_username>,   // UNIQUE
     *                  "dob": <new_dob>, 
     *                  "phone": <new_phone>, 
     *                  "avatar": <custom_avatar_id>, 
     *                  "active": <true/false>,
     *                  "public": <true/false>
     *              }
     * 
     * @returns A JSON Object with all the user's data points
     */
    static async userPatchData(newUserData) {
        const VALID_USER_DATA = ["email","name","username","dob","phone","avatar","active","public"]
        for (let parameter in newUserData){
            if (!VALID_USER_DATA.includes(parameter)) {
                throw "Invalid user data parameter."
            }
        }
        return await ApiRequest._patchRequest(API_URL+"user/data", newUserData, true)
    }

    /******************************************************
     ************************ GROUP ***********************
     ******************************************************/

     static async groupGetExisting(groupName:string) {
        return await ApiRequest._getRequest(API_URL+"group/exists?" + new URLSearchParams({name: groupName}), false)
    }

    static async groupGetInfo(id:string) {
        HEADERS_WITH_TOKEN.Authorization = "Bearer "+localStorage.getItem("token")
        let response = await fetch(API_URL+"group/info?" + new URLSearchParams({group: id}), {
            method: "GET",
            headers: HEADERS_WITH_TOKEN
        })

        let json = await response.json()
        if (response.ok && !json.error && Array.isArray(json.result) && json.result.length===1) {
            return json.result[0]
        } 
        throw json 
    }

    static async groupGetAllInfo() {
        HEADERS_WITH_TOKEN.Authorization = "Bearer "+localStorage.getItem("token")
        let response = await fetch(API_URL+"group/info", {
            method: "GET",
            headers: HEADERS_WITH_TOKEN
        })

        let json = await response.json()
        if (response.ok && !json.error && Array.isArray(json.result)) {
            return json.result
        } 
        throw json 
    }

    /**
     *  Invite a new user to a group in YaMa 
     *
     * @param groupId The ID of the group the invite is for or null if a friend request
     * @param email The email address of the user to send the invite to
     * @param name OPTION: The name of the user (used if they are a new user)
     * @param message OPTION: The message to be sent to the user in the invitation email
     * 
     * @returns The invitation token generated
     */
    static async inviteToGroup(groupId:string|null, email:string, name:string|null = null, message:string|null = null) {
        let requestBody = {
            group: groupId,
            email: email
        }
        if (name) {
            requestBody["name"] = name
        }
        if (message) {
            requestBody["message"] = message
        }
        return await ApiRequest._postRequest(API_URL+"group/invite", requestBody, true)
    }

    static async groupPostCreate(name:string, members:string[]|null=null, isPrivate:boolean=false, avatar:string|null=null) {
        let requestBody = {
            name: name,
            members: members,
            isPrivate: isPrivate,
            avatar: avatar
        }
        return await ApiRequest._postRequest(API_URL+"group/create", requestBody, true) 
    }

    static async groupGetMembers(groupId:string) {
        HEADERS_WITH_TOKEN.Authorization = "Bearer "+localStorage.getItem("token")
        let response = await fetch(API_URL+"group/members?" + new URLSearchParams({group: groupId}), {
            method: "GET",
            headers: HEADERS_WITH_TOKEN
        })

        let json = await response.json()
        if (response.ok && !json.error && json.result && Array.isArray(json.result)) {
            return json.result
        } 
        throw json
    }

    static async groupDeleteDeactivate(groupId:string) {
        let requestBody = {
            group: groupId
        }
        return await ApiRequest._deleteRequest(API_URL+"group/deactivate", requestBody, true) 
    }

    static async groupPatchMember(group:string, member:string) {
        let requestBody = {
            group: group,
            member: member
        }
        return await ApiRequest._patchRequest(API_URL+"group/member", requestBody, true)
    }

    /******************************************************
     *********************** CHANNEL **********************
     ******************************************************/

    static async channelGetExisting(groupId:string, channelName:string) {
        return await ApiRequest._getRequest(API_URL+"channel/exists?" + new URLSearchParams({group: groupId, name: channelName}), false)
    }

    static async channelGetInfo(channelId:string) {
        return await ApiRequest._getRequest(API_URL+"channel/info?" + new URLSearchParams({channel: channelId}), true)
    }

    static async channelGetAllInfo(groupId:string) {
        HEADERS_WITH_TOKEN.Authorization = "Bearer "+localStorage.getItem("token")
        let response = await fetch(API_URL+"channel/info?" + new URLSearchParams({group: groupId}), {
            method: "GET",
            headers: HEADERS_WITH_TOKEN
        })
        let json = await response.json()
        if (response.ok && !json.error && json.result && json.result.channels && Array.isArray(json.result.channels)) {
            return json.result
        } 
        throw json
    }


    /**
     * Add a member from a group to an existing channel
     * 
     * @param channel The id of the channel to add the member to 
     * @param member The id of the member to add to the channel
     * 
     * The user making the request must be admin of the channel
     * The channel must be active
     * The member must be a member of the channel's group
     * The member must be active
     * The member Must not already be a member of the channel
     * 
     */
     static async channelPutMember(channel:string, member:string) {
        let requestBody = {
            channel: channel,
            member: member
        }
        return await ApiRequest._putRequest(API_URL+"channel/member", requestBody, true)
    }

    /**
     * Remove a member from a channel
     * 
     * @param channel The id of the channel to remove the member from 
     * @param member The id of the member to be removed from the channel
     * 
     */
     static async channelPatchMember(channel:string, member:string) {
        let requestBody = {
            channel: channel,
            member: member
        }
        return await ApiRequest._patchRequest(API_URL+"channel/member", requestBody, true)
    }

    static async channelPatchRename(channelId:string, name:string) {
        let requestBody = {
            channel: channelId,
            name: name
        }
        return await ApiRequest._patchRequest(API_URL+"channel/rename", requestBody, true) 

    }
   
     static async channelPostCreate(name:string, group: string, members:string[]|null=null, avatar:string|null=null) {
        let requestBody = {
            name: name,
            group: group,
            members: members,
            avatar: avatar
        }
        return await ApiRequest._postRequest(API_URL+"channel/create", requestBody, true) 
    }

    static async channelDeleteDeactivate(channelId:string) {
        let requestBody = {
            channel: channelId
        }
        return await ApiRequest._deleteRequest(API_URL+"channel/deactivate", requestBody, true) 
    }

    /******************************************************
     ********************** MESSAGES **********************
     ******************************************************/

    static async channelGetMessages(channel:string, date:string|null=null) {
        return await ApiRequest._getRequest(API_URL+"channel/messages?" + new URLSearchParams({channel: channel, date: date}), true)
    }

    static async channelPostMessage(channel:string, message:EncryptedMessage):Promise<boolean> {
        let params = {
            channel: channel,
            message: message
        }
        return await ApiRequest._postRequest(API_URL+"channel/message", params, true)
    }

    /***********************************************************
     ************************ S3 BUCKET ************************
     ***********************************************************/

     static async uploadFile(type, blob) {
        // Get the pre-authorised URL for upload    
        let url = API_URL+"bucket/url?" + new URLSearchParams({type: type})
        let uploadLocation = await ApiRequest._getRequest(url, true)
        if (uploadLocation && uploadLocation.url) {
            let response = await fetch(uploadLocation.url, {
                method: "PUT",
                headers: {
                    "Content-Type": type
                },
                body: blob
            })
            if (response.ok && response.url) {
                return response.url.split('?')[0]
            } else {
                throw "Error uploading file."
            }
        } else {
            throw "Error retrieving upload location."
        }
     }

    /******************************************************
     ********************* INVITATION *********************
     ******************************************************/

    static async acceptInvite(token:string) {
        HEADERS_WITH_TOKEN.Authorization = "Bearer "+token
        let response = await fetch(API_URL+"user/accept", {
            method: "GET",
            headers: HEADERS_WITH_TOKEN
        })

        let json = await response.json()
        if (response.ok && !json.error && json.result) {
            return json.result
        } 
        throw json 
    }
 
    /******************************************************
     ****************** PRIVATE FUNCTIONS *****************
     ******************************************************/

    private static async _getRequest(Url: string, withToken: boolean = true) {
        let headers:HeadersInit
        if (withToken) {
            HEADERS_WITH_TOKEN.Authorization = "Bearer "+localStorage.getItem("token")
            headers = HEADERS_WITH_TOKEN
        } else {
            headers = HEADERS
        }
        let response = await fetch(Url, {
            method: "GET",
            headers: headers
        })
        let json = await response.json()
        if (response.ok && !json.error && json.hasOwnProperty("result")) {
            return json.result
        } 
        throw json
    }

    private static async _postRequest(url: string, requestBody = {}, withToken: boolean = true) {
        return await ApiRequest._bodyRequest(url, requestBody, withToken, "POST")
    }

    private static async _putRequest(url: string, requestBody = {}, withToken: boolean = true) {
        return await ApiRequest._bodyRequest(url, requestBody, withToken, "PUT")
    }

    private static async _patchRequest(url: string, requestBody = {}, withToken: boolean = true) {
        return await ApiRequest._bodyRequest(url, requestBody, withToken, "PATCH")
    }

    private static async _deleteRequest(url: string, requestBody = {}, withToken: boolean = true) {
        return await ApiRequest._bodyRequest(url, requestBody, withToken, "DELETE")
    }

    private static async _bodyRequest(url:string, requestBody = {}, withToken:boolean = true, method:string = "POST") {
        if (method != "POST" && method != "PUT" && method != "PATCH" && method != "DELETE") {
            throw "Invalid body request method"
        }
        let headers:HeadersInit
        if (withToken) {
            HEADERS_WITH_TOKEN.Authorization = "Bearer "+localStorage.getItem("token")
            headers = HEADERS_WITH_TOKEN
        } else {
            headers = HEADERS
        }
        let response = await fetch(url, {
            method: method,
            headers: headers,
            body: JSON.stringify(requestBody)
        })

        let json = await response.json()
        if (response.ok && !json.error && json.hasOwnProperty("result")) {
            return json.result
        } 
        throw json 
    }

}

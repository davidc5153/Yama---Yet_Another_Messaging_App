/**
 * Token helper functions
 */
import YamaEncryption from './encryption';

export async function setToken(result, password?:string) {
    try {
        if (result && result.token) {
            if (validToken(result.token)) {
                // Save to localStorage 
                console.log('Writing user to localStorage')
                localStorage.clear()
                for (let prop in result) {
                    let value = result[prop]
                    if (typeof value === "object") {
                        value = JSON.stringify(value)
                    }
                    // Decrypt the Private Key and add to LocalStorage
                    if (prop == "privKey") {
                        value = await YamaEncryption.decryptWithString(value, password);
                    }
                    localStorage.setItem(prop, value)
                }
                localStorage.setItem("token", result.token)
                localStorage.setItem("userReadTime", new Date().getTime().toString())
            } else {
                console.error("Token not found in response result.", result)
                throw "Token not found in response result"
            }
        } else {
            console.error("Invalid response result.", result)
            throw "Invalid response result."
        }

    } catch (err) {
        console.error("Error parsing response for token.", err.toString())
        throw "Error parsing response for token: " + err.toString()
    }
}

export function getToken() {
    return localStorage.getItem("token")
}

export function validToken(token = null) {
    if (!token) {
        token = localStorage.getItem("token")
    }
    try {
        if (token && token!="null") {
            let tokenJson = JSON.parse(atob(token.split('.')[1]))
            if (tokenJson.exp && tokenJson.exp > 0) {
                let differenceInMiilis = (tokenJson.exp * 1000) - (new Date().getTime())
                // If token expires within the next 24 hours, user must login again
                if (differenceInMiilis >= (1000 * 60 * 60 * 24)) {
                    return true
                }
            }
        }
    } catch (err) {
        console.warn("Token parse error in router precondition function.", err)
    }
    return false
}

export function parseToken(token: string) {
    try {
        if (token && token!="null" && validToken(token)) {
            return JSON.parse(atob(token.split('.')[1]))
        } else {
            console.error('Invalid Token')
            throw "Invalid token." 
        }
    } catch (err) {
        console.error("Error parsing token.", err)
        throw "Error parsing token."
    }
}

export function clearToken() {
    localStorage.clear()
    localStorage.setItem("token", null)
    console.log("Logged out. Token cleared.")
}

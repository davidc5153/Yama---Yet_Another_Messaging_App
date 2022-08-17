import { dataset_dev, now } from "svelte/internal";
import ApiRequest from "./api"

export const PASSWORD_MIN_LENGTH = 8
export const USERNAME_MIN_LENGTH = 3
export const PHONE_MAX_LENGTH = 15
export const MINIMUM_GROUP_NAME_LENGTH = 3
export const MINIMUM_CHANNEL_NAME_LENGTH = 3

// https://stackoverflow.com/questions/19605150/regex-for-password-must-contain-at-least-eight-characters-at-least-one-number-a
const PASSWORD_REGEX = `^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$`  // Min 8 letter password, with at least a special character, upper and lower case letters and a number
// https://stackoverflow.com/questions/46155/whats-the-best-way-to-validate-an-email-address-in-javascript
const EMAIL_REGEX = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
export function validatePassword(password) {
    let regex = new RegExp(PASSWORD_REGEX)
    return (regex.test(password))
}

export function validateUsername(username) {
    return ( (username.length >= USERNAME_MIN_LENGTH) && (username.indexOf(' ') < 0) && (username.indexOf('@') < 0) )
}

export function validatePhone(phone) {
    return (phone.length <= PHONE_MAX_LENGTH)
}

export function validateDOB(dob) {
    try {
        let date:Date = new Date(dob)
        date.setHours(0,0,0,0)
        let dateNow:Date = new Date(Date.now());
        dateNow.setHours(0,0,0,0)
        if (date >= dateNow) {
            throw "Date of birth has to be before today"
        }
    } catch (err) {
        throw "Invalid dateString: " + err
    }
    return true
}

export async function existingUsername(username) {
    let response = await ApiRequest.userGetExisting(username)
    if (response === true || response === false) {
        // Valid response from server
        return response
    } else {
        throw "Invalid response from server. " + response
    }
}

export function validateEmail(email) {
    return EMAIL_REGEX.test(email)
}

export async function existingGroupName(groupName) {
    let response = await ApiRequest.groupGetExisting(groupName)
    if (response === true || response === false) {
        return response
    } else {
        throw "Invalid response from server. " + response
    }
}

export async function existingChannelName(groupId: string, channelName: string) {
    let response = await ApiRequest.channelGetExisting(groupId,channelName)
    if (response === true || response === false) {
            return response
    } else {
        throw "Invalid response from server. " + response
    }
}

export function validateGroupName(groupName) {
    return ( (groupName.length >= MINIMUM_GROUP_NAME_LENGTH) && (groupName.indexOf(' ') < 0) )
}

export function validateChannelName(channelName) {
    return ( (channelName.length >= MINIMUM_CHANNEL_NAME_LENGTH) && (channelName.indexOf(' ') < 0) )
}

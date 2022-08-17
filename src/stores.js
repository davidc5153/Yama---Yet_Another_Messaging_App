/**
 * Application Svelte stores
 */
import { writable } from 'svelte/store';

/**
 * Status - Logged in - True if logged in
 */
export const STORE_loggedIn = writable(false)

/**
 * Status - True if showing friends list
 */
export const STORE_showingFriends = writable(false)

/**
 * Status - Mobile view - True if chat panel open
 */
export const STORE_chatPanelOpen = writable(false)


 /**
  * Alert/snackbar to be shown when the chat screen loads
  * {
  *     alertText: string.
  *     alertObject: object,
  *     alertClass: string
  * }  
  */
export const STORE_newAlert = writable()

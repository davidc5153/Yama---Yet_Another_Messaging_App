import Home from "./pages/Home.svelte"
import Register from "./pages/Register.svelte"
import About from "./pages/About.svelte"
import Error from "./pages/Error.svelte"
import Chat from "./pages/Chat.svelte"
import Cancel from "./pages/Cancel.svelte"
import Invitation from "./pages/Invitation.svelte"
import Reset from "./pages/Reset.svelte"
import Forgotten from "./pages/Forgotten.svelte"
import Settings from "./pages/Settings.svelte"
import { wrap } from "svelte-spa-router/wrap"
import { push } from "svelte-spa-router"
import { validToken } from "./lib/token"
import { STORE_loggedIn } from './stores.js';

let userLoggedIn = false

STORE_loggedIn.subscribe(value => {
    userLoggedIn = value;
});

export default {
    '/': Home, // Login/Home page
    '/forgotten/:email?': Forgotten, // Forgotten password reset request - Includes OPTIONAL parameter if they have already entered their username
    '/register/': Register,
    '/settings/':  wrap({ // Can only navigate to settings page if token is valid, else navigate to home for login
        component: Settings,
        conditions: [
            (details) => {
                if (validToken(localStorage.getItem("token"))) {
                    userLoggedIn = true
                    STORE_loggedIn.set(true)
                    return true
                }
                localStorage.setItem("token", null)
                push("/")
                return false
            }
        ]
    }),
    '/about/:name?': About,
    '/chat/': wrap({ // Can only navigate to chat page if token is valid, else navigate to home for login
        component: Chat,
        conditions: [
            (details) => {
                if (validToken(localStorage.getItem("token"))) {
                    userLoggedIn = true
                    STORE_loggedIn.set(true)
                    return true
                }
                localStorage.setItem("token", null)
                push("/")
                return false
            }
        ]
    }),
    '/invitation/:token?': Invitation, // Optional parameter with token holding parameters of invite 
    '/reset/:token?': Reset, // Reset password
    '/cancel/:token?': Cancel, // Cancel an invite 
    '/logout/': Home,
    '*': Error
}
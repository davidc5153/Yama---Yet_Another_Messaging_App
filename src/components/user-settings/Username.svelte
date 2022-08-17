<script lang="ts">
    import Button, { Label } from "@smui/button";
    import Textfield from "@smui/textfield";
    import ApiRequest from "../../lib/api";
    import { setToken } from "../../lib/token";
    import { existingUsername, USERNAME_MIN_LENGTH, validateUsername } from "../../lib/validate";
    import ClearField from "../Clear-Field.svelte";
    import { STORE_newAlert } from "./../../stores";
    import CircularProgress from '@smui/circular-progress';

    export let oldPassword

    let username: string = localStorage.getItem("username")
    let editUsername = false;
    let invalidUsername = false;
    let duplicateUsername = false;
    let working = false

    async function checkUsername() {
		try{
            duplicateUsername = false;
			invalidUsername = !validateUsername(username)
			if (!invalidUsername) {
				duplicateUsername = await existingUsername(username)
			}
		} catch (err) {
			console.error("Error checking username: ", err.toString())
            $STORE_newAlert = {
                alertText: "Username validation error.",
                alertObject: err,
                alertClass: "dangerous"
            }
		}
	}

    async function updateUsername() {
        working = true
        try {
            checkUsername()
            if (!invalidUsername && !duplicateUsername) {
                let response = await ApiRequest.userPatchData({username: username});
                await setToken(response, oldPassword);
                editUsername = false;
                $STORE_newAlert = {
                    alertText: "Your username has been updated.",
                    alertObject: null,
                    alertClass: "info"
                }
            }
        } catch (err) {
            console.error(err);
            $STORE_newAlert = {
                alertText: "Username update error.",
                alertObject: err,
                alertClass: "dangerous"
            }
        }
        working = false
    }
    
    function cancelEdit() {
        invalidUsername = false;
        duplicateUsername = false;
        editUsername = false; 
        username = localStorage.getItem("username")
    } 

</script>

<div class="grid-cell full-width">
    <h3>Username</h3>
</div>
<form on:submit|preventDefault={updateUsername} class="grid-container">
    <div class="grid-cell">
        <div class:hidden={editUsername}>
            <p>{username}</p>
        </div>
        <div class:hidden={!editUsername}>
            <Textfield variant="outlined" bind:value={username} label="Enter Username">
                <ClearField slot="trailingIcon" bind:variable={username} />
            </Textfield>
            <div id="username-error" class="input_error" class:invalid="{invalidUsername}">Usernames must have at least {USERNAME_MIN_LENGTH} characters <br> and contain no spaces or the '@' symbol.</div>
            <div id="username-exists" class="input_error" class:invalid="{duplicateUsername}">This username is already taken.</div>
        </div>
    </div>
    <div class="grid-cell">
        <div class:hidden={editUsername}>
            <Button type="button" color="primary" variant="raised" on:click={() => (editUsername = true)} >
                <Label>Edit</Label>
            </Button>
        </div>
        <div class:hidden={!editUsername || working}>
            <Button color="primary" variant="raised" type="submit">
                <Label>Save</Label>
            </Button>
            <Button type="button" on:click={ cancelEdit }>
                <Label>Cancel</Label>
            </Button>
        </div>
        <div class:hidden={!working}>
            <CircularProgress style="height: 32px; width: 32px;" indeterminate />
        </div>        
    </div>
</form>

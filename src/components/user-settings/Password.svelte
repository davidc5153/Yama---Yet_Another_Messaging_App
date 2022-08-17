<script lang="ts">
    import Button, { Label } from "@smui/button";
    import Textfield from "@smui/textfield";
    import ApiRequest from "../../lib/api";
    import { setToken } from "../../lib/token";
    import {PASSWORD_MIN_LENGTH, validatePassword} from "../../lib/validate";
    import ClearField from "../Clear-Field.svelte";
    import { STORE_newAlert } from "./../../stores";
    import CircularProgress from '@smui/circular-progress';

    export let oldPassword

    let editPassword = false;
    let invalidPassword = false;
    let invalidConfirmation = false;
    let unchangedPassword = false;
    let password1: string = ""
    let password2: string = ""
    let working = false

    async function checkPassword() {
		try{
            invalidConfirmation = false
            unchangedPassword = false
			invalidPassword = !validatePassword(password1)
			if (!invalidPassword) {
                if (password1 == oldPassword) {
                    unchangedPassword = true
                    $STORE_newAlert = {
                        alertText: "The password entered is the same as your existing password.",
                        alertObject: null,
                        alertClass: "warning"
                    }
                }
                if (!unchangedPassword) {
                    if (password1 != password2) {
                        invalidConfirmation = true
                        $STORE_newAlert = {
                            alertText: "The passwords entered are not the same.",
                            alertObject: null,
                            alertClass: "warning"
                        }
                    }
                }
			}
		} catch (err) {
			console.error("Error checking password: ", err.toString())
            $STORE_newAlert = {
                alertText: "Password validation error.",
                alertObject: err,
                alertClass: "dangerous"
            }
		}
	}

    async function updatePassword() {
        working = true
        try {
            checkPassword()
            if (!invalidPassword && !unchangedPassword && !invalidConfirmation) {
                let response = await ApiRequest.userPatchPassword(localStorage.getItem("_id"), localStorage.getItem("email"), password1)
                await setToken(response, password1);
                oldPassword = password1
                editPassword = false;
                $STORE_newAlert = {
                    alertText: "Your password has been updated.",
                    alertObject: null,
                    alertClass: "info"
                }
                oldPassword = password1
                password1 = ""
                password2 = ""
            }
        } catch (err) {
            console.error(err);
            $STORE_newAlert = {
                alertText: "Password update error.",
                alertObject: err,
                alertClass: "dangerous"
            }
        }
        working = false
    }
    
    function cancelEdit() {
        invalidPassword = false;
        invalidConfirmation = false;
        unchangedPassword = false;
        editPassword = false; 
        password1 = ""; 
        password2 = ""; 
    } 

</script>
<div class="grid-cell full-width">
    <h3>Password</h3>
</div>
<form on:submit|preventDefault={updatePassword} class="grid-container">
    <div class="grid-cell">
        <div class:hidden={editPassword}>
            <p>********</p>
        </div>
        <div class:hidden={!editPassword}>
            <Textfield variant="outlined" bind:value={password1} label="Enter Password" type="password" >
                <ClearField slot="trailingIcon" bind:variable={password1} />
            </Textfield>
            <div id="unchanged-error" class="input_error" class:invalid="{unchangedPassword}">The new password entered is the same as the old one.</div>    
            <div id="password-error" class="input_error" class:invalid="{invalidPassword}">
                Passwords must have at least {PASSWORD_MIN_LENGTH} characters. <br>Please use lower-case and upper-case characters, <br>numbers, and special characters.
            </div>    
        </div>
        <br>
        <div class:hidden={!editPassword}>
            <Textfield variant="outlined" bind:value={password2} label="Confirm Password" type="password">
                <ClearField slot="trailingIcon" bind:variable={password2} />
            </Textfield>
            <div id="confirmation-error" class="input_error" class:invalid="{invalidConfirmation}">The entered passwords do not match.</div>    
        </div>
    </div>
    <div class="grid-cell">
        <div class:hidden={editPassword}>
            <Button type="button" color="primary" variant="raised" on:click={() => (editPassword = true)} >
                <Label>Edit</Label>
            </Button>
        </div>
        <div class:hidden={!editPassword || working}>
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

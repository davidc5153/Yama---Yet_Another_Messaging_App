<script lang="ts">
    import Button, { Label } from "@smui/button";
    import Textfield from "@smui/textfield";
    import ApiRequest from "../../lib/api";
    import { setToken } from "../../lib/token";
    import { existingUsername, validateEmail} from "../../lib/validate";
    import ClearField from "../Clear-Field.svelte";
    import { STORE_newAlert } from "./../../stores";
    import CircularProgress from '@smui/circular-progress';

    export let oldPassword

    let email: string = localStorage.getItem("email");
    let editEmail = false;
    let invalidEmail = false;
    let duplicateEmail = false;
    let working = false

    async function checkEmail() {
		try{
            duplicateEmail = false;
			invalidEmail = !validateEmail(email)
			if (!invalidEmail) {
				duplicateEmail = await existingUsername(email)
			}
		} catch (err) {
			console.error("Error checking email: ", err.toString())
            $STORE_newAlert = {
                alertText: "Email validation error.",
                alertObject: err,
                alertClass: "dangerous"
            }
		}
	}

    async function updateEmail() {
        working = true
        try {
            checkEmail()
            if (!invalidEmail && !duplicateEmail) {
                let response = await ApiRequest.userPatchData({email: email});
                await setToken(response, oldPassword);
                editEmail = false;
                $STORE_newAlert = {
                    alertText: "Your email address has been updated.",
                    alertObject: null,
                    alertClass: "info"
                }
            }
        } catch (err) {
            console.error(err);
            $STORE_newAlert = {
                alertText: "Email update error.",
                alertObject: err,
                alertClass: "dangerous"
            }
        }
        working = false
    }
    
    function cancelEdit() {
        invalidEmail = false;
        duplicateEmail = false;
        editEmail = false; 
        email = localStorage.getItem("email"); 
    } 

</script>
<div class="grid-cell full-width">
    <h3>Email</h3>
</div>
<form on:submit|preventDefault={updateEmail} class="grid-container">
    <div class="grid-cell">
        <div class:hidden={editEmail}>
            <p>{email}</p>
        </div>
        <div class:hidden={!editEmail}>
            <Textfield variant="outlined" bind:value={email} label="Enter Email">
                <ClearField slot="trailingIcon" bind:variable={email} />
            </Textfield>
            <div id="email-error" class="input_error" class:invalid="{invalidEmail}">Please enter a valid email address.</div>
            <div id="email-exists" class="input_error" class:invalid="{duplicateEmail}">The email address is already registered.</div>    
        </div>
    </div>
    <div class="grid-cell">
        <div class:hidden={editEmail}>
            <Button type="button" color="primary" variant="raised" on:click={() => (editEmail = true)} >
                <Label>Edit</Label>
            </Button>
        </div>
        <div class:hidden={!editEmail || working}>
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

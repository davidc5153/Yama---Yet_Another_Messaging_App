<script lang="ts">
    import Button, { Label } from "@smui/button";
    import Textfield from "@smui/textfield";
    import ApiRequest from "../../lib/api";
    import { setToken } from "../../lib/token";
    import { validatePhone } from "../../lib/validate";
    import ClearField from "../Clear-Field.svelte";
    import { STORE_newAlert } from "./../../stores";
    import CircularProgress from '@smui/circular-progress';

    export let oldPassword

    let phone: string = localStorage.getItem("phone")
    let invalidPhone = false
    let editPhone = false;
    let working = false

    async function checkPhone() {
		try {
			invalidPhone = !validatePhone(phone)
		} catch (err) {
			console.error("Error checking email: ", err.toString())
            $STORE_newAlert = {
                alertText: "Phone number validation error.",
                alertObject: err,
                alertClass: "dangerous"
            }
		}
	}

    async function updatePhone() {
        working = true
        try {
            checkPhone()
            if (!invalidPhone) {
                let response = await ApiRequest.userPatchData({phone: phone});
                await setToken(response, oldPassword);
                editPhone = false;
                $STORE_newAlert = {
                    alertText: "Your phone number has been updated.",
                    alertObject: null,
                    alertClass: "info"
                }
            }
        } catch (err) {
            console.error(err);
            $STORE_newAlert = {
                alertText: "Phone number update error.",
                alertObject: err,
                alertClass: "dangerous"
            }
        }
        working = false
    }
    
    function cancelEdit() {
        invalidPhone = false;
        editPhone = false; 
        phone = localStorage.getItem("phone") 
    } 

</script>
<div class="grid-cell full-width">
    <h3>Phone</h3>
</div>
<form on:submit|preventDefault={updatePhone} class="grid-container">
    <div class="grid-cell">
        <div class:hidden={editPhone}>
            <p>{phone}</p>
        </div>
        <div class:hidden={!editPhone}>
            <Textfield variant="outlined" bind:value={phone} label="Enter Phone">
                <ClearField slot="trailingIcon" bind:variable={phone} />
            </Textfield>
            <div id="phone-error" class="input_error" class:invalid="{invalidPhone}">Invalid phone number.</div>
        </div>
    </div>
    <div class="grid-cell">
        <div class:hidden={editPhone}>
            <Button type="button" color="primary" variant="raised" on:click={() => (editPhone = true)} >
                <Label>Edit</Label>
            </Button>
        </div>
        <div class:hidden={!editPhone || working}>
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

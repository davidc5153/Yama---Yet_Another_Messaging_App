<script lang="ts">
    import Button, { Label } from "@smui/button";
    import Textfield from "@smui/textfield";
    import ApiRequest from "../../lib/api";
    import { setToken } from "../../lib/token";
    import ClearField from "../Clear-Field.svelte";
    import { STORE_newAlert } from "./../../stores";
    import CircularProgress from '@smui/circular-progress';

    export let oldPassword

    let name: string = localStorage.getItem("name")
    let editName = false;
    let working = false

    async function updateName() {
        working = true
        try {
            let response = await ApiRequest.userPatchData({name: name});
            await setToken(response, oldPassword);
            editName = false;
            $STORE_newAlert = {
                alertText: "Your name has been updated.",
                alertObject: null,
                alertClass: "info"
            }
        } catch (err) {
            console.error(err);
            $STORE_newAlert = {
                alertText: "Name update error.",
                alertObject: err,
                alertClass: "dangerous"
            }            
        }
        working = false
    }
    
    function cancelEdit() {
        editName = false; 
        name = localStorage.getItem("name") 
    } 

</script>

<div class="grid-cell full-width">
    <h3>Name</h3>
</div>
<form on:submit|preventDefault={updateName} class="grid-container">
    <div class="grid-cell">
        <div class:hidden={editName}>
            <p>{name}</p>
        </div>
        <div class:hidden={!editName}>
            <Textfield variant="outlined" bind:value={name} label="Enter Username">
                <ClearField slot="trailingIcon" bind:variable={name} />
            </Textfield>
        </div>
    </div>
    <div class="grid-cell">
        <div class:hidden={editName}>
            <Button type="button" color="primary" variant="raised" on:click={() => (editName = true)} >
                <Label>Edit</Label>
            </Button>
        </div>
        <div class:hidden={!editName || working}>
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

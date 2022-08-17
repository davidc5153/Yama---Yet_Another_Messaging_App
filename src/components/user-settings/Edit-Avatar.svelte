<script lang="ts">
    import Button, { Label } from "@smui/button";
    import Avatar from "./../Avatar.svelte"
    import ApiRequest from "../../lib/api";
    import { setToken } from "../../lib/token";
    import { STORE_newAlert, STORE_loggedIn } from "./../../stores";
    import CircularProgress from '@smui/circular-progress';

    export let oldPassword

    let working = false
    let avatar = { 
        _id: localStorage.getItem("_id"),
        avatar: localStorage.getItem("avatar")
    }
    if (!avatar.avatar || avatar.avatar=="null" || avatar.avatar.length < 5) {
        avatar.avatar = null;
    }
    let editAvatar = false;
    let newAvatars = []

    function cancelEdit() {
        editAvatar = false
    }

    async function updateAvatar(avatarObj) {
        working = true
        try {
            let response = await ApiRequest.userPatchData({avatar: avatarObj.avatar});
            await setToken(response, oldPassword);
            avatar = avatarObj
            editAvatar = false;
            // Toggle STORE_loggedIn to force avatar update in the header 
            $STORE_loggedIn = false
            $STORE_loggedIn = true
            $STORE_newAlert = {
                alertText: "Your avatar has been updated.",
                alertObject: null,
                alertClass: "info"
            }
        } catch (err) {
            console.error(err);
            $STORE_newAlert = {
                alertText: "Avatar update error.",
                alertObject: err,
                alertClass: "dangerous"
            }
        }
        working = false
    }

    function getNewAvatars() {
        let currentTime = new Date().getTime();
        newAvatars = []
        for (let i = 1; i < 6; i++) {
            newAvatars.push( { avatar: "" + i + currentTime} );
        }
        editAvatar = true
    }

</script>

<div class="grid-cell full-width">
    <h3>Avatar</h3>
</div>
<div class="grid-container">
    <div class="grid-cell current-icon">
        <div>
            <Avatar object={avatar} />
        </div>
    </div>
    <div class="grid-cell">
        <div class:hidden={editAvatar}>
            <Button type="button" color="primary" variant="raised" on:click={getNewAvatars} >
                <Label>Edit</Label>
            </Button>
        </div>
        <div class:hidden={!editAvatar}>
            <Button type="button" on:click={ cancelEdit }>
                <Label>Cancel</Label>
            </Button>
        </div>
    </div>
    <div class="grid-cell" class:hidden={!editAvatar || working}>
        <p>Select New Avatar</p>
        <div class="sub-grid-container">
            {#each newAvatars as avatars}
                <div class="sub-grid-cell">
                    <Avatar object={avatars} on:click={ () => { updateAvatar(avatars) } }/>
                </div>
            {/each}
            <div class="sub-grid-cell">
                <Button color="primary" variant="raised" on:click={getNewAvatars} type="button">
                    <Label>More</Label>
                </Button>
            </div>
        </div>
    </div>
    <div class:hidden={!editAvatar || !working}>
        <CircularProgress style="height: 32px; width: 32px;" indeterminate />
    </div>
</div>

<style lang="scss">
    .current-icon {
        pointer-events: none;
    }
    .sub-grid-container {
        display: grid;
        grid-template-columns: auto auto auto auto auto auto;
        padding: 0;
        margin: 0;
        width: 100%;
    }
    .sub-grid-cell {
        padding: 0 auto;
        margin: 0 auto;
    }

</style>
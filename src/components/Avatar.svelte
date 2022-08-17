<script lang="ts">
    import Fab, { Icon } from "@smui/fab";
    import { Svg } from "@smui/common/elements";
    import { createAvatar } from "@dicebear/avatars";
    import * as style from "@dicebear/avatars-identicon-sprites";
    export let object;

    /*
     * When avatar is for a message, use message.user as seed (as message._id is the id of the individual message)
     * Everywhere else, we use object._id as the seed (eg: user._id)
     */

</script>

{#if object}
    <Fab color="primary" mini style="margin:5px 0;" on:click>
        <Icon component={Svg} viewbox="1 1 24 24">
            {#if object.avatar && object.avatar!="null" && object.avatar.length>=5}
                {@html createAvatar(style, {seed: object.avatar})}
            {:else}
                {#if object.user}
                    {@html createAvatar(style, {seed: object.user})}
                {:else}
                    {@html createAvatar(style, {seed: object._id})}
                {/if}
            {/if}
        </Icon>
    </Fab>
{/if}

<script lang="ts">
    import { push } from "svelte-spa-router";

    export let params = {
        token: ''
    }

    if (!params.token || params.token.length == 0) {
        push('/chat/')
    }
</script>
<div>
    <h1>Cancelled</h1>
    <div>Your invitation has been cancelled.</div>
</div>
<br/>
<div>Return to <a href="#/chat/">YaMa</a></div>

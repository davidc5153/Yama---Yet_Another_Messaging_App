<script lang="ts">

    /**
     * Route error page to redirect the User back to the main chat page
     */
    
    import Footer from "../components/Footer.svelte"
    import Button, { Label } from "@smui/button";
</script>

<h1>Ooops. That page can not be found.</h1>
<div>
    <p>Return to <a href="/#/chat">YaMa and start chatting</a>!</p>
</div>
<div>
    <Button color="primary" href="/#/chat" variant="raised" type="button">
        <Label>Chat</Label>
    </Button>
</div>	
<Footer/>

<script lang="ts">
    import Footer from "../components/Footer.svelte";
</script>

<div class="page-wrapper">
    <h1>About Us</h1>
    <a href="https://yama-documentation.vercel.app/">YaMa README</a>
    <p>
        Hello, and welcome to YaMa, a secure messaging app for the modern world.
        YaMa provides an easy, enjoyable way to communicate with your family,
        friends or colleagues. It is a web application that is simple and free
        to use for everyone. With YaMa you can send text or voice messages as
        well as create groups or channels for people to join and communicate
        with. Our mission is to provide users with a messaging application that
        is both private and secure. That is why at YaMa we support end-to-end
        encryption for voice and text messages so you can be ensured that your
        conversations remains private.
    </p>

    <h1>The team</h1>
    <div class="grid-container">
        <div class="grid-cell team">
            <h3>David Ceccato</h3>
            <img
                src="https://img2.cgtrader.com/items/157405/f4e0a0fa2b/smiley-face-3d-model-obj-3ds-fbx-c4d.jpg"
                alt="Italian Trulli"
            />
            <p>"Success is a journey not a destination"</p>
        </div>
        <div class="grid-cell team">
            <h3>Jaekyoung Chang</h3>
            <img
                src="https://img2.cgtrader.com/items/157405/f4e0a0fa2b/smiley-face-3d-model-obj-3ds-fbx-c4d.jpg"
                alt="Italian Trulli"
            />
            <p>"Collect moments, not things"</p>
        </div>
        <div class="grid-cell team">
            <h3>Murray Lowis</h3>
            <img
                src="https://img2.cgtrader.com/items/157405/f4e0a0fa2b/smiley-face-3d-model-obj-3ds-fbx-c4d.jpg"
                alt="Italian Trulli"
            />
            <p>"Laziness is the first step to efficiency"</p>
        </div>
        <div class="grid-cell team">
            <h3>Stephen Patrikios</h3>
            <img
                src="https://img2.cgtrader.com/items/157405/f4e0a0fa2b/smiley-face-3d-model-obj-3ds-fbx-c4d.jpg"
                alt="Italian Trulli"
            />
            <p>"Live, laugh, love"</p>
        </div>
        <div class="grid-cell team">
            <h3>Jacob Pyke</h3>
            <img
                src="https://img2.cgtrader.com/items/157405/f4e0a0fa2b/smiley-face-3d-model-obj-3ds-fbx-c4d.jpg"
                alt="Italian Trulli"
            />
            <p>"Do or do not, there is no try"</p>
        </div>
        <div class="grid-cell team">
            <h3>Malcolm Tsang</h3>
            <img
                src="https://img2.cgtrader.com/items/157405/f4e0a0fa2b/smiley-face-3d-model-obj-3ds-fbx-c4d.jpg"
                alt="Italian Trulli"
            />
            <p>
                "The happiest people don't have the best of everything, they
                make the best of everything"
            </p>
        </div>
    </div>
</div>

<Footer />

<style lang="scss">
    .grid-container {
        display: grid;
        grid-template-columns: auto auto auto;
        padding: 10px;
        width: min-content;
        margin: 0 auto;
    }

    .grid-cell {
        padding: 0 10px;
        width: 200px;
        margin: 10px 0 10px 0;
    }

    img {
        width: 100px;
    }

    @media screen and (max-width: 1000px) {
        .grid-container {
            grid-template-columns: auto auto;
        }
    }

    @media screen and (max-width: 600px) {
        .grid-container {
            grid-template-columns: auto;
        }
    }
</style>

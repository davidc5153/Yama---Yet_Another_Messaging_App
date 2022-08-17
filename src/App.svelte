<script lang="ts">
	import Router from 'svelte-spa-router'
	import routes from './routes'
	import Header from "./components/Header.svelte"

	// Register the Service Worker (if possible)
	if ('serviceWorker' in navigator) {
  		// Wait for the 'load' event to not block other work
		window.addEventListener('load', async () => {
			// Try to register the service worker.
			try {
				const reg = await navigator.serviceWorker.register("service-worker.js");
				console.log('[ServiceWorker] Registered!');
			} catch (err) {
				console.warn('[ServiceWorker] Registration failed: ', err);
			}
		});
	}

</script>

<Header />
<page-content>
	<Router {routes} />
</page-content>

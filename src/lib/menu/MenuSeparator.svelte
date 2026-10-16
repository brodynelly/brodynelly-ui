<script>
	/**
	 * @typedef {Object} Props
	 * @property {string} [id]
	 * @property {string} [class]
	 * @property {string} [style]
	 */

	/** @type {Props} */
	let { id, class: className = '', style } = $props();
</script>

<hr class={`menu-separator ${className}`} {id} {style} />

<style>
	.menu-separator {
		background: var(--menu-separator, rgb(60 60 67 / 20%));
		border: 0;
		flex: 0 0 1px;
		height: 1px;
		margin: 10px 8px;
	}

	@media (prefers-color-scheme: dark) {
		.menu-separator {
			background: var(--menu-separator, rgb(235 235 245 / 24%));
		}
	}

	@media (prefers-contrast: more), (forced-colors: active) {
		.menu-separator {
			background: currentColor;
		}
	}
</style>

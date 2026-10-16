<script>
	/**
	 * A neutral, text-first empty state. Illustrations are opt-in; their snippet
	 * owns any image labels or decorative aria-hidden attributes. No live region
	 * or focus movement is added. `class` and `style` apply to the section.
	 * @typedef {Object} Props
	 * @property {string} title Required visible heading and section name.
	 * @property {string} [description=''] Supporting explanation or next-step guidance.
	 * @property {import('svelte').Snippet} [illustration] Optional illustration above the message.
	 * @property {import('svelte').Snippet} [action] Optional actions below the content.
	 * @property {import('svelte').Snippet} [children] Optional additional content below the description.
	 * @property {import('svelte/elements').HTMLAttributes<HTMLElement>['class']} [class]
	 * @property {string} [style]
	 */
	/** @type {Props} */
	let {
		title,
		description = '',
		illustration,
		action,
		children,
		class: className,
		style
	} = $props();

	const id = $props.id();
</script>

<section
	class={['apple-empty-state', className]}
	{style}
	aria-labelledby={`${id}-title`}
	aria-describedby={description ? `${id}-description` : undefined}
>
	<div class="empty-state-content">
		{#if illustration}
			<div class="empty-state-illustration">{@render illustration()}</div>
		{/if}
		<div class="empty-state-message">
			<h2 class="empty-state-title" id={`${id}-title`}>{title}</h2>
			{#if description}
				<p class="empty-state-description" id={`${id}-description`}>{description}</p>
			{/if}
		</div>
		{#if children}
			<div class="empty-state-details">{@render children()}</div>
		{/if}
		{#if action}
			<div class="empty-state-action">{@render action()}</div>
		{/if}
	</div>
</section>

<style>
	.apple-empty-state {
		--empty-state-text: var(--labels-primary, #000);
		--empty-state-secondary-text: var(--labels-secondary, #3c3c4399);
		align-items: center;
		box-sizing: border-box;
		color: var(--empty-state-text);
		display: flex;
		font-family: var(
			--apple-font-body,
			var(--sans-serif-font-family, ui-sans-serif, system-ui, -apple-system, sans-serif)
		);
		font-size: 1.0625rem;
		inline-size: 100%;
		justify-content: center;
		line-height: 1.5295;
		min-inline-size: 0;
		overflow-wrap: anywhere;
		padding: 36px;
		text-align: center;
		user-select: text;
	}

	/* Source content is 330px wide, with a 298px message and a 16px illustration gap. */
	.empty-state-content {
		align-items: center;
		display: flex;
		flex-direction: column;
		gap: 16px;
		inline-size: 100%;
		max-inline-size: 20.625rem;
		min-inline-size: 0;
	}

	.empty-state-illustration {
		max-inline-size: 100%;
	}

	.empty-state-illustration :global(svg),
	.empty-state-illustration :global(img) {
		display: block;
		block-size: auto;
		max-inline-size: 100%;
	}

	.empty-state-message,
	.empty-state-details {
		inline-size: 100%;
		max-inline-size: 18.625rem;
		min-inline-size: 0;
	}

	.empty-state-title {
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1.3;
		margin: 0;
		text-size-adjust: auto;
	}

	.empty-state-description {
		/* Strengthen the source's translucent secondary label for normal-size web text. */
		color: color-mix(in srgb, var(--empty-state-secondary-text) 80%, var(--empty-state-text));
		font-size: inherit;
		line-height: inherit;
		margin: 0;
		text-size-adjust: auto;
	}

	.empty-state-action {
		align-items: center;
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		inline-size: 100%;
		justify-content: center;
		min-inline-size: 0;
	}

	@media (prefers-color-scheme: dark) {
		.apple-empty-state {
			--empty-state-text: var(--labels-primary, #fff);
			--empty-state-secondary-text: var(--labels-secondary, #ebebf599);
		}
	}

	@media (prefers-contrast: more) {
		.apple-empty-state {
			--empty-state-secondary-text: var(--empty-state-text);
		}
	}

	@media (forced-colors: active) {
		.apple-empty-state {
			--empty-state-text: CanvasText;
			--empty-state-secondary-text: CanvasText;
		}
	}
</style>

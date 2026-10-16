<script>
	/**
	 * A determinate native progress indicator. Finite values are clamped to 0–max;
	 * non-finite values become 0 and non-positive/non-finite maxima become 100.
	 * Updates are immediate rather than animated. `class` and `style` apply to the wrapper.
	 * @typedef {Object} Props
	 * @property {number} [value=0] Current completed amount.
	 * @property {number} [max=100] Positive, finite total amount.
	 * @property {string} label Required visible and accessible label.
	 * @property {boolean} [showValue=true] Show the completed percentage beside the label.
	 * @property {import('svelte/elements').HTMLAttributes<HTMLDivElement>['class']} [class]
	 * @property {string} [style]
	 */
	/** @type {Props} */
	let { value = 0, max = 100, label, showValue = true, class: className, style } = $props();

	const progressId = $props.id();
	const safeMax = $derived(Number.isFinite(max) && max > 0 ? max : 100);
	const safeValue = $derived(Number.isFinite(value) ? Math.min(safeMax, Math.max(0, value)) : 0);
	const valueText = $derived(`${Math.round((safeValue / safeMax) * 100)}%`);
</script>

<div class={['apple-progress-bar', className]} {style}>
	<label class="progress-label" for={progressId}>
		<span id={`${progressId}-label`}>{label}</span>
		{#if showValue}
			<span class="progress-value" aria-hidden="true">{valueText}</span>
		{/if}
	</label>
	<div class="progress-track">
		<progress
			id={progressId}
			value={safeValue}
			max={safeMax}
			aria-labelledby={`${progressId}-label`}
			aria-valuetext={valueText}
		>
			{valueText}
		</progress>
	</div>
</div>

<style>
	.apple-progress-bar {
		--progress-fill: var(--apple-accent, var(--colors-accent, #0088ff));
		--progress-track: var(--fills-primary, #78787833);
		--progress-text: var(--labels-primary, #000);
		box-sizing: border-box;
		color: var(--progress-text);
		font-family: var(
			--apple-font-body,
			var(--sans-serif-font-family, ui-sans-serif, system-ui, -apple-system, sans-serif)
		);
		font-size: 0.9375rem;
		line-height: 1.3334;
		min-inline-size: 0;
		inline-size: 100%;
	}

	.progress-label {
		align-items: baseline;
		cursor: default;
		display: flex;
		flex-wrap: wrap;
		gap: 4px 12px;
		justify-content: space-between;
		overflow-wrap: anywhere;
		padding-inline: 16px;
		text-size-adjust: auto;
	}

	.progress-value {
		flex-shrink: 0;
		font-variant-numeric: tabular-nums;
	}

	/* Source allocation: 402 × 44, with a 370 × 4 track inset by 16 × 20. */
	.progress-track {
		box-sizing: border-box;
		padding: 20px 16px;
	}

	progress {
		-webkit-appearance: none;
		appearance: none;
		background: var(--progress-track);
		border: 0;
		border-radius: 100px;
		color: var(--progress-fill);
		display: block;
		block-size: 4px;
		inline-size: 100%;
		margin: 0;
		padding: 0;
	}

	progress::-webkit-progress-bar {
		/* The element paints the translucent track once, also supporting Firefox. */
		background: transparent;
		border-radius: inherit;
	}

	progress::-webkit-progress-value {
		background: var(--progress-fill);
		border-radius: inherit;
	}

	progress::-moz-progress-bar {
		background: var(--progress-fill);
		border-radius: inherit;
	}

	@media (prefers-color-scheme: dark) {
		.apple-progress-bar {
			--progress-track: var(--fills-primary, #7878805c);
			--progress-text: var(--labels-primary, #fff);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		progress {
			animation: none;
			transition: none;
		}

		progress::-webkit-progress-value {
			animation: none;
			transition: none;
		}

		progress::-moz-progress-bar {
			animation: none;
			transition: none;
		}
	}

	@media (prefers-reduced-transparency: reduce) {
		.apple-progress-bar {
			--progress-track: #d1d1d6;
		}

		@media (prefers-color-scheme: dark) {
			.apple-progress-bar {
				--progress-track: #48484a;
			}
		}
	}

	@media (prefers-contrast: more) {
		.apple-progress-bar {
			--progress-fill: #006ac4;
			--progress-track: #c7c7cc;
		}

		progress {
			outline: 1px solid currentColor;
			outline-offset: 1px;
		}

		@media (prefers-color-scheme: dark) {
			.apple-progress-bar {
				--progress-fill: #66b3ff;
				--progress-track: #48484a;
			}
		}
	}

	@media (forced-colors: active) {
		.apple-progress-bar {
			--progress-fill: Highlight;
			--progress-track: Canvas;
			--progress-text: CanvasText;
		}

		progress {
			appearance: auto;
			accent-color: Highlight;
			outline: 1px solid CanvasText;
			outline-offset: 1px;
		}
	}
</style>

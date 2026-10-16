import { userEvent } from 'vitest/browser';
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Switch from './Switch.svelte';
import Slider from './Slider.svelte';
import Stepper from './Stepper.svelte';
import SearchField from './SearchField.svelte';
import ControlsFixture from './fixtures/ControlsFixture.svelte';

function callbacks() {
	return {
		onSwitchChange: vi.fn(),
		onSliderInput: vi.fn(),
		onSliderChange: vi.fn(),
		onStepperChange: vi.fn(),
		onSearchInput: vi.fn(),
		onSearchChange: vi.fn()
	};
}

describe('standalone controls', () => {
	it('renders native controls with the documented defaults without shared CSS', async () => {
		const toggle = await render(Switch, { label: 'Notifications' });
		const slider = await render(Slider, { label: 'Brightness' });
		const stepper = await render(Stepper, { label: 'Count' });
		const search = await render(SearchField);

		await expect.element(toggle.getByRole('switch', { name: 'Notifications' })).not.toBeChecked();
		expect(toggle.getByRole('switch').element()).toHaveAttribute('type', 'checkbox');
		await expect.element(slider.getByRole('slider', { name: 'Brightness' })).toHaveValue('50');
		expect(slider.getByRole('slider').element()).toHaveAttribute('min', '0');
		expect(slider.getByRole('slider').element()).toHaveAttribute('max', '100');
		expect(slider.getByRole('slider').element()).toHaveAttribute('step', '1');
		await expect.element(stepper.getByRole('status', { name: 'Count' })).toHaveTextContent('0');
		await expect.element(stepper.getByRole('button', { name: 'Decrease Count' })).toBeDisabled();
		await expect.element(search.getByRole('searchbox', { name: 'Search' })).toHaveValue('');
		expect(search.getByRole('searchbox').element()).toHaveAttribute('placeholder', 'Search');
	});

	it('gives repeated controls unique label associations and forwards native attributes', async () => {
		const screens = [
			await render(Switch, { label: 'Repeated', name: 'preference', class: 'custom-switch' }),
			await render(Switch, { label: 'Repeated' }),
			await render(Slider, { label: 'Repeated', name: 'level', style: '--apple-accent: red' }),
			await render(Slider, { label: 'Repeated' }),
			await render(SearchField, { label: 'Repeated', name: 'query', autocomplete: 'off' }),
			await render(SearchField, { label: 'Repeated' })
		];
		const inputs = screens.map((screen) => screen.container.querySelector('input'));

		expect(new Set(inputs.map((input) => input.id)).size).toBe(inputs.length);
		for (const input of inputs) {
			expect(input.id).not.toBe('');
			expect(input.labels).toHaveLength(1);
			expect(input.labels[0].htmlFor).toBe(input.id);
		}
		expect(inputs[0]).toHaveAttribute('name', 'preference');
		expect(screens[0].container.querySelector('.apple-switch')).toHaveClass('custom-switch');
		expect(
			screens[2].container.querySelector('.apple-slider').style.getPropertyValue('--apple-accent')
		).toBe('red');
		expect(inputs[4]).toHaveAttribute('autocomplete', 'off');
	});

	it('reflects parent-side binding changes without emitting user callbacks', async () => {
		const handlers = callbacks();
		const screen = await render(ControlsFixture, handlers);

		await screen.getByRole('button', { name: 'Update bindings' }).click();

		await expect.element(screen.getByRole('switch')).toBeChecked();
		await expect.element(screen.getByRole('slider')).toHaveValue('75');
		await expect.element(screen.getByRole('status', { name: 'Copies' })).toHaveTextContent('2');
		await expect.element(screen.getByRole('searchbox')).toHaveValue('Updated');
		for (const handler of Object.values(handlers)) expect(handler).not.toHaveBeenCalled();
	});

	it('uses native disabled behavior for every control and can be enabled again', async () => {
		const handlers = callbacks();
		const screen = await render(ControlsFixture, {
			disabled: true,
			searchValue: 'Existing',
			...handlers
		});
		const controls = [
			screen.getByRole('switch'),
			screen.getByRole('slider'),
			screen.getByRole('button', { name: 'Decrease Copies' }),
			screen.getByRole('button', { name: 'Increase Copies' }),
			screen.getByRole('searchbox'),
			screen.getByRole('button', { name: 'Clear Search music' })
		];

		for (const control of controls) {
			await expect.element(control).toBeDisabled();
			control.element().click();
			control.element().focus();
			expect(document.activeElement).not.toBe(control.element());
		}
		await tick();
		await expect.element(screen.getByTestId('bound-switch')).toHaveTextContent('false');
		await expect.element(screen.getByTestId('bound-slider')).toHaveTextContent('50');
		await expect.element(screen.getByTestId('bound-stepper')).toHaveTextContent('0');
		await expect.element(screen.getByTestId('bound-search')).toHaveTextContent('Existing');
		for (const handler of Object.values(handlers)) expect(handler).not.toHaveBeenCalled();

		await screen.getByRole('button', { name: 'Enable controls' }).click();
		await expect.element(screen.getByRole('switch')).toBeEnabled();
		await expect.element(screen.getByRole('slider')).toBeEnabled();
		await expect.element(screen.getByRole('button', { name: 'Increase Copies' })).toBeEnabled();
		await expect.element(screen.getByRole('searchbox')).toBeEnabled();
		await expect.element(screen.getByRole('button', { name: 'Decrease Copies' })).toBeDisabled();
	});
});

describe('Switch', () => {
	it('binds on label clicks and native Space, with checked state available inside callbacks', async () => {
		const onchange = vi.fn();
		const screen = await render(ControlsFixture, { onSwitchChange: onchange });
		const toggle = screen.getByRole('switch', { name: 'Wi-Fi' });

		await screen.getByText('Wi-Fi', { exact: true }).click();
		await expect.element(toggle).toBeChecked();
		await expect.element(screen.getByTestId('bound-switch')).toHaveTextContent('true');
		expect(onchange).toHaveBeenLastCalledWith({ value: true, bound: true, type: 'change' });

		toggle.element().focus();
		await userEvent.keyboard(' ');
		await expect.element(toggle).not.toBeChecked();
		await expect.element(screen.getByTestId('bound-switch')).toHaveTextContent('false');
		expect(onchange).toHaveBeenCalledTimes(2);
		expect(onchange).toHaveBeenLastCalledWith({ value: false, bound: false, type: 'change' });
		expect(toggle.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
		expect(toggle.element().getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
	});

	it('participates in native form data as a checkbox', async () => {
		const screen = await render(ControlsFixture);
		const form = screen.container.querySelector('form');

		expect(new FormData(form).has('wifi')).toBe(false);
		await screen.getByRole('switch').click();
		expect(new FormData(form).get('wifi')).toBe('on');
	});
});

describe('Slider', () => {
	it('normalizes off-grid values and changed bounds/step from the real native range without callbacks', async () => {
		const oninput = vi.fn();
		const onchange = vi.fn();
		const screen = await render(ControlsFixture, {
			sliderValue: 55,
			sliderStep: 10,
			onSliderInput: oninput,
			onSliderChange: onchange
		});
		const input = screen.getByRole('slider').element();
		const expectSynchronized = async (expected, fill) => {
			await expect.poll(() => input.valueAsNumber).toBe(expected);
			await expect.element(screen.getByTestId('bound-slider')).toHaveTextContent(String(expected));
			expect(screen.container.querySelector('.slider-value').textContent).toBe(String(expected));
			expect(parseFloat(input.style.getPropertyValue('--slider-progress'))).toBeCloseTo(fill);
			expect(oninput).not.toHaveBeenCalled();
			expect(onchange).not.toHaveBeenCalled();
		};
		await expectSynchronized(60, 60);
		await screen.rerender({ sliderMax: 20 });
		await expectSynchronized(20, 100);
		await screen.rerender({ sliderMax: 100, sliderValue: 55, sliderStep: 30 });
		await expectSynchronized(60, 60);
		await screen.rerender({ sliderMin: 10, sliderValue: -5, sliderStep: 7 });
		await expectSynchronized(10, 0);
		await screen.rerender({ sliderValue: 25.5, sliderStep: 0.5 });
		await expectSynchronized(25.5, (15.5 / 90) * 100);
	});

	it('uses native Arrow/Home/End behavior and updates bindings, fill, and callbacks immediately', async () => {
		const oninput = vi.fn();
		const onchange = vi.fn();
		const screen = await render(ControlsFixture, {
			onSliderInput: oninput,
			onSliderChange: onchange
		});
		const slider = screen.getByRole('slider', { name: 'Volume' });

		slider.element().focus();
		await userEvent.keyboard('{ArrowRight}');
		await expect.element(slider).toHaveValue('51');
		await expect.element(screen.getByTestId('bound-slider')).toHaveTextContent('51');
		expect(oninput).toHaveBeenLastCalledWith({ value: 51, bound: 51, type: 'input' });
		expect(onchange).toHaveBeenLastCalledWith({ value: 51, bound: 51, type: 'change' });
		expect(slider.element().style.getPropertyValue('--slider-progress')).toBe('51%');

		await userEvent.keyboard('{Home}');
		await expect.element(slider).toHaveValue('0');
		await userEvent.keyboard('{End}');
		await expect.element(slider).toHaveValue('100');
		await expect.element(screen.getByTestId('bound-slider')).toHaveTextContent('100');
		expect(slider.element().style.getPropertyValue('--slider-progress')).toBe('100%');
		expect(slider.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
		expect(getComputedStyle(slider.element()).appearance).toBe('none');
	});

	it('respects custom native min, max, and step on the keyboard', async () => {
		const screen = await render(ControlsFixture, {
			sliderValue: 12,
			sliderMin: 10,
			sliderMax: 20,
			sliderStep: 2
		});
		const slider = screen.getByRole('slider');

		slider.element().focus();
		await userEvent.keyboard('{ArrowRight}');
		await expect.element(slider).toHaveValue('14');
		await expect.element(screen.getByTestId('bound-slider')).toHaveTextContent('14');
		await userEvent.keyboard('{End}{ArrowRight}');
		await expect.element(slider).toHaveValue('20');
		await userEvent.keyboard('{Home}{ArrowLeft}');
		await expect.element(slider).toHaveValue('10');
	});
});

describe('Stepper', () => {
	it('has 44px native buttons, keyboard activation, an announced value, and disabled bounds', async () => {
		const onchange = vi.fn();
		const screen = await render(ControlsFixture, { stepperMax: 2, onStepperChange: onchange });
		const decrease = screen.getByRole('button', { name: 'Decrease Copies' });
		const increase = screen.getByRole('button', { name: 'Increase Copies' });
		const output = screen.getByRole('status', { name: 'Copies' });

		await expect.element(screen.getByRole('group', { name: 'Copies' })).toBeVisible();
		await expect.element(decrease).toBeDisabled();
		expect(output.element()).toHaveAttribute('aria-live', 'polite');
		for (const button of [decrease, increase]) {
			expect(button.element().tagName).toBe('BUTTON');
			expect(button.element()).toHaveAttribute('type', 'button');
			expect(button.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
			expect(button.element().getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
		}

		increase.element().focus();
		await userEvent.keyboard('{Enter}');
		await expect.element(output).toHaveTextContent('1');
		await expect.element(screen.getByTestId('bound-stepper')).toHaveTextContent('1');
		expect(onchange).toHaveBeenLastCalledWith({ value: 1, bound: 1, type: 'click' });
		await userEvent.keyboard(' ');
		await expect.element(output).toHaveTextContent('2');
		await expect.element(increase).toBeDisabled();
		increase.element().click();
		expect(onchange).toHaveBeenCalledTimes(2);

		await decrease.click();
		await decrease.click();
		await expect.element(output).toHaveTextContent('0');
		await expect.element(decrease).toBeDisabled();
		await expect.element(screen.getByTestId('submissions')).toHaveTextContent('0');
	});

	it('handles decimal steps, clamps at bounds, and synchronizes changed bounds without callbacks', async () => {
		const onchange = vi.fn();
		const screen = await render(ControlsFixture, {
			stepperMax: 0.3,
			stepperStep: 0.1,
			onStepperChange: onchange
		});
		const increase = screen.getByRole('button', { name: 'Increase Copies' });

		await increase.click();
		await increase.click();
		await increase.click();
		await expect.element(screen.getByTestId('bound-stepper')).toHaveTextContent('0.3');
		await expect.element(increase).toBeDisabled();
		expect(onchange).toHaveBeenLastCalledWith({ value: 0.3, bound: 0.3, type: 'click' });

		await screen.rerender({ stepperMax: 0.15 });
		await expect.element(screen.getByRole('status', { name: 'Copies' })).toHaveTextContent('0.15');
		await expect.element(screen.getByTestId('bound-stepper')).toHaveTextContent('0.15');
		expect(onchange).toHaveBeenCalledTimes(3);
	});
});

describe('SearchField', () => {
	it('binds native typing/commit events and supports keyboard clearing with focus restoration', async () => {
		const oninput = vi.fn();
		const onchange = vi.fn();
		const screen = await render(ControlsFixture, {
			onSearchInput: oninput,
			onSearchChange: onchange
		});
		const input = screen.getByRole('searchbox', { name: 'Search music' });

		await input.fill('Piano');
		await expect.element(screen.getByTestId('bound-search')).toHaveTextContent('Piano');
		expect(oninput).toHaveBeenLastCalledWith({ value: 'Piano', bound: 'Piano', type: 'input' });
		await userEvent.tab();
		const clear = screen.getByRole('button', { name: 'Clear Search music' });
		await expect.element(clear).toHaveFocus();
		expect(onchange).toHaveBeenLastCalledWith({ value: 'Piano', bound: 'Piano', type: 'change' });
		await userEvent.keyboard('{Enter}');

		await expect.element(input).toHaveValue('');
		await expect.element(input).toHaveFocus();
		await expect.element(screen.getByTestId('bound-search')).toHaveTextContent('');
		await expect.element(clear).not.toBeInTheDocument();
		expect(oninput).toHaveBeenLastCalledWith({ value: '', bound: '', type: 'input' });
		expect(onchange).toHaveBeenLastCalledWith({ value: '', bound: '', type: 'change' });
		await expect.element(screen.getByTestId('submissions')).toHaveTextContent('0');
	});

	it('clears using a 44px native button, keeps native form data current, and never submits', async () => {
		const screen = await render(ControlsFixture, { searchValue: 'Albums' });
		const clear = screen.getByRole('button', { name: 'Clear Search music' });
		const input = screen.getByRole('searchbox');
		const form = screen.container.querySelector('form');

		expect(new FormData(form).get('query')).toBe('Albums');
		expect(clear.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
		expect(clear.element().getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
		await clear.click();
		await expect.element(input).toHaveValue('');
		await expect.element(input).toHaveFocus();
		expect(new FormData(form).get('query')).toBe('');
		await expect.element(screen.getByTestId('submissions')).toHaveTextContent('0');
	});

	it('preserves native readonly values, including the clear action', async () => {
		const oninput = vi.fn();
		const screen = await render(SearchField, { value: 'Read only', readonly: true, oninput });
		const input = screen.getByRole('searchbox');
		const clear = screen.getByRole('button', { name: 'Clear Search' });

		await expect.element(clear).toBeDisabled();
		clear.element().click();
		input.element().focus();
		await userEvent.keyboard('x');
		await expect.element(input).toHaveValue('Read only');
		expect(oninput).not.toHaveBeenCalled();
	});
});

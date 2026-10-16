import { describe, expect, it } from 'vitest';
import { releaseVelocity, shouldDismiss, stepSpring } from './sheet-motion.js';

describe('sheet motion', () => {
	it('springs back from the current value, not from a fixed animation origin', () => {
		const next = stepSpring(75, 0, 0, 1 / 60);
		expect(next.position).toBeGreaterThan(0);
		expect(next.position).toBeLessThan(75);
		expect(next.velocity).toBeLessThan(0);
		expect(next.settled).toBe(false);
	});

	it('inherits release velocity and settles without crossing the upper boundary', () => {
		let state = { position: 75, velocity: 1200, settled: false };
		state = stepSpring(state.position, state.velocity, 0, 1 / 120, 400);
		expect(state.position).toBeGreaterThan(75);
		for (let frame = 0; frame < 240; frame += 1) {
			state = stepSpring(state.position, state.velocity, 0, 1 / 120, 400);
			expect(state.position).toBeGreaterThanOrEqual(0);
			expect(state.position).toBeLessThanOrEqual(400);
		}
		expect(state).toEqual({ position: 0, velocity: 0, settled: true });
	});

	it('remains bounded and finite after a stalled frame or an upward fling', () => {
		const down = stepSpring(90, 3000, 100, 20, 100);
		const up = stepSpring(10, -3000, 0, 1 / 60, 100);
		expect(down.position).toBeLessThanOrEqual(100);
		expect(Number.isFinite(down.velocity)).toBe(true);
		expect(up.position).toBe(0);
		expect(up.velocity).toBe(0);
	});

	it('projects a short fling and respects an upward reversal', () => {
		expect(shouldDismiss(50, 1500, 450)).toBe(true);
		expect(shouldDismiss(180, -1500, 450)).toBe(false);
		expect(shouldDismiss(30, 0, 450)).toBe(false);
		expect(shouldDismiss(180, 0, 450)).toBe(true);
		expect(shouldDismiss(0, 3000, 450)).toBe(false);
	});

	it('uses recent position history and drops stale release momentum', () => {
		const samples = [
			{ position: 0, time: 0 },
			{ position: 20, time: 20 },
			{ position: 40, time: 40 }
		];
		expect(releaseVelocity(samples, 40)).toBe(1000);
		expect(releaseVelocity([...samples, { position: 40, time: 200 }], 200)).toBe(0);
		expect(
			releaseVelocity(
				[
					{ position: 0, time: 0 },
					{ position: 500, time: 1 }
				],
				1
			)
		).toBe(3000);
	});
});

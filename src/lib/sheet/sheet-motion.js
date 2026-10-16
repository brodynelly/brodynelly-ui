const frequency = 22;

/**
 * An exact critically damped spring step, in pixels and seconds. Unlike a timed
 * easing, it can be retargeted from any presentation value and release velocity.
 * @param {number} position
 * @param {number} velocity Pixels per second.
 * @param {number} target
 * @param {number} elapsed Seconds since the previous frame.
 * @param {number} [maximum=Infinity]
 */
export function stepSpring(position, velocity, target, elapsed, maximum = Infinity) {
	const time = Math.max(0, Math.min(elapsed, 0.064));
	const displacement = position - target;
	const coefficient = velocity + frequency * displacement;
	const decay = Math.exp(-frequency * time);
	const next = target + (displacement + coefficient * time) * decay;
	let nextVelocity = (velocity - frequency * coefficient * time) * decay;
	const nextPosition = Math.max(0, Math.min(next, maximum));

	if (next !== nextPosition) nextVelocity = 0;
	const settled = Math.abs(nextPosition - target) < 0.25 && Math.abs(nextVelocity) < 3;
	return {
		position: settled ? target : nextPosition,
		velocity: settled ? 0 : nextVelocity,
		settled
	};
}

/**
 * Estimate release velocity from a short history; a pause before release must
 * discard the old fling rather than unexpectedly dismissing the sheet.
 * @param {{ position: number, time: number }[]} samples
 * @param {number} now
 */
export function releaseVelocity(samples, now) {
	const recent = samples.filter((sample) => now - sample.time <= 100);
	if (recent.length < 2) return 0;
	const first = recent[0];
	const last = recent[recent.length - 1];
	const elapsed = last.time - first.time;
	if (elapsed < 1) return 0;
	return Math.max(-3000, Math.min(3000, ((last.position - first.position) / elapsed) * 1000));
}

/**
 * Project exponentially decaying momentum (a 0.99 deceleration rate) before
 * choosing a snap point. An upward reversal can cancel a downward dismissal.
 * @param {number} position
 * @param {number} velocity
 * @param {number} height
 */
export function shouldDismiss(position, velocity, height) {
	const projected = position + (velocity / 1000) * (0.99 / (1 - 0.99));
	const threshold = Math.max(80, Math.min(180, height * 0.33));
	return position > 8 && projected >= threshold;
}

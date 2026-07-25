const AXIS_DEADZONE = 0.5

export function isGamepadNeutral(gamepad) {
  if (!gamepad) return false

  const anyButtonPressed = Array.from(gamepad.buttons || []).some(
    (button) => button?.pressed
  )
  const anyAxisActive = Array.from(gamepad.axes || []).some(
    (axis) => Math.abs(axis || 0) > AXIS_DEADZONE
  )

  return !anyButtonPressed && !anyAxisActive
}

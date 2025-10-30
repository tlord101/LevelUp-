/**
 * Provides simple haptic feedback functions.
 * Checks for browser support before attempting to vibrate.
 */

/**
 * A light tap, suitable for general UI interactions like button presses.
 */
export const hapticTap = () => {
  if (window.navigator && 'vibrate' in window.navigator) {
    try {
      window.navigator.vibrate(5);
    } catch (e) {
      // Vibration may be disabled by user settings
      console.log("Haptic feedback failed.", e);
    }
  }
};

/**
 * A vibration pattern to indicate a successful action.
 */
export const hapticSuccess = () => {
  if (window.navigator && 'vibrate' in window.navigator) {
    try {
      // A slightly longer vibration for success
      window.navigator.vibrate(50); 
    } catch (e) {
      console.log("Haptic feedback failed.", e);
    }
  }
};

/**
 * A vibration pattern to indicate an error or warning.
 */
export const hapticError = () => {
  if (window.navigator && 'vibrate' in window.navigator) {
    try {
      // A double pulse for error
      window.navigator.vibrate([100, 30, 100]);
    } catch (e) {
      console.log("Haptic feedback failed.", e);
    }
  }
};

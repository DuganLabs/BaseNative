/**
 * Built-in validation functions.
 * Each validator returns null on success or an error object on failure.
 */

export function required(message = 'This field is required') {
  return (value) => {
    if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
      return { code: 'required', message };
    }
    return null;
  };
}

export function minLength(min, message) {
  return (value) => {
    if (value != null && String(value).length < min) {
      return { code: 'minLength', message: message || `Must be at least ${min} characters`, params: { min } };
    }
    return null;
  };
}

export function maxLength(max, message) {
  return (value) => {
    if (value != null && String(value).length > max) {
      return { code: 'maxLength', message: message || `Must be at most ${max} characters`, params: { max } };
    }
    return null;
  };
}

export function pattern(regex, message = 'Invalid format') {
  const re = typeof regex === 'string' ? new RegExp(regex) : regex;
  return (value) => {
    if (value != null && value !== '' && !re.test(String(value))) {
      return { code: 'pattern', message };
    }
    return null;
  };
}

export function email(message = 'Invalid email address') {
  return pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message);
}

export function min(minimum, message) {
  return (value) => {
    if (value != null && Number(value) < minimum) {
      return { code: 'min', message: message || `Must be at least ${minimum}`, params: { min: minimum } };
    }
    return null;
  };
}

export function max(maximum, message) {
  return (value) => {
    if (value != null && Number(value) > maximum) {
      return { code: 'max', message: message || `Must be at most ${maximum}`, params: { max: maximum } };
    }
    return null;
  };
}

/**
 * Creates a custom validator from a function.
 * The function should return null (valid) or an error object.
 */
export function custom(fn) {
  return fn;
}

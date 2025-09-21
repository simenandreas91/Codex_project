import prettier from 'prettier/standalone';
import babel from 'prettier/plugins/babel';

export function formatScript(script) {
  const trimmed = (script ?? '').trim();
  if (!trimmed) {
    return '// No script provided';
  }
  // Temporarily disable prettier to avoid client-side errors; re-add after fixing plugin setup
  console.warn('Formatting disabled due to prettier standalone issue');
  return trimmed;
}

export function formatFieldValue(field, value) {
  if (!field) return value;
  if (field.type === 'checkbox') {
    return value ? 'Yes' : 'No';
  }
  return value;
}

export function decodeText(text) {
  if (typeof text !== 'string') return '';
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

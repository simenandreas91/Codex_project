import prettier from 'prettier/standalone';
import babel from 'prettier/plugins/babel';

export function formatScript(script) {
  const trimmed = (script ?? '').trim();
  if (!trimmed) {
    return '// No script provided';
  }

  try {
    return prettier
      .format(trimmed, {
        parser: 'babel',
        plugins: [babel],
        semi: true,
        singleQuote: true
      })
      .trim();
  } catch (error) {
    console.warn('Failed to format script', error);
    return trimmed;
  }
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

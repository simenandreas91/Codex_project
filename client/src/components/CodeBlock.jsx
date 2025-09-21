import { useEffect, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);

export function CodeBlock({ value = '', className = '', isInline = false, language = 'javascript' }) {
  const codeRef = useRef(null);

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.textContent = value ?? '';
      try {
        hljs.highlightElement(codeRef.current);
        console.log('Highlighting applied for language:', language, 'Code length:', value.length);
      } catch (error) {
        console.warn('Highlight failed', error);
      }
    }
  }, [value, language]);

  const langClass = `language-${language}`;

  if (isInline) {
    return <code ref={codeRef} className={`${langClass} ${className}`.trim()} />;
  }

  return (
    <pre className={`code-block ${className}`.trim()}>
      <code ref={codeRef} className={langClass} />
    </pre>
  );
}

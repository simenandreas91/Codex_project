import { useEffect, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';

hljs.registerLanguage('javascript', javascript);

export function CodeBlock({ value = '', className = '', isInline = false }) {
  const codeRef = useRef(null);

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.textContent = value ?? '';
      try {
        hljs.highlightElement(codeRef.current);
      } catch (error) {
        console.warn('Highlight failed', error);
      }
    }
  }, [value]);

  if (isInline) {
    return <code ref={codeRef} className={`language-javascript ${className}`.trim()} />;
  }

  return (
    <pre className={`code-block ${className}`.trim()}>
      <code ref={codeRef} className="language-javascript" />
    </pre>
  );
}

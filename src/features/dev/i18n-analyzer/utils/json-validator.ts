import type { JsonValidationError } from '../types';

const LANGUAGES = ['en', 'ru'] as const;

// Get line and column from character position
function getLineInfo(text: string, position: number): { line: number; column: number; preview: string } {
  const lines = text.split('\n');
  let currentPos = 0;
  let targetLine = 0;
  let targetColumn = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length + 1; // +1 for newline
    if (currentPos + lineLength > position) {
      targetLine = i + 1;
      targetColumn = position - currentPos + 1;
      break;
    }
    currentPos += lineLength;
  }
  
  // Get 3 lines of context (line before, error line, line after)
  const startLine = Math.max(0, targetLine - 2);
  const endLine = Math.min(lines.length - 1, targetLine);
  const previewLines = lines.slice(startLine, endLine + 1).map((line, idx) => {
    const lineNum = startLine + idx + 1;
    const marker = lineNum === targetLine ? '>>> ' : '    ';
    return `${marker}${lineNum}: ${line}`;
  });
  
  return {
    line: targetLine,
    column: targetColumn,
    preview: previewLines.join('\n')
  };
}

// Parse JSON error message to extract position
function parseJsonError(errorMessage: string, text: string): { line: number; column: number; preview: string } {
  // Chrome/V8 format: "Unexpected token X in JSON at position N"
  const positionMatch = errorMessage.match(/position\s+(\d+)/i);
  if (positionMatch) {
    const position = parseInt(positionMatch[1], 10);
    return getLineInfo(text, position);
  }
  
  // Firefox format: "JSON.parse: ... at line N column M"
  const lineColMatch = errorMessage.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (lineColMatch) {
    const line = parseInt(lineColMatch[1], 10);
    const column = parseInt(lineColMatch[2], 10);
    const lines = text.split('\n');
    const startLine = Math.max(0, line - 2);
    const endLine = Math.min(lines.length - 1, line);
    const previewLines = lines.slice(startLine, endLine + 1).map((l, idx) => {
      const lineNum = startLine + idx + 1;
      const marker = lineNum === line ? '>>> ' : '    ';
      return `${marker}${lineNum}: ${l}`;
    });
    return { line, column, preview: previewLines.join('\n') };
  }
  
  return { line: 0, column: 0, preview: 'Could not determine error location' };
}

// Validate a single JSON file
async function validateSingleFile(
  namespace: string, 
  language: 'en' | 'ru'
): Promise<JsonValidationError | null> {
  try {
    const response = await fetch(`/locales/${language}/${namespace}.json`);
    
    if (!response.ok) {
      return {
        namespace,
        language,
        line: 0,
        column: 0,
        message: `HTTP ${response.status}: ${response.statusText}`,
        preview: 'File could not be loaded',
        rawError: `Failed to fetch /locales/${language}/${namespace}.json`
      };
    }
    
    const text = await response.text();
    
    try {
      JSON.parse(text);
      return null; // Valid JSON
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      const { line, column, preview } = parseJsonError(errorMessage, text);
      
      return {
        namespace,
        language,
        line,
        column,
        message: errorMessage,
        preview,
        rawError: errorMessage
      };
    }
  } catch (fetchError) {
    return {
      namespace,
      language,
      line: 0,
      column: 0,
      message: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error',
      preview: 'Network error loading file',
      rawError: String(fetchError)
    };
  }
}

// Validate all JSON files in all namespaces
export async function validateAllJsonFiles(namespaces: string[]): Promise<{
  errors: JsonValidationError[];
  brokenNamespaces: string[];
}> {
  const errors: JsonValidationError[] = [];
  const brokenNamespaces = new Set<string>();
  
  // Create all validation promises
  const validationPromises: Promise<JsonValidationError | null>[] = [];
  const fileInfo: { namespace: string; language: 'en' | 'ru' }[] = [];
  
  for (const namespace of namespaces) {
    for (const language of LANGUAGES) {
      validationPromises.push(validateSingleFile(namespace, language));
      fileInfo.push({ namespace, language });
    }
  }
  
  // Run all validations in parallel
  const results = await Promise.all(validationPromises);
  
  // Collect errors
  results.forEach((result, index) => {
    if (result) {
      errors.push(result);
      brokenNamespaces.add(fileInfo[index].namespace);
    }
  });
  
  return {
    errors: errors.sort((a, b) => a.namespace.localeCompare(b.namespace)),
    brokenNamespaces: Array.from(brokenNamespaces).sort()
  };
}

/**
 * Nexvora Field Classifier
 * Scans a flat array or object leaves for data matching specific heuristic signatures.
 * Used for dynamic field discovery when Google changes schema indexes.
 */

export class FieldClassifier {
  
  // Recursively searches a JSON structure to find all paths matching a specific regex
  public static findPathsMatchingRegex(node: any, regex: RegExp, currentPath: number[] = [], results: {path: number[], value: string}[] = []): {path: number[], value: string}[] {
    if (typeof node === 'string') {
      if (regex.test(node)) {
        results.push({ path: [...currentPath], value: node });
      }
    } else if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        currentPath.push(i);
        this.findPathsMatchingRegex(node[i], regex, currentPath, results);
        currentPath.pop();
      }
    }
    return results;
  }

  public static discoverPhoneCandidates(payload: any) {
    // Looks for international E.164 or US local format, must be 10-15 chars
    const phoneRegex = /^(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
    return this.findPathsMatchingRegex(payload, phoneRegex);
  }

  public static discoverWebsiteCandidates(payload: any) {
    const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    return this.findPathsMatchingRegex(payload, urlRegex);
  }
}

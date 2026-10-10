import path from 'node:path';

const SHARED_LAYERS = new Set(['common', 'components', 'lib', 'styles']);

function sourcePath(filename) {
  const normalized = filename.replaceAll('\\', '/');
  const sourceRoot = normalized.lastIndexOf('/src/');
  if (sourceRoot !== -1) {
    return normalized.slice(sourceRoot + 5);
  }
  return normalized.startsWith('src/') ? normalized.slice(4) : null;
}

function importPath(filename, specifier) {
  if (specifier.startsWith('@/')) {
    return path.posix.normalize(specifier.slice(2));
  }
  if (!specifier.startsWith('.')) {
    return null;
  }
  return sourcePath(path.posix.resolve(path.posix.dirname(filename.replaceAll('\\', '/')), specifier));
}

function containerOwner(source) {
  const [layer, owner] = source.split('/');
  return layer === 'containers' ? owner : null;
}

function publicEntry(source) {
  const entry = source.replace(/\.(?:[cm]?[jt]sx?)$/, '').replace(/\/$/, '');
  return /^containers\/[^/]+(?:\/index)?$/.test(entry) || /^containers\/ticket\/preview(?:\/index)?$/.test(entry);
}

/** Return a boundary error without reading files or depending on the checkout path. */
export function boundaryViolation(filename, specifier) {
  const source = sourcePath(filename);
  const target = importPath(filename, specifier);
  if (!source || !target) {
    return null;
  }

  const sourceLayer = source.split('/')[0];
  const targetLayer = target.split('/')[0];
  const sourceOwner = containerOwner(source);
  const targetOwner = containerOwner(target);

  if (SHARED_LAYERS.has(sourceLayer) && (targetLayer === 'app' || targetLayer === 'containers')) {
    return 'Shared code must not depend on app composition or page containers.';
  }
  if (sourceOwner && targetLayer === 'app') {
    return 'Containers must not depend on app composition.';
  }
  if (sourceOwner && targetOwner && sourceOwner !== targetOwner) {
    return 'Containers must not import another domain; compose them in app instead.';
  }
  if (targetOwner && sourceOwner !== targetOwner && !publicEntry(target)) {
    return 'Import a container through its public index, not its private implementation.';
  }
  if (
    target.startsWith('containers/ticket/preview/') &&
    !source.startsWith('containers/ticket/preview/') &&
    !publicEntry(target)
  ) {
    return 'Import ticket preview through its public index, not its private implementation.';
  }
  return null;
}

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Keep page domains private and dependencies pointing inward.',
    },
    schema: [],
    messages: { boundary: '{{reason}}' },
  },
  create(context) {
    function check(source) {
      if (!source || typeof source.value !== 'string') {
        return;
      }
      const reason = boundaryViolation(context.filename, source.value);
      if (reason) {
        context.report({
          node: source,
          messageId: 'boundary',
          data: { reason },
        });
      }
    }
    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => check(node.source),
      ExportAllDeclaration: (node) => check(node.source),
      ImportExpression: (node) => check(node.source),
    };
  },
};

export default { rules: { 'domain-boundaries': rule } };

const componentTypes = new Set(['FC', 'FunctionComponent', 'FunctionalComponent']);

/** Reject React component wrapper types, including renamed and namespace imports. */
const noReactFc = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      direct: 'Use a named function component with explicit props instead of React component wrapper types.',
    },
  },
  create(context) {
    const namespaces = new Set(['React']);
    return {
      Program(node) {
        for (const statement of node.body) {
          if (statement.type !== 'ImportDeclaration' || statement.source.value !== 'react') {
            continue;
          }
          for (const specifier of statement.specifiers) {
            if (specifier.type === 'ImportSpecifier') {
              if (componentTypes.has(specifier.imported.name ?? specifier.imported.value)) {
                context.report({ node: specifier, messageId: 'direct' });
              }
            } else {
              namespaces.add(specifier.local.name);
            }
          }
        }
      },
      TSQualifiedName(node) {
        if (node.left.type === 'Identifier' && namespaces.has(node.left.name) && componentTypes.has(node.right.name)) {
          context.report({ node, messageId: 'direct' });
        }
      },
      TSImportType(node) {
        const source = node.source?.value;
        if (source === 'react' && node.qualifier?.type === 'Identifier' && componentTypes.has(node.qualifier.name)) {
          context.report({ node, messageId: 'direct' });
        }
      },
    };
  },
};

export default { rules: { 'no-react-fc': noReactFc } };

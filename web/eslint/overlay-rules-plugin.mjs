/**
 * ESLint plugin enforcing the overlay-rules from
 * docs/refactor/overlay-rules.md.
 *
 * Currently ships:
 *   - no-interactive-in-tooltip
 *   - no-window-confirm-alert
 *
 * NOTE: Tooltip rule starts at "warn" while Phase 0.5.6/0.5.7 migrate
 * existing usages, then we promote to "error".
 */

const INTERACTIVE_TAGS = new Set([
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "Button",
  "Input",
  "Textarea",
  "Select",
  "DropdownMenu",
  "Popover",
  // shadcn-ui primitives that wrap a button
  "DialogTrigger",
  "SheetTrigger",
  "PopoverTrigger",
  "DropdownMenuTrigger",
  "AlertDialogTrigger",
]);

const TOOLTIP_CONTENT_NAMES = new Set([
  "TooltipContent",
  "Tooltip.Content",
]);

const FORBIDDEN_GLOBALS = new Set(["confirm", "alert", "prompt"]);

/** Collect every JSXElement nested under `root`. */
function* iterDescendants(root) {
  const stack = [root];
  while (stack.length) {
    const n = stack.pop();
    if (!n || typeof n !== "object") continue;
    if (n.type === "JSXElement") yield n;
    if (Array.isArray(n.children)) stack.push(...n.children);
    // Some JSX expression containers wrap interactive elements
    if (n.type === "JSXExpressionContainer") stack.push(n.expression);
    if (n.type === "ConditionalExpression") {
      stack.push(n.consequent);
      stack.push(n.alternate);
    }
    if (n.type === "LogicalExpression") {
      stack.push(n.left);
      stack.push(n.right);
    }
  }
}

function jsxElementName(node) {
  const open = node.openingElement;
  if (!open) return null;
  const name = open.name;
  if (name.type === "JSXIdentifier") return name.name;
  if (name.type === "JSXMemberExpression") {
    // e.g. Tooltip.Content
    return `${name.object.name}.${name.property.name}`;
  }
  return null;
}

export default {
  rules: {
    "no-interactive-in-tooltip": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Forbid interactive elements (button/link/input) inside <Tooltip>. Use <Popover> instead.",
        },
        schema: [],
        messages: {
          interactiveInTooltip:
            "Interactive element <{{tag}}> inside Tooltip — Tooltip is not focusable for keyboard / SR users. Use <Popover> if the user needs to interact.",
        },
      },
      create(context) {
        return {
          JSXElement(node) {
            const tag = jsxElementName(node);
            if (!tag || !TOOLTIP_CONTENT_NAMES.has(tag)) return;
            for (const descendant of iterDescendants(node)) {
              const dTag = jsxElementName(descendant);
              if (dTag && INTERACTIVE_TAGS.has(dTag)) {
                context.report({
                  node: descendant,
                  messageId: "interactiveInTooltip",
                  data: { tag: dTag },
                });
              }
            }
          },
        };
      },
    },

    "no-window-confirm-alert": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Forbid window.confirm / alert / prompt — use AlertDialog / Sheet / Dialog from components/ui.",
        },
        schema: [],
        messages: {
          forbidden:
            "Avoid window.{{name}}() — use AlertDialog (delete confirms) or Sheet/Dialog (decisions). See docs/refactor/overlay-rules.md.",
        },
      },
      create(context) {
        // Walk the resolution chain to find whether an identifier
        // resolves to a real binding (local / parameter / module import)
        // anywhere in the lexical scope. If yes, it's NOT a global —
        // skip. If no, it's an unresolved reference, which (in a TS/RSC
        // codebase with strict typing) means a global, like window.confirm.
        function isUnresolvedGlobal(node, name) {
          let scope = context.sourceCode.getScope(node);
          while (scope) {
            for (const variable of scope.variables) {
              if (variable.name === name) return false;
            }
            for (const ref of scope.references) {
              if (ref.identifier.name === name && ref.resolved) return false;
            }
            scope = scope.upper;
          }
          return true;
        }

        return {
          CallExpression(node) {
            const callee = node.callee;
            // window.confirm(…) / window.alert(…) / window.prompt(…)
            if (
              callee.type === "MemberExpression" &&
              callee.object.type === "Identifier" &&
              callee.object.name === "window" &&
              callee.property.type === "Identifier" &&
              FORBIDDEN_GLOBALS.has(callee.property.name)
            ) {
              context.report({
                node,
                messageId: "forbidden",
                data: { name: callee.property.name },
              });
              return;
            }
            // Bare confirm/alert/prompt — only flag when it's the GLOBAL
            // (i.e. no enclosing scope binds the name). Local bindings
            // such as `const confirm = useConfirm()` are the recommended
            // replacement and must NOT be flagged.
            if (
              callee.type === "Identifier" &&
              FORBIDDEN_GLOBALS.has(callee.name) &&
              isUnresolvedGlobal(callee, callee.name)
            ) {
              context.report({
                node,
                messageId: "forbidden",
                data: { name: callee.name },
              });
            }
          },
        };
      },
    },
  },
};

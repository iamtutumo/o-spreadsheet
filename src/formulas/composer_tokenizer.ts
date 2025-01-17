import { Color, Locale } from "../types";
import { Token } from "./index";
import { AST, parseTokens } from "./parser";
import { rangeTokenize } from "./range_tokenizer";

interface FunctionContext {
  /**
   * The parent function name of the token.
   */
  parent: string;
  /**
   * The position of the token within the argument list of its parent function.
   */
  argPosition: number;
  /**
   * An array of parsed arguments, possibly containing undefined values if the argument
   * is empty or is an invalid expression.
   */
  args: (AST | undefined)[];
  /**
   * Array of token arrays representing the tokens for each argument.
   * Needed as an intermediate step to parse the arguments AST (see `args` property).
   */
  argsTokens?: Token[][];
}

/**
 * Enriched Token is used by the composer to add information on the tokens that
 * are only needed during the edition of a formula.
 *
 * The information added are:
 * - start, end and length of each token
 * - parenthesesCode (a code indicating the position of the token in the parentheses tree)
 * - functionContext (only for tokens surrounded by a function)
 * - color (the base color of the token, without fading modification)
 * - isBlurred (indicates whether the text should be highlighted or not, useful to know if the token matches the same formula as the cursor token)
 * - isParenthesisLinkedToCursor (Useful for highlighting tokens related to the current token, such as matching parentheses)
 */

export interface EnrichedToken extends Token {
  start: number;
  end: number;
  length: number;
  parenthesesCode?: string;
  functionContext?: FunctionContext;
  color?: Color;
  isBlurred?: boolean;
  isParenthesisLinkedToCursor?: boolean;
}

/**
 * Add the following information on tokens:
 * - length
 * - start
 * - end
 */
function enrichTokens(tokens: Token[]): EnrichedToken[] {
  let current = 0;
  return tokens.map((x) => {
    const len = x.value.toString().length;
    const token: EnrichedToken = Object.assign({}, x, {
      start: current,
      end: current + len,
      length: len,
    });
    current = token.end;
    return token;
  });
}

/**
 * add on each token a code representing the position of the token in an opening parentheses tree.""
 *
 * For `=SIN(0) + SUM(COS(1), ABS(-1*(2+4)))`:
 * |Tokens   | code             |
 * |---------|------------------|
 * |`=`      | undefined        |
 * |`SIN(0)` | 1                |
 * |`+`      | undefined        |
 * |`SUM(`   | 2                |
 * |`COS(1)` | 2:1              |
 * |`,`      | 2                |
 * |`ABS(-1*`| 2:2              |
 * |`(2+4)`  | 2:2:1            |
 * |`)`      | 2:2              |
 * |`)`      | 2                |
 */
function mapParenthesisCode(tokens: EnrichedToken[]): EnrichedToken[] {
  let code: number[] = [];
  let nextLevel = 0;
  return tokens.map((token, i) => {
    if (token.type === "LEFT_PAREN") {
      code.push(nextLevel + 1);
      nextLevel = 0;
      // allows to link the parentheses opening a function to the function
      for (let previousIndex = i - 1; previousIndex >= 0; previousIndex--) {
        if (tokens[previousIndex].type === "SPACE") {
          tokens[previousIndex].parenthesesCode = code.join(":");
          continue;
        }
        if (tokens[previousIndex].type === "SYMBOL") {
          tokens[previousIndex].parenthesesCode = code.join(":");
        }
        break;
      }
    }

    token.parenthesesCode = code.join(":");

    if (token.type === "RIGHT_PAREN" && code.length) {
      nextLevel = code.pop()!;
    }

    return token;
  });
}

/**
 * add on each token its parent function and the index corresponding to
 * its position as an argument of the function.
 * In this example "=MIN(42,SUM(MAX(1,2),3))":
 * - the parent function of the token correspond to number 42 is the MIN function
 * - the argument position of the token correspond to number 42 is 0
 * - the parent function of the token correspond to number 3 is the SUM function
 * - the argument position of the token correspond to number 3 is 1
 */
function mapParentFunction(tokens: EnrichedToken[]): EnrichedToken[] {
  let stack: FunctionContext[] = [];
  let functionStarted = "";

  function pushTokenToFunctionContext(token: Token) {
    if (stack.length === 0) {
      return;
    }
    const functionContext = stack.at(-1);
    if (functionContext && functionContext.argsTokens) {
      const { argsTokens, argPosition } = functionContext;
      if (!argsTokens[argPosition]) {
        argsTokens[argPosition] = [];
      }
      argsTokens[argPosition].push({ value: token.value, type: token.type });
    }
  }

  return tokens.map((token, i) => {
    if (!["SPACE", "LEFT_PAREN"].includes(token.type)) {
      functionStarted = "";
    }

    switch (token.type) {
      case "SYMBOL":
        pushTokenToFunctionContext(token);
        functionStarted = token.value;
        break;
      case "LEFT_PAREN":
        stack.push({ parent: functionStarted, argPosition: 0, argsTokens: [], args: [] });
        pushTokenToFunctionContext(token);
        functionStarted = "";
        break;
      case "RIGHT_PAREN":
        const child = stack.pop();
        child?.argsTokens?.flat().forEach(pushTokenToFunctionContext);
        pushTokenToFunctionContext(token);
        break;
      case "ARG_SEPARATOR":
        pushTokenToFunctionContext(token);
        if (stack.length) {
          // increment position on current function
          stack[stack.length - 1].argPosition++;
        }
        break;
      default:
        pushTokenToFunctionContext(token);
        break;
    }

    if (stack.length) {
      const functionContext = stack[stack.length - 1];
      if (functionContext.parent) {
        token.functionContext = Object.assign({}, functionContext);
      }
    }
    return token;
  });
}

/**
 * Parse the list of tokens that compose the arguments of a function to
 * their AST representation.
 */
function addArgsAST(tokens: EnrichedToken[]): EnrichedToken[] {
  for (const token of tokens) {
    if (token.functionContext) {
      const { argsTokens, args } = token.functionContext;

      // remove argsTokens from the context to remove noise
      // The business logic should not need it, it is only used temporarily
      // to build the arguments ASTs.
      delete token.functionContext.argsTokens;

      if (args.length || !argsTokens) {
        // function context already process at a previous token
        continue;
      }
      if (argsTokens[0]?.[0]?.type === "LEFT_PAREN") {
        // remove the parenthesis leading the first argument
        argsTokens[0] = argsTokens[0].slice(1);
      }
      for (const argTokens of argsTokens) {
        let tokens = argTokens;
        if (tokens.at(-1)?.type === "ARG_SEPARATOR") {
          tokens = tokens.slice(0, -1);
        }
        try {
          args.push(parseTokens(tokens));
        } catch (error) {
          args.push(undefined);
        }
      }
    }
  }
  return tokens;
}

/**
 * Take the result of the tokenizer and transform it to be usable in the composer.
 *
 * @param formula
 */
export function composerTokenize(formula: string, locale: Locale): EnrichedToken[] {
  const tokens = rangeTokenize(formula, locale);

  return addArgsAST(mapParentFunction(mapParenthesisCode(enrichTokens(tokens))));
}

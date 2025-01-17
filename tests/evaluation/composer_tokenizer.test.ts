import { composerTokenize } from "../../src/formulas/composer_tokenizer";
import { DEFAULT_LOCALE } from "../../src/types/locale";

describe("composerTokenizer", () => {
  describe.each(["A1:B1", "A:A", "1:1", "A1:A", "B3:4"])("tokenise ranges", (xc) => {
    test(`range ${xc}`, () => {
      expect(composerTokenize("=" + xc, DEFAULT_LOCALE)).toEqual([
        { start: 0, end: 1, length: 1, type: "OPERATOR", value: "=", parenthesesCode: "" },
        {
          start: 1,
          end: 1 + xc.length,
          length: xc.length,
          type: "REFERENCE",
          value: xc,
          parenthesesCode: "",
        },
      ]);
    });
  });
  test("operation and no range", () => {
    expect(composerTokenize("=A3+A1", DEFAULT_LOCALE)).toEqual([
      { start: 0, end: 1, length: 1, type: "OPERATOR", value: "=", parenthesesCode: "" },
      { start: 1, end: 3, length: 2, type: "REFERENCE", value: "A3", parenthesesCode: "" },
      { start: 3, end: 4, length: 1, type: "OPERATOR", value: "+", parenthesesCode: "" },
      { start: 4, end: 6, length: 2, type: "REFERENCE", value: "A1", parenthesesCode: "" },
    ]);
  });
  test("operation and range", () => {
    expect(composerTokenize("=A3+A1:A2", DEFAULT_LOCALE)).toEqual([
      { start: 0, end: 1, length: 1, type: "OPERATOR", value: "=", parenthesesCode: "" },
      { start: 1, end: 3, length: 2, type: "REFERENCE", value: "A3", parenthesesCode: "" },
      { start: 3, end: 4, length: 1, type: "OPERATOR", value: "+", parenthesesCode: "" },
      { start: 4, end: 9, length: 5, type: "REFERENCE", value: "A1:A2", parenthesesCode: "" },
    ]);
  });

  test("unbound range with spaces", () => {
    expect(composerTokenize("= A : A ", DEFAULT_LOCALE)).toEqual([
      { start: 0, end: 1, length: 1, type: "OPERATOR", value: "=", parenthesesCode: "" },
      { start: 1, end: 2, length: 1, type: "SPACE", value: " ", parenthesesCode: "" },
      { start: 2, end: 7, length: 5, type: "REFERENCE", value: "A : A", parenthesesCode: "" },
      { start: 7, end: 8, length: 1, type: "SPACE", value: " ", parenthesesCode: "" },
    ]);
  });

  test("operation and range with spaces", () => {
    expect(composerTokenize("=A3+  A1 : A2   ", DEFAULT_LOCALE)).toEqual([
      { start: 0, end: 1, length: 1, type: "OPERATOR", value: "=", parenthesesCode: "" },
      { start: 1, end: 3, length: 2, type: "REFERENCE", value: "A3", parenthesesCode: "" },
      { start: 3, end: 4, length: 1, type: "OPERATOR", value: "+", parenthesesCode: "" },
      { start: 4, end: 6, length: 2, type: "SPACE", value: "  ", parenthesesCode: "" },
      { start: 6, end: 13, length: 7, type: "REFERENCE", value: "A1 : A2", parenthesesCode: "" },
      { start: 13, end: 16, length: 3, type: "SPACE", value: "   ", parenthesesCode: "" },
    ]);
  });

  test("range with spaces then operation", () => {
    expect(composerTokenize("=  A1 : A2   +a3", DEFAULT_LOCALE)).toEqual([
      { start: 0, end: 1, length: 1, type: "OPERATOR", value: "=", parenthesesCode: "" },
      { start: 1, end: 3, length: 2, type: "SPACE", value: "  ", parenthesesCode: "" },
      { start: 3, end: 10, length: 7, type: "REFERENCE", value: "A1 : A2", parenthesesCode: "" },
      { start: 10, end: 13, length: 3, type: "SPACE", value: "   ", parenthesesCode: "" },
      { start: 13, end: 14, length: 1, type: "OPERATOR", value: "+", parenthesesCode: "" },
      { start: 14, end: 16, length: 2, type: "REFERENCE", value: "a3", parenthesesCode: "" },
    ]);
  }); //"= SUM ( C4 : C5 )"

  test("= SUM ( C4 : C5 )", () => {
    expect(composerTokenize("= SUM ( C4 : C5 )", DEFAULT_LOCALE)).toMatchSnapshot();
  });
});

describe("composerTokenizer base tests", () => {
  test("simple token", () => {
    expect(composerTokenize("1", DEFAULT_LOCALE)).toEqual([
      { start: 0, end: 1, length: 1, type: "NUMBER", value: "1", parenthesesCode: "" },
    ]);
  });
  test("formula token", () => {
    expect(composerTokenize("=1", DEFAULT_LOCALE)).toEqual([
      { start: 0, end: 1, length: 1, type: "OPERATOR", value: "=", parenthesesCode: "" },
      { start: 1, end: 2, length: 1, type: "NUMBER", value: "1", parenthesesCode: "" },
    ]);
    expect(composerTokenize("=SUM(1 ,(1+2),ADD (2, 3),4)", DEFAULT_LOCALE)).toMatchSnapshot();
  });
  test("longer operators >=", () => {
    expect(composerTokenize("= >= <= <", DEFAULT_LOCALE)).toEqual([
      { start: 0, end: 1, length: 1, type: "OPERATOR", value: "=", parenthesesCode: "" },
      { start: 1, end: 2, length: 1, type: "SPACE", value: " ", parenthesesCode: "" },
      { start: 2, end: 4, length: 2, type: "OPERATOR", value: ">=", parenthesesCode: "" },
      { start: 4, end: 5, length: 1, type: "SPACE", value: " ", parenthesesCode: "" },
      { start: 5, end: 7, length: 2, type: "OPERATOR", value: "<=", parenthesesCode: "" },
      { start: 7, end: 8, length: 1, type: "SPACE", value: " ", parenthesesCode: "" },
      { start: 8, end: 9, length: 1, type: "OPERATOR", value: "<", parenthesesCode: "" },
    ]);
  });

  test("function context of simple arguments", () => {
    const functionContext = {
      parent: "SUM",
      args: [
        { type: "NUMBER", value: 1 },
        { type: "STRING", value: "2" },
      ],
    };
    expect(composerTokenize('=SUM(1,"2")', DEFAULT_LOCALE)).toMatchObject([
      { type: "OPERATOR", value: "=", parenthesesCode: "" },
      { type: "SYMBOL", value: "SUM", parenthesesCode: "1" },
      { type: "LEFT_PAREN", value: "(", functionContext, parenthesesCode: "1" },
      { type: "NUMBER", value: "1", functionContext, parenthesesCode: "1" },
      { type: "ARG_SEPARATOR", value: ",", functionContext, parenthesesCode: "1" },
      { type: "STRING", value: '"2"', functionContext, parenthesesCode: "1" },
      { type: "RIGHT_PAREN", value: ")", parenthesesCode: "1" },
    ]);
  });

  test("function context with missing right parenthesis", () => {
    const functionContext = {
      parent: "SUM",
      args: [
        { type: "NUMBER", value: 1 },
        { type: "NUMBER", value: 2 },
      ],
    };
    expect(composerTokenize("=SUM(1,2", DEFAULT_LOCALE)).toMatchObject([
      { type: "OPERATOR", value: "=", parenthesesCode: "" },
      { type: "SYMBOL", value: "SUM", parenthesesCode: "1" },
      { type: "LEFT_PAREN", value: "(", functionContext, parenthesesCode: "1" },
      { type: "NUMBER", value: "1", functionContext, parenthesesCode: "1" },
      { type: "ARG_SEPARATOR", value: ",", functionContext, parenthesesCode: "1" },
      { type: "NUMBER", value: "2", functionContext, parenthesesCode: "1" },
    ]);
  });

  test("function context with trailing arg separator", () => {
    const functionContext = {
      parent: "SUM",
      args: [{ type: "NUMBER", value: 1 }],
    };
    expect(composerTokenize("=SUM(1,", DEFAULT_LOCALE)).toMatchObject([
      { type: "OPERATOR", value: "=", parenthesesCode: "" },
      { type: "SYMBOL", value: "SUM", parenthesesCode: "1" },
      { type: "LEFT_PAREN", value: "(", functionContext, parenthesesCode: "1" },
      { type: "NUMBER", value: "1", functionContext, parenthesesCode: "1" },
      { type: "ARG_SEPARATOR", value: ",", functionContext, parenthesesCode: "1" },
    ]);
  });

  test("function context with empty last argument", () => {
    const functionContext = {
      parent: "SUM",
      args: [{ type: "NUMBER", value: 1 }],
    };
    expect(composerTokenize("=SUM(1,)", DEFAULT_LOCALE)).toMatchObject([
      { type: "OPERATOR", value: "=", parenthesesCode: "" },
      { type: "SYMBOL", value: "SUM", parenthesesCode: "1" },
      { type: "LEFT_PAREN", value: "(", functionContext, parenthesesCode: "1" },
      { type: "NUMBER", value: "1", functionContext, parenthesesCode: "1" },
      { type: "ARG_SEPARATOR", value: ",", functionContext, parenthesesCode: "1" },
      { type: "RIGHT_PAREN", value: ")", parenthesesCode: "1" },
    ]);
  });
  test("function context with empty first argument", () => {
    const functionContext = {
      parent: "SUM",
      args: [undefined, { type: "NUMBER", value: 1 }],
    };
    expect(composerTokenize("=SUM(,1)", DEFAULT_LOCALE)).toMatchObject([
      { type: "OPERATOR", value: "=", parenthesesCode: "" },
      { type: "SYMBOL", value: "SUM", parenthesesCode: "1" },
      { type: "LEFT_PAREN", value: "(", functionContext, parenthesesCode: "1" },
      { type: "ARG_SEPARATOR", value: ",", functionContext, parenthesesCode: "1" },
      { type: "NUMBER", value: "1", functionContext, parenthesesCode: "1" },
      { type: "RIGHT_PAREN", value: ")", parenthesesCode: "1" },
    ]);
  });

  test("function context with no argument", () => {
    const functionContext = {
      parent: "SUM",
      args: [],
    };
    expect(composerTokenize("=SUM()", DEFAULT_LOCALE)).toMatchObject([
      { type: "OPERATOR", value: "=", parenthesesCode: "" },
      { type: "SYMBOL", value: "SUM", parenthesesCode: "1" },
      { type: "LEFT_PAREN", value: "(", functionContext, parenthesesCode: "1" },
      { type: "RIGHT_PAREN", value: ")", parenthesesCode: "1" },
    ]);
  });

  test("function context with invalid expression", () => {
    const functionContext = {
      parent: "SUM",
      args: [undefined, { type: "NUMBER", value: 1 }],
    };
    expect(composerTokenize("=SUM(1+,1)", DEFAULT_LOCALE)).toMatchObject([
      { type: "OPERATOR", value: "=", parenthesesCode: "" },
      { type: "SYMBOL", value: "SUM", parenthesesCode: "1" },
      { type: "LEFT_PAREN", value: "(", functionContext, parenthesesCode: "1" },
      { type: "NUMBER", value: "1", functionContext, parenthesesCode: "1" },
      { type: "OPERATOR", value: "+", functionContext, parenthesesCode: "1" },
      { type: "ARG_SEPARATOR", value: ",", functionContext, parenthesesCode: "1" },
      { type: "NUMBER", value: "1", functionContext, parenthesesCode: "1" },
      { type: "RIGHT_PAREN", value: ")", parenthesesCode: "1" },
    ]);
  });

  test("function context with invalid function call", () => {
    const functionContext = {
      parent: "SUM",
      args: [undefined, { type: "NUMBER", value: 1 }],
    };
    expect(composerTokenize("=SUM('ADD'(),1)", DEFAULT_LOCALE)).toMatchObject([
      { type: "OPERATOR", value: "=", parenthesesCode: "" },
      { type: "SYMBOL", value: "SUM", parenthesesCode: "1" },
      { type: "LEFT_PAREN", value: "(", functionContext, parenthesesCode: "1" },
      { type: "SYMBOL", value: "'ADD'", functionContext, parenthesesCode: "1:1" },
      { type: "LEFT_PAREN", value: "(", parenthesesCode: "1:1" },
      { type: "RIGHT_PAREN", value: ")", parenthesesCode: "1:1" },
      { type: "ARG_SEPARATOR", value: ",", functionContext, parenthesesCode: "1" },
      { type: "NUMBER", value: "1", functionContext, parenthesesCode: "1" },
      { type: "RIGHT_PAREN", value: ")", parenthesesCode: "1" },
    ]);
  });

  test("function context of nested functions", () => {
    const sumFunctionContext = {
      parent: "SUM",
      args: [
        {
          args: [
            { type: "NUMBER", value: 1 },
            { type: "NUMBER", value: 2 },
          ],
          type: "FUNCALL",
          value: "ADD",
        },
        { type: "NUMBER", value: 3 },
      ],
    };
    const addFunctionContext = {
      parent: "ADD",
      args: [
        { type: "NUMBER", value: 1 },
        { type: "NUMBER", value: 2 },
      ],
    };
    const sumFirstArgContext = { ...sumFunctionContext, argPosition: 0 };
    const sumSecondArgContext = { ...sumFunctionContext, argPosition: 1 };
    const addFirstArgContext = { ...addFunctionContext, argPosition: 0 };
    const addSecondArgContext = { ...addFunctionContext, argPosition: 1 };
    expect(composerTokenize("=SUM(ADD  (1,2),3)", DEFAULT_LOCALE)).toMatchObject([
      { type: "OPERATOR", value: "=", parenthesesCode: "" },
      { type: "SYMBOL", value: "SUM", parenthesesCode: "1" },
      { type: "LEFT_PAREN", value: "(", functionContext: sumFirstArgContext, parenthesesCode: "1" },
      { type: "SYMBOL", value: "ADD", functionContext: sumFirstArgContext, parenthesesCode: "1:1" },
      { type: "SPACE", value: "  ", functionContext: sumFirstArgContext, parenthesesCode: "1:1" },
      {
        type: "LEFT_PAREN",
        value: "(",
        functionContext: addFirstArgContext,
        parenthesesCode: "1:1",
      },
      { type: "NUMBER", value: "1", functionContext: addFirstArgContext, parenthesesCode: "1:1" },
      {
        type: "ARG_SEPARATOR",
        value: ",",
        functionContext: addSecondArgContext,
        parenthesesCode: "1:1",
      },
      { type: "NUMBER", value: "2", functionContext: addSecondArgContext, parenthesesCode: "1:1" },
      {
        type: "RIGHT_PAREN",
        value: ")",
        functionContext: sumFirstArgContext,
        parenthesesCode: "1:1",
      },
      {
        type: "ARG_SEPARATOR",
        value: ",",
        functionContext: sumSecondArgContext,
        parenthesesCode: "1",
      },
      { type: "NUMBER", value: "3", functionContext: sumSecondArgContext, parenthesesCode: "1" },
      { type: "RIGHT_PAREN", value: ")", parenthesesCode: "1" },
    ]);
  });

  test("debug formula token", () => {
    expect(composerTokenize("=?1", DEFAULT_LOCALE)).toEqual([
      { start: 0, end: 1, length: 1, type: "OPERATOR", value: "=", parenthesesCode: "" },
      { start: 1, end: 2, length: 1, type: "DEBUGGER", value: "?", parenthesesCode: "" },
      { start: 2, end: 3, length: 1, type: "NUMBER", value: "1", parenthesesCode: "" },
    ]);
  });
  test("String", () => {
    expect(composerTokenize('"hello"', DEFAULT_LOCALE)).toEqual([
      { start: 0, end: 7, length: 7, type: "STRING", value: '"hello"', parenthesesCode: "" },
    ]);
    //expect(() => composerTokenize("'hello'")).toThrowError("kikou");
    expect(composerTokenize("'hello'", DEFAULT_LOCALE)).toEqual([
      { start: 0, end: 7, length: 7, type: "SYMBOL", value: "'hello'", parenthesesCode: "" },
    ]);
    expect(composerTokenize('"he\\"l\\"lo"', DEFAULT_LOCALE)).toEqual([
      {
        start: 0,
        end: 11,
        length: 11,
        type: "STRING",
        value: '"he\\"l\\"lo"',
        parenthesesCode: "",
      },
    ]);
    expect(composerTokenize("\"hel'l'o\"", DEFAULT_LOCALE)).toEqual([
      { start: 0, end: 9, length: 9, type: "STRING", value: "\"hel'l'o\"", parenthesesCode: "" },
    ]);
    expect(composerTokenize('"hello""test"', DEFAULT_LOCALE)).toEqual([
      { start: 0, end: 7, length: 7, type: "STRING", value: '"hello"', parenthesesCode: "" },
      { start: 7, end: 13, length: 6, type: "STRING", value: '"test"', parenthesesCode: "" },
    ]);
  });

  test("Function token", () => {
    expect(composerTokenize("SUM", DEFAULT_LOCALE)).toEqual([
      { start: 0, end: 3, length: 3, type: "SYMBOL", value: "SUM", parenthesesCode: "" },
    ]);
    expect(composerTokenize("RAND", DEFAULT_LOCALE)).toEqual([
      { start: 0, end: 4, length: 4, type: "SYMBOL", value: "RAND", parenthesesCode: "" },
    ]);
  });
  test("Boolean", () => {
    expect(composerTokenize("true", DEFAULT_LOCALE)).toEqual([
      { start: 0, end: 4, length: 4, type: "SYMBOL", value: "true", parenthesesCode: "" },
    ]);
    expect(composerTokenize("false", DEFAULT_LOCALE)).toEqual([
      { start: 0, end: 5, length: 5, type: "SYMBOL", value: "false", parenthesesCode: "" },
    ]);
    expect(composerTokenize("=AND(true,false)", DEFAULT_LOCALE)).toMatchSnapshot();
    expect(composerTokenize("=trueee", DEFAULT_LOCALE)).toEqual([
      { start: 0, end: 1, length: 1, type: "OPERATOR", value: "=", parenthesesCode: "" },
      { start: 1, end: 7, length: 6, type: "SYMBOL", value: "trueee", parenthesesCode: "" },
    ]);
  });
});

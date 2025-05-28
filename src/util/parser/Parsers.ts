import { Parser } from './Parser';
import { ParseState } from './ParseState';


const stringParser = (needle: string): Parser<string> => {
    const len = needle.length;

    return async state => {
        if (state.input.startsWith(needle)) {
            return [needle, ParseState.move(len, state)];
        }

        throw ParseState.error(`expected "${needle}"`, state);
    }
};

const regexParser = (needle: RegExp, description: string): Parser<string> => {
    const fixedNeedle = new RegExp(needle, needle.flags + 'y');

    return async state => {
        const currentNeedle = new RegExp(fixedNeedle);

        if (currentNeedle.test(state.input)) {
            return [
                state.input.substring(0, currentNeedle.lastIndex),
                ParseState.move(currentNeedle.lastIndex, state),
            ];
        }

        throw ParseState.error(`expected ${description}`, state);
    }
};

const spacesParser: Parser<string> = regexParser(/(?:\s*(?:%.*$)?)*/m, 'spaces');
const withSpacesParser = <T>(parser: Parser<T>): Parser<T> => Parser.andr(spacesParser, parser);

const leftParenParser = withSpacesParser(stringParser('('));
const rightParenParser = withSpacesParser(stringParser(')'));
const commaParser = withSpacesParser(stringParser(','));

const eofParser: Parser<void> = async state => {
    if (ParseState.isEOF(state)) {
        return [undefined, state];
    }

    throw ParseState.error('expected EOF', state);
};

const fullParser = <T>(parser: Parser<T>): Parser<T> => Parser.andl(parser, withSpacesParser(eofParser));

const bracedParser = <T>(
    parser: Parser<T>,
    l: Parser<unknown> = leftParenParser,
    r: Parser<unknown> = rightParenParser,
): Parser<T> => Parser.andr(l, Parser.andl(parser, r));

const listParser = <T>(
    parser: Parser<T>,
    sep: Parser<unknown> = commaParser,
): Parser<T[]> => Parser.alt(
    Parser.bind(parser, x => Parser.map(Parser.many(Parser.andr(sep, parser)), xs => [x, ...xs])),
    Parser.pure([]),
);

const bracedListParser = <T>(
    parser: Parser<T>,
    l: Parser<unknown> = leftParenParser,
    r: Parser<unknown> = rightParenParser,
    sep: Parser<unknown> = commaParser,
): Parser<T[]> => Parser.alt(
    bracedParser(Parser.bind(parser, x =>
        Parser.map(Parser.many(Parser.andr(sep, parser)), xs => [x, ...xs])), l, r),
    Parser.pure([]),
);

export const Parsers = {

    string: stringParser,
    regex: regexParser,

    spaces: spacesParser,
    withSpaces: withSpacesParser,

    leftParen: leftParenParser,
    rightParen: rightParenParser,
    comma: commaParser,

    eof: eofParser,
    full: fullParser,

    braced: bracedParser,
    list: listParser,
    bracedList: bracedListParser,
};

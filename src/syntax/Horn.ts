import { Literal } from './Literal';
import { Parser } from '../util/parser/Parser';
import { Parsers } from '../util/parser/Parsers';
import { HornTail } from './HornTail';


/**
 * `vn` is a number of free variables
 * `h` is a head
 * `t` is a tail
 */
export interface Horn {
    readonly vn: number,
    readonly h: Literal,
    readonly t: HornTail,
}

const parseHornArrow = Parsers.withSpaces(Parsers.string(':-'));
const parseHornEnd = Parsers.withSpaces(Parsers.string('.'));

const parseHornTailWithArrow: Parser<Literal[]> = Parser.alt(
    Parser.andr(parseHornArrow, Parser.bind(Literal.parse, l =>
        Parser.map(Parser.many(Parser.andr(Parsers.comma, Literal.parse)), ls => [l, ...ls]))),
    Parser.pure([]),
);

const parseHorn: Parser<Horn> = Parser.bind(Literal.parse, h =>
    Parser.map(Parser.andl(parseHornTailWithArrow, parseHornEnd), t => ({ vn: 0, h, t })));

export const Horn = {

    parseArrow: parseHornArrow,
    parseEnd: parseHornEnd,
    parse: parseHorn,

    show: ({ vn, h, t }: Horn): string => `∀ ${vn}. ${Literal.show(h)}`
        + (t.length == 0 ? '' : ` ← ${HornTail.show(t)}`),

    prepare: ({ h, t }: Horn): Horn => {
        const vars = new Map<string, number>();

        h = Literal.prepare(vars)(h);
        t = HornTail.prepare(vars, t);
        return { vn: vars.size, h, t };
    },

    refresh: (offset: number, { vn, h, t }: Horn): Horn =>
        ({ vn, h: Literal.refresh(offset)(h), t: HornTail.refresh(offset, t) }),
};

import { Term } from './Term';
import { Parser } from '../util/parser/Parser';
import { Parsers } from '../util/parser/Parsers';


/**
 * `p` is a predicate name
 * `a` are arguments of the predicate
 */
export interface Literal {
    readonly p: string,
    readonly a: ReadonlyArray<Term>,
}

const parseLiteral: Parser<Literal> = Parser.bind(Term.parseConsName, p =>
    Parser.map(Parsers.braced(Parsers.list(Term.parse)), a => ({ p, a })));

export const Literal = {

    parse: parseLiteral,

    show: ({ p, a }: Literal): string => `${p}(${a.map(Term.show).join(', ')})`,

    prepare: (vars: Map<string, number>) => ({ p, a }: Literal): Literal => ({ p, a: a.map(Term.prepare(vars)) }),

    refresh: (offset: number) => ({ p, a }: Literal): Literal => ({ p, a: a.map(Term.refresh(offset)) }),
};

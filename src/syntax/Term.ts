import { Parser } from '../util/parser/Parser';
import { Parsers } from '../util/parser/Parsers';


/**
 * `v` is a user-provided variable name
 * `n` is an internal number of variable
 */
export interface VarTerm {
    readonly v: string;
    readonly n: number;
}

/**
 * `c` is a constructor name
 * `a` are arguments of the constructor
 */
export interface ConsTerm {
    readonly c: string;
    readonly a: ReadonlyArray<Term>;
}

export type Term = VarTerm | ConsTerm;

const parseVarName: Parser<string> = Parsers.withSpaces(Parsers.regex(/\p{Upper}[\p{Alpha}\p{Nd}_']*/u, 'variable name'));
const parseConsName: Parser<string> = Parsers.withSpaces(Parsers.regex(/\p{Lower}[\p{Alpha}\p{Nd}_']*/u, 'constructor name'));

const parseTerm: Parser<Term> = Parser.alt<Term>(
    Parser.map(parseVarName, v => ({ v, n: 0 })),
    Parser.bind(parseConsName, c => Parser.map(Parsers.bracedList(parseTerm), a => ({ c, a }))),
);

export interface TermAlgebra<T> {
    varTerm: (v: string, n: number) => T,
    consTerm: (c: string, a: (() => T)[]) => T,
}

const isVarTerm = (t: Term): t is VarTerm => 'v' in t;

const termCata = <T>(alg: TermAlgebra<T>) => {
    const hlp = (t: Term): T => {
        if (isVarTerm(t)) {
            return alg.varTerm(t.v, t.n);
        } else {
            return alg.consTerm(t.c, t.a.map(t => () => hlp(t)));
        }
    };

    return hlp;
};

export const Term = {

    parseVarName,
    parseConsName,
    parse: parseTerm,

    isVar: isVarTerm,
    cata: termCata,

    show: termCata<string>({
        varTerm: (v, n) => `${v}_${n}`,
        consTerm: (c, a) => a.length == 0 ? c : `${c}(${a.map(f => f()).join(', ')})`,
    }),

    prepare: (vars: Map<string, number>) => termCata<Term>({
        varTerm: (v, _) => {
            let n = vars.get(v);

            if (n === undefined) {
                vars.set(v, n = vars.size);
            }

            return { v, n };
        },
        consTerm: (c, a) => ({ c, a: a.map(f => f()) }),
    }),

    refresh: (offset: number) => termCata<Term>({
        varTerm: (v, n) => ({ v, n: n + offset }),
        consTerm: (c, a) => ({ c, a: a.map(f => f()) }),
    }),
};


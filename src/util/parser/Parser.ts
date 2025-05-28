import { ParseState } from './ParseState';


export type Parser<T> = (input: ParseState) => Promise<[T, ParseState]>;

export const Parser = {

    eval: async <T>(state: ParseState, parser: Parser<T>): Promise<T> => {
         const [x, _] = await parser(state);
         return x;
    },

    eval0: <T>(input: string, parser: Parser<T>): Promise<T> => Parser.eval(ParseState.initial(input), parser),

    map: <T, R>(parser: Parser<T>, f: (v: T) => R): Parser<R> => async state => {
        const [x, newState] = await parser(state);
        return [f(x), newState];
    },

    ignore: <T>(parser: Parser<unknown>, x: T): Parser<T> => async state => {
        const [_, newState] = await parser(state);
        return [x, newState];
    },

    pure: <T>(v: T): Parser<T> => async state => [v, state],

    empty: <T>(): Parser<T> => async state => {
        throw ParseState.error('empty parser', state);
    },

    alt: <T>(...ps: Parser<T>[]): Parser<T> => {
        const empty = Parser.empty<T>();

        return async state => {
            let err: unknown = undefined;

            for (const p of ps) {
                try {
                    return await p(state);
                } catch (e) {
                    err = e;
                }
            }

            if (err !== undefined) {
                throw err;
            }

            return empty(state);
        };
    },

    bind: <T, R>(parser: Parser<T>, k: (v: T) => Parser<R>): Parser<R> => async state => {
        const [x, newState] = await parser(state);
        return k(x)(newState);
    },

    andl: <T>(p1: Parser<T>, p2: Parser<unknown>): Parser<T> => Parser.bind(p1, x => Parser.ignore(p2, x)),

    andr: <T>(p1: Parser<unknown>, p2: Parser<T>): Parser<T> => async state => {
        const [_, newState] = await p1(state);
        return p2(newState);
    },

    some: <T>(parser: Parser<T>): Parser<T[]> =>
        Parser.bind(parser, x => Parser.map(Parser.many(parser), xs => [x, ...xs])),

    many: <T>(parser: Parser<T>): Parser<T[]> => Parser.alt(Parser.some(parser), Parser.pure([])),
};

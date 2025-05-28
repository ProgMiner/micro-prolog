import { Horn } from './Horn';
import { Parser } from '../util/parser/Parser';
import { HornTail } from './HornTail';


export interface Program {
    readonly queryVars: ReadonlyArray<string>;
    readonly context: ReadonlyArray<Horn>;
    readonly query: HornTail;
}

const parseProgram: Parser<Program> = Parser.bind(Parser.many(Horn.parse), context =>
    Parser.map(HornTail.parse, query => ({ queryVars: [], context, query })));

export const Program = {

    parse: parseProgram,

    show: ({ queryVars, context, query }: Program): string => {
        const lines = context.map((h, i) => `${i + 1}. ${Horn.show(h)}`);

        if (query.length > 0) {
            lines.push('=====');
            lines.push(`Query: ∀ ${queryVars.join(', ')}. _ ← ${HornTail.show(query)}`);
        }

        return lines.join('\n');
    },

    prepare: ({ context, query }: Program): Program => {
        context = context.map(Horn.prepare);

        const vars = new Map<string, number>();
        query = HornTail.prepare(vars, query);

        const queryVars = new Array(vars.size);
        vars.forEach((n, v) => queryVars[n] = v);

        return { queryVars, context, query };
    },
};

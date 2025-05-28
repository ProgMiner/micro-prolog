import { Literal } from './Literal';
import { Parser } from '../util/parser/Parser';
import { Parsers } from '../util/parser/Parsers';


export type HornTail = ReadonlyArray<Literal>;

const parseHornTail: Parser<Literal[]> = Parsers.list(Literal.parse);

export const HornTail = {

    parse: parseHornTail,

    show: (t: ReadonlyArray<Literal>): string => t.map(Literal.show).join(' ∧ '),

    prepare: (vars: Map<string, number>, t: HornTail): HornTail => t.map(Literal.prepare(vars)),

    refresh: (offset: number, t: HornTail): HornTail => t.map(Literal.refresh(offset)),
};

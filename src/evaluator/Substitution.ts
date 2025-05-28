import Immutable, { Map } from 'immutable';

import { Term } from '../syntax/Term';


export type Substitution = Immutable.Map<number, Term>;

const emptySubst: Substitution = Map();

const walkSubst = (s: Substitution, t: Term): Term => {
    if (!Term.isVar(t)) {
        return t;
    }

    const t1 = s.get(t.n);
    return t1 ? walkSubst(s, t1) : t;
};

const applySubst = (s: Substitution) => {
    const hlp: (t: Term) => Term = Term.cata({
        varTerm: (v, n) => {
            const t = s.get(n);
            return t ? hlp(t) : { v, n };
        },
        consTerm: (c, a) => ({ c, a: a.map(f => f()) }),
    });

    return hlp;
};

export const Substitution = {

    empty: emptySubst,

    walk: walkSubst,
    apply: applySubst,
}

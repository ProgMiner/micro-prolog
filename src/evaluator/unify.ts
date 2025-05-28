import { Substitution } from './Substitution';
import { ConsTerm, Term } from '../syntax/Term';
import { Literal } from '../syntax/Literal';


const occursCheck = (s: Substitution, x: number) => {
    const hlp: (t: Term) => boolean = Term.cata({
        varTerm: (v, n) => {
            const t = Substitution.walk(s, { v, n });
            return Term.isVar(t) ? t.n === x : hlp(t);

        },
        consTerm: (_, a) => a.some(t => t()),
    });

    return hlp;
}

export const unify = async (s: Substitution, t1: Term, t2: Term): Promise<Substitution> => {
    t1 = Substitution.walk(s, t1);
    t2 = Substitution.walk(s, t2);

    if (Term.isVar(t1) && Term.isVar(t2)) {
        if (t1.n === t2.n) {
            return s;
        }

        return t1.n > t2.n ? s.set(t1.n, t2) : s.set(t2.n, t1);
    }

    if (Term.isVar(t2)) {
        [t1, t2] = [t2, t1];
    }

    if (Term.isVar(t1)) {
        if (occursCheck(s, t1.n)(t2)) {
            throw new Error(`unable to unify "${Term.show(t1)}" with "${Term.show(Substitution.apply(s)(t2))}"`);
        }

        return s.set(t1.n, t2);
    }

    t2 = t2 as ConsTerm;
    if (t1.c !== t2.c || t1.a.length !== t2.a.length) {
        throw new Error(`unable to unify "${Term.show(t1)}" with "${Term.show(t2)}"`);
    }

    for (let i = 0; i < t1.a.length; ++i) {
        s = await unify(s, t1.a[i]!, t2.a[i]!);
    }

    return s;
};

export const unifyLiterals = async (s: Substitution, l1: Literal, l2: Literal): Promise<Substitution> => {
    if (l1.p !== l2.p || l1.a.length !== l2.a.length) {
        throw new Error(`unable to unify "${Literal.show(l1)}" with "${Literal.show(l2)}"`);
    }

    for (let i = 0; i < l1.a.length; ++i) {
        s = await unify(s, l1.a[i]!, l2.a[i]!);
    }

    return s;
};

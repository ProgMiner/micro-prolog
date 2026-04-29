import { Program } from '../syntax/Program';
import { HornTail } from '../syntax/HornTail';
import { Substitution } from './Substitution';
import { Horn } from '../syntax/Horn';
import { unifyLiterals } from './unify';
import { Term, VarTerm } from '../syntax/Term';
import { Literal } from '../syntax/Literal';


export const FalseEvaluation = Symbol('FalseEvaluation');
export const StepEvaluation = Symbol('StepEvaluation');
export type StepEvaluation = typeof StepEvaluation;

export interface ResultEvaluation {
    readonly path: ReadonlyArray<number>;
    readonly answer: [VarTerm, Term][];
}

export type Evaluation = ResultEvaluation | StepEvaluation;

export interface Evaluator {
    next: () => Promise<[Evaluation, Evaluator]>;
}

export const falseEvaluator: Evaluator = {
    next: async () => {
        throw FalseEvaluation;
    },
};

export interface CurrentQuery {
    readonly parent?: CurrentQuery;
    readonly head: Literal;
}

export const hornTailToCurrentQuery = (t: HornTail, parent?: CurrentQuery): CurrentQuery | undefined => {
    for (let i = t.length - 1; i >= 0; --i) {
        parent = { parent, head: t[i]! };
    }
    return parent;
}

export const buildAnswer = (frame: EvaluatorFrame, program: Program): ResultEvaluation => {
    const path = [];
    for (let fr: EvaluatorFrame | undefined = frame; fr; fr = fr.parent) {
        path.push(fr.position);
    }

    path.reverse().pop();

    const answer: [VarTerm, Term][] = [];
    for (let i = 0; i < program.queryVars.length; ++i) {
        const v: VarTerm = { v: program.queryVars[i]!, n: i };
        const t = Substitution.apply(frame.subst)(v);

        if (Term.isVar(t) && t.n === v.n) {
            continue;
        }

        answer.push([v, t]);
    }

    return { path, answer };
}

export interface EvaluatorFrame {
    readonly parent?: EvaluatorFrame;
    readonly subst: Substitution;
    readonly query?: CurrentQuery;
    readonly vars: number;
    position: number;
}

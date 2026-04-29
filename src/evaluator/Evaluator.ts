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

export interface EvaluatorFrame {
    readonly parent?: EvaluatorFrame;
    readonly subst: Substitution;
    readonly query?: CurrentQuery;
    readonly vars: number;
    position: number;
}

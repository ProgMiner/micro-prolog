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

const falseEvaluator: Evaluator = {
    next: async () => {
        throw FalseEvaluation;
    },
};

interface CurrentQuery {
    readonly parent?: CurrentQuery;
    readonly head: Literal;
}

const hornTailToCurrentQuery = (t: HornTail, parent?: CurrentQuery): CurrentQuery | undefined => {
    for (let i = t.length - 1; i >= 0; --i) {
        parent = { parent, head: t[i]! };
    }

    return parent;
}

interface EvaluatorFrame {
    readonly parent?: EvaluatorFrame;
    readonly subst: Substitution;
    readonly query?: CurrentQuery;
    readonly vars: number;
    position: number;
}

export const evaluate = (program: Program): Evaluator => {
    const step = async (frame: EvaluatorFrame): Promise<[Evaluation, EvaluatorFrame | undefined]> => {
        if (!frame.query) {
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

            return [{ path, answer }, frame.parent];
        }

        const origHorn = program.context[frame.position];
        if (!origHorn) {
            return [StepEvaluation, frame.parent];
        }

        ++frame.position;

        const horn = Horn.refresh(frame.vars, origHorn);
        try {
            const subst = await unifyLiterals(frame.subst, frame.query.head, horn.h);
            const query = hornTailToCurrentQuery(horn.t, frame.query.parent);
            const vars = frame.vars + horn.vn;

            return [StepEvaluation, { parent: frame, subst, query, vars, position: 0 }];
        } catch (e) {
            return [StepEvaluation, frame];
        }
    };

    const makeEvaluator = (frame: EvaluatorFrame): Evaluator => ({
        next: async () => {
            const [res, fr] = await step(frame);
            return [res, fr ? makeEvaluator(fr) : falseEvaluator];
        },
    });

    return makeEvaluator({
        subst: Substitution.empty,
        query: hornTailToCurrentQuery(program.query),
        vars: program.queryVars.length,
        position: 0,
    });
};

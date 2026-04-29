import { Program } from '../syntax/Program';
import { HornTail } from '../syntax/HornTail';
import { Substitution } from './Substitution';
import { Horn } from '../syntax/Horn';
import { unifyLiterals } from './unify';
import { Term, VarTerm } from '../syntax/Term';
import { Literal } from '../syntax/Literal';
import {
    ResultEvaluation, StepEvaluation, Evaluation, Evaluator, FalseEvaluation, CurrentQuery,
    hornTailToCurrentQuery, EvaluatorFrame, falseEvaluator,
} from './Evaluator';


export const evaluate = (program: Program): Evaluator => {
    const step = async (frame: EvaluatorFrame): Promise<[Evaluation, EvaluatorFrame[]]> => {
        if (!frame.query) {
            const answer: [VarTerm, Term][] = [];
            for (let i = 0; i < program.queryVars.length; ++i) {
                const v: VarTerm = { v: program.queryVars[i]!, n: i };
                const t = Substitution.apply(frame.subst)(v);

                if (Term.isVar(t) && t.n === v.n) {
                    continue;
                }

                answer.push([v, t]);
            }

            return [{ path: [0], answer }, []];
        }

        const results: EvaluatorFrame[] = [];
        while (frame.position < program.context.length) {
            const origHorn = program.context[frame.position]!;
            ++frame.position;

            const horn = Horn.refresh(frame.vars, origHorn);
            try {
                const subst = await unifyLiterals(frame.subst, frame.query.head, horn.h);
                const query = hornTailToCurrentQuery(horn.t, frame.query.parent);
                const vars = frame.vars + horn.vn;

                results.push({ subst, query, vars, position: 0 });
            } catch (e) {
                // Unification failed, continue to next clause
            }
        }

        return [StepEvaluation, results];
    };

    const makeEvaluator = (frames: EvaluatorFrame[]): Evaluator => ({
        next: async () => {
            if (frames.length === 0) {
                throw FalseEvaluation;
            }

            const currentFrame = frames[0]!;
            const remainingFrames = frames.slice(1);

            const [res, newFrames] = await step(currentFrame);

            if (res === StepEvaluation) {
                return [res, makeEvaluator([...remainingFrames, ...newFrames])];
            } else {
                return [res, makeEvaluator(remainingFrames)];
            }
        },
    });

    const initialFrame: EvaluatorFrame = {
        subst: Substitution.empty,
        query: hornTailToCurrentQuery(program.query),
        vars: program.queryVars.length,
        position: 0,
    };

    return makeEvaluator([initialFrame]);
};

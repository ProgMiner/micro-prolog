import { Program } from '../syntax/Program';
import { HornTail } from '../syntax/HornTail';
import { Substitution } from './Substitution';
import { Horn } from '../syntax/Horn';
import { unifyLiterals } from './unify';
import { Term, VarTerm } from '../syntax/Term';
import { Literal } from '../syntax/Literal';
import {
    ResultEvaluation, StepEvaluation, Evaluation, Evaluator, FalseEvaluation, CurrentQuery,
    hornTailToCurrentQuery, EvaluatorFrame, falseEvaluator, buildAnswer,
} from './Evaluator';


export const evaluate = (program: Program): Evaluator => {
    const step = async (frame: EvaluatorFrame): Promise<[Evaluation, EvaluatorFrame | undefined]> => {
        if (!frame.query) {
            return [buildAnswer(frame, program), frame.parent];
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

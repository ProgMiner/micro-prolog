import { Parser } from './util/parser/Parser';
import { Parsers } from './util/parser/Parsers';
import { Program } from './syntax/Program';
import { ParseState } from './util/parser/ParseState';
import { evaluate, Evaluator, FalseEvaluation, StepEvaluation } from './evaluator/Evaluator';
import { Term } from './syntax/Term';


const codeElement = document.getElementById('code') as HTMLTextAreaElement;
const printElement = document.getElementById('print') as HTMLTextAreaElement;
const answersElement = document.getElementById('answers') as HTMLUListElement;
const runButton = document.getElementById('run')! as HTMLButtonElement;

{
    const buffer = localStorage.getItem('buffer');
    if (buffer) {
        codeElement.value = buffer;
    }
}

let currentEvaluator: Evaluator | undefined = undefined;

const setCurrentEvaluator = (evaluator?: Evaluator) => {
    if (!currentEvaluator && evaluator) {
        answersElement.replaceChildren();
    }

    currentEvaluator = evaluator;
    runButton.innerText = evaluator ? 'Next answer' : 'Run';
}

const onCodeChange = () => {
    setTimeout(async () => {
        localStorage.setItem('buffer', codeElement.value);

        try {
            const [prg, rest] = await Program.parse(ParseState.initial(codeElement.value));

            let res = Program.show(Program.prepare(prg));
            if (rest.input.trim().length > 0) {
                res += '\n\n% ... ' + rest.input;
            }

            printElement.value = res;
        } catch (err) {
            printElement.value = `${err}`;
        }
    }, 1);

    setCurrentEvaluator(undefined);
};

codeElement.addEventListener('keyup', onCodeChange);
onCodeChange();

let running = false;

const continueProgram = async (evaluator: Evaluator): Promise<Evaluator | undefined> => {
    const elem = document.createElement('li');
    answersElement.appendChild(elem);
    elem.innerText = '...';

    let steps = 0;
    const startTime = performance.now();
    const elapsedTime = () => Math.round(performance.now() - startTime) / 1000;
    const nextStep = async (evaluator: Evaluator): Promise<Evaluator | undefined> => {
        try {
            const [res, newEvaluator] = await evaluator.next();

            if (res === StepEvaluation) {
                ++steps;

                if (!running) {
                    elem.innerText = `INTERRUPTED after ${steps} steps (${elapsedTime()} sec)`;
                    elem.classList.add('false');
                    return newEvaluator;
                }

                elem.innerText = `${steps} steps elapsed (${elapsedTime()} sec)...`;

                await new Promise(resolve => setTimeout(resolve, 1));
                return nextStep(newEvaluator);
            } else {
                const elapsedElem = document.createElement('li');
                elapsedElem.innerText = `elapsed: ${steps} steps (${elapsedTime()} sec)`;

                const pathElem = document.createElement('li');
                pathElem.innerText = 'path: ' + res.path.join(' → ');

                const sublistElem = document.createElement('ul');
                sublistElem.appendChild(elapsedElem);
                sublistElem.appendChild(pathElem);

                elem.innerText = res.answer.map(([v, t]) => `${Term.show(v)} = ${Term.show(t)}`).join(', ');
                elem.appendChild(sublistElem);
                return newEvaluator;
            }
        } catch (e) {
            if (e === FalseEvaluation) {
                elem.innerText = `FALSE after ${steps} steps (${elapsedTime()} sec)`;
                elem.classList.add('false');
                return;
            }

            console.error(e);
        }
    };

    return nextStep(evaluator);
};

runButton.addEventListener('click', async () => {
    if (running) {
        running = false;
        runButton.disabled = true;
        return;
    }

    if (currentEvaluator) {
        running = true;
        runButton.innerText = 'Interrupt';
        setCurrentEvaluator(await continueProgram(currentEvaluator));
        runButton.disabled = false;
        running = false;
        return;
    }

    try {
        const program = Program.prepare(await Parser.eval0(codeElement.value, Parsers.full(Program.parse)));
        setCurrentEvaluator(evaluate(program));
    } catch (e) {
        console.error(e);
        alert(e);
    }
});

import { basicSetup, EditorView } from 'codemirror';
import { indentWithTab } from '@codemirror/commands';
import { keymap } from '@codemirror/view';

import { Parser } from './util/parser/Parser';
import { Parsers } from './util/parser/Parsers';
import { ParseState } from './util/parser/ParseState';
import { evaluate as dfsEvaluate } from './evaluator/DFSEvaluator';
import { evaluate as interleavingEvaluate } from './evaluator/InterleavingEvaluator';
import { FalseEvaluation, StepEvaluation, Evaluator, CurrentQuery, hornTailToCurrentQuery, EvaluatorFrame, falseEvaluator, buildAnswer } from './evaluator/Evaluator';
import { microProlog } from './editor/language';
import { Program } from './syntax/Program';
import { Term } from './syntax/Term';


const answersDfsElement = document.getElementById('answers-dfs') as HTMLUListElement;
const answersInterleavingElement = document.getElementById('answers-interleaving') as HTMLUListElement;
const printElement = document.getElementById('print') as HTMLTextAreaElement;
const runButton = document.getElementById('run')! as HTMLButtonElement;
const strategySelect = document.getElementById('strategy') as HTMLSelectElement;

const getCurrentStrategy = () => strategySelect.value as 'dfs' | 'interleaving';

interface EvaluatorTab {
    evaluator?: Evaluator;
    running: boolean;
    answersList: HTMLUListElement;
}

const evaluatorTabs: { readonly [K in 'dfs' | 'interleaving']: EvaluatorTab } = {
    dfs: { evaluator: undefined, running: false, answersList: answersDfsElement },
    interleaving: { evaluator: undefined, running: false, answersList: answersInterleavingElement },
};

const switchStrategy = () => {
    const strategy = getCurrentStrategy();
    localStorage.setItem('strategy', strategy);

    answersDfsElement.classList.toggle('hidden', strategy !== 'dfs');
    answersInterleavingElement.classList.toggle('hidden', strategy !== 'interleaving');

    const tab = evaluatorTabs[strategy];
    runButton.innerText = tab.evaluator
        ? (tab.running ? 'Interrupt' : 'Next answer')
        : 'Run';

    tab.answersList.parentElement?.scrollTo(0, tab.answersList.parentElement.scrollHeight);
};

const savedStrategy = localStorage.getItem('strategy');
if (savedStrategy === 'dom' || savedStrategy === 'interleaving') {
    strategySelect.value = savedStrategy;
}

switchStrategy();

strategySelect.addEventListener('change', switchStrategy);

const onCodeChange = (code: string) => {
    setTimeout(async () => {
        localStorage.setItem('buffer', code);

        try {
            const [prg, rest] = await Program.parse(ParseState.initial(code));

            let res = Program.show(Program.prepare(prg));
            if (rest.input.trim().length > 0) {
                res += '\n\n% ... ' + rest.input;
            }

            printElement.value = res;
        } catch (err) {
            printElement.value = `${err}`;
        }
    }, 1);

    for (const strategy of ['dfs', 'interleaving'] as const) {
        const tab = evaluatorTabs[strategy];
        tab.answersList.replaceChildren();
        tab.evaluator = undefined;
        tab.running = false;
    }

    runButton.innerText = 'Run';
};

const editorView = new EditorView({
    doc: localStorage.getItem('buffer') || undefined,
    extensions: [
        keymap.of([indentWithTab]),
        EditorView.updateListener.of(update => {
            if (!update.docChanged) {
                return;
            }

            onCodeChange(update.state.doc.toString());
        }),
        basicSetup,
        microProlog,
        EditorView.theme({
            '&.cm-focused': {
                outline: 'none',
            },
        }),
    ],
});

document.getElementById('code')!.replaceWith(editorView.dom)
editorView.dom.id = 'code';

onCodeChange(editorView.state.doc.toString());

const continueProgram = async (evaluator: Evaluator, tab: EvaluatorTab): Promise<Evaluator | undefined> => {
    const elem = document.createElement('li');
    tab.answersList.appendChild(elem);
    elem.innerText = '...';

    let steps = 0;
    const startTime = performance.now();
    const elapsedTime = () => Math.round(performance.now() - startTime) / 1000;
    const nextStep = async (evaluator: Evaluator): Promise<Evaluator | undefined> => {
        try {
            const [res, newEvaluator] = await evaluator.next();

            if (res === StepEvaluation) {
                ++steps;

                if (!tab.running) {
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
    const currentStrategy = getCurrentStrategy();
    const tab = evaluatorTabs[currentStrategy];

    if (tab.running) {
        tab.running = false;
        return;
    }

    if (tab.evaluator) {
        tab.running = true;
        runButton.innerText = 'Interrupt';
        const evaluator = await continueProgram(tab.evaluator, tab);
        tab.running = false;

        if (!tab.evaluator) {
            return;
        }

        tab.evaluator = evaluator;
        if (currentStrategy === getCurrentStrategy()) {
            runButton.innerText = 'Next answer';
        }

        return;
    }

    try {
        const program = Program.prepare(await Parser.eval0(editorView.state.doc.toString(), Parsers.full(Program.parse)));

        const evaluator = currentStrategy === 'dfs' ? dfsEvaluate(program) : interleavingEvaluate(program);
        tab.evaluator = evaluator;
        tab.running = false;
        runButton.innerText = 'Next answer';
    } catch (e) {
        console.error(e);
        alert(e);
    }
});

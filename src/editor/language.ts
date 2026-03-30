import { LanguageSupport, LRLanguage } from '@codemirror/language';

import { parser } from './parser';


export const microPrologLanguage = LRLanguage.define({
    parser,
    languageData: {
        commentTokens: { line: '%' },
        closeBrackets: {
            brackets: ['('],
            before: ')',
            stringPrefixes: [],
        },
    }
});

export const microProlog = new LanguageSupport(microPrologLanguage);

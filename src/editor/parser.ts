import { styleTags, tags } from '@lezer/highlight';

import { genParser } from '../__generated__/editor/parser';


export const parser = genParser.configure({
    props: [
        styleTags({
            'ConsName': tags.typeName,
            'VarName': tags.variableName,
            'Comment': tags.lineComment,
            ':-': tags.definitionOperator,
            '( )': tags.brace,
        }),
    ]
});

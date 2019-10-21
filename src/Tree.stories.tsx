import { storiesOf } from '@storybook/react';
import React from 'react';

import { TestSource } from 'test/testsource';

const stories = storiesOf('Tree', module);

stories.add('Test', () => {
    const src = new TestSource();
    (async () => {
        console.log('root', await src.children());
        console.log('children abc', await src.children('abc'));
        console.log('trail abc', await src.trail('abc'));
        console.log('trail a', await src.trail('a'));
        console.log('trail empty', await src.trail(''));
    })();

    return (
        <>
            test
        </>
    );
 });
